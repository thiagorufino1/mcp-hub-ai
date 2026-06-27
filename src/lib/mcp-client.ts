import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { isToolExecutionAllowed } from "@/lib/mcp-authorization";
import { isOAuthTokenExpired, refreshMcpOAuthToken } from "@/lib/mcp-oauth";
import type {
  McpDiscoveredTool,
  McpInspectResponse,
  McpServerConfig,
} from "@/types/mcp";

type MutableMcpServer = Omit<McpServerConfig, "tools" | "connectionStatus"> & {
  tools?: McpDiscoveredTool[];
  connectionStatus?: McpServerConfig["connectionStatus"];
};

function parseCommand(command: string, args: string[]) {
  const trimmed = command.trim();
  if (!trimmed) {
    return { args, command: "" };
  }

  if (args.length > 0 || !trimmed.includes(" ")) {
    return { args, command: trimmed };
  }

  const [parsedCommand, ...parsedArgs] = trimmed.split(/\s+/);
  return { args: parsedArgs, command: parsedCommand };
}

function buildHeaders(server: McpServerConfig) {
  const headers = { ...(server.headers ?? {}) };
  const accessToken = server.oauth?.accessToken?.trim();

  if (server.authMode === "oauth" && accessToken) {
    headers.Authorization = `${server.oauth?.tokenType?.trim() || "Bearer"} ${accessToken}`;
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}

function isAuthFailure(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("invalid_token") ||
    message.includes("token expired") ||
    message.includes("expired token")
  );
}

async function resolveOAuthConfig(server: McpServerConfig) {
  if (server.authMode !== "oauth" || !server.oauth) {
    return server.oauth;
  }

  if (!isOAuthTokenExpired(server.oauth)) {
    return server.oauth;
  }

  return (await refreshMcpOAuthToken(server.oauth)) ?? server.oauth;
}

async function maybeRefreshOAuth(server: McpServerConfig, force = false) {
  if (server.authMode !== "oauth" || !server.oauth) {
    return server;
  }

  const refreshed = force
    ? await refreshMcpOAuthToken(server.oauth)
    : await resolveOAuthConfig(server);
  if (!refreshed) {
    return server;
  }

  return {
    ...server,
    oauth: refreshed,
  };
}

async function buildTransport(server: McpServerConfig) {
  const oauth = await resolveOAuthConfig(server);
  const resolvedServer = oauth ? { ...server, oauth } : server;

  switch (server.transport) {
    case "stdio": {
      const parsed = parseCommand(server.command ?? "", server.args);
      return {
        server: resolvedServer,
        transport: new StdioClientTransport({
        args: parsed.args,
        command: parsed.command,
        env: {
          ...getDefaultEnvironment(),
          ...server.env,
        },
        stderr: "pipe",
        }),
      };
    }
    case "sse":
      return {
        server: resolvedServer,
        transport: new SSEClientTransport(new URL(server.url ?? ""), {
        requestInit: {
          headers: buildHeaders(resolvedServer),
        },
        }),
      };
    default:
      return {
        server: resolvedServer,
        transport: new StreamableHTTPClientTransport(new URL(server.url ?? ""), {
        requestInit: {
          headers: buildHeaders(resolvedServer),
        },
        }),
      };
  }
}

async function createConnectedClient(server: McpServerConfig) {
  const client = new Client(
    {
      name: "mcp-hub-ui",
      version: process.env["npm_package_version"] ?? "1.0.0",
    },
    {
      capabilities: {},
    },
  );
  const connection = await buildTransport(server);
  let transport = connection.transport;
  const resolvedServer = connection.server;
  try {
    await client.connect(transport);
  } catch (error) {
    await transport.close().catch(() => undefined);
    if (server.transport !== "streamable-http" || !supportsLegacySseFallback(error)) {
      throw error;
    }
    transport = new SSEClientTransport(new URL(server.url ?? ""), {
      requestInit: {
        headers: buildHeaders(resolvedServer),
      },
    });
    await client.connect(transport);
  }

  return {
    client,
    server: resolvedServer,
    async close() {
      await transport.close().catch(() => undefined);
    },
  };
}

function supportsLegacySseFallback(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /\b(400|404|405)\b/.test(message);
}

async function withOAuthRetry<T>(
  server: McpServerConfig,
  action: (resolvedServer: McpServerConfig) => Promise<T>,
): Promise<{ result: T; server: McpServerConfig }> {
  const resolvedServer = await maybeRefreshOAuth(server);

  try {
    return {
      result: await action(resolvedServer),
      server: resolvedServer,
    };
  } catch (error) {
    if (!isAuthFailure(error) || resolvedServer.authMode !== "oauth" || !resolvedServer.oauth) {
      throw error;
    }

    const refreshedServer = await maybeRefreshOAuth({
      ...resolvedServer,
      oauth: {
        ...resolvedServer.oauth,
        expiresAt: undefined,
      },
    }, true);

    if (
      refreshedServer.oauth?.accessToken === resolvedServer.oauth.accessToken &&
      refreshedServer.oauth?.refreshToken === resolvedServer.oauth.refreshToken
    ) {
      throw error;
    }

    return {
      result: await action(refreshedServer),
      server: refreshedServer,
    };
  }
}

export function createInspectableServerConfig(server: MutableMcpServer): McpServerConfig {
  return {
    approvalMode: server.approvalMode ?? "never",
    args: server.args,
    command: server.command,
    connectionStatus: server.connectionStatus ?? "pending",
    enabled: server.enabled ?? true,
    description: server.description,
    env: server.env,
    errorMessage: server.errorMessage,
    headers: server.headers,
    authMode: server.authMode,
    oauth: server.oauth,
    id: server.id,
    lastCheckedAt: server.lastCheckedAt,
    name: server.name,
    tools: server.tools ?? [],
    transport: server.transport,
    url: server.url,
  };
}

export async function inspectMcpServer(server: McpServerConfig): Promise<McpInspectResponse> {
  try {
    const { result, server: resolvedServer } = await withOAuthRetry(server, async (resolved) => {
      const connection = await createConnectedClient(resolved);
      try {
        const toolsResult = await connection.client.listTools();

        return toolsResult.tools.map((tool) => ({
          description: tool.description,
          inputSchema:
            tool.inputSchema && typeof tool.inputSchema === "object"
              ? {
                  type: "object" as const,
                  properties: tool.inputSchema.properties,
                  required: tool.inputSchema.required,
                }
              : undefined,
          name: tool.name,
          readOnly: tool.annotations?.readOnlyHint ?? false,
          isDestructive: tool.annotations?.destructiveHint === true,
        }));
      } finally {
        await connection.close();
      }
    });
    const tools: McpDiscoveredTool[] = result;

    return {
      server: {
        ...resolvedServer,
        connectionStatus: "connected",
        errorMessage: undefined,
        lastCheckedAt: String(Date.now()),
        tools,
      },
    };
  } catch (error) {
    return {
      server: {
        ...server,
        connectionStatus: "error",
        errorMessage:
          error instanceof Error ? error.message : "Could not connect to MCP server.",
        lastCheckedAt: String(Date.now()),
        tools: [],
      },
    };
  }
}

export async function executeMcpTool(
  server: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ result: unknown; resolvedServer: McpServerConfig }> {
  if (!isToolExecutionAllowed(server, toolName)) {
    throw new Error(`Tool "${toolName}" is not approved for execution on server "${server.name}".`);
  }

  const { result, server: resolvedServer } = await withOAuthRetry(server, async (resolved) => {
    const { client, close } = await createConnectedClient(resolved);

    try {
      return await client.callTool({
        name: toolName,
        arguments: args,
      });
    } finally {
      await close();
    }
  });

  return { result, resolvedServer };
}
