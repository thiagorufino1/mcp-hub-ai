import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { logAudit } from "@/lib/audit";
import { executeGovernedMcpTool } from "@/lib/mcp-governance";
import { isRegisteredToolEnabled, resolveMcpServerTools } from "@/lib/mcp-tool-registry";
import { getUserContext } from "@/lib/user-context";
import { resolveTokenUser } from "@/lib/token-auth";
import type { McpServerConfig } from "@/types/mcp";

function extractBearer(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
}

function resourceMetadataUrl(request: Request) {
  return `${new URL(request.url).origin}/.well-known/oauth-protected-resource/api/mcp/proxy`;
}

async function handleProxyRequest(request: Request): Promise<Response> {
  const bearer = extractBearer(request);
  if (!bearer) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid Authorization header." }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer realm="mcp-hub", resource_metadata="${resourceMetadataUrl(request)}"`,
        },
      },
    );
  }

  const tokenUser = await resolveTokenUser(bearer);
  if (!tokenUser) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired token." }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer realm="mcp-hub", error="invalid_token", resource_metadata="${resourceMetadataUrl(request)}"`,
        },
      },
    );
  }

  if (tokenUser.scope !== undefined && !tokenUser.scope.split(" ").includes("mcp:proxy")) {
    return new Response(
      JSON.stringify({ error: "Insufficient scope. mcp:proxy required." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const context = await getUserContext(tokenUser.entraGroups, undefined, tokenUser.userId);
  const proxyServers = context.mcpServers.filter((server) => server.enabled);
  const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const serverMap = new Map<string, McpServerConfig>(proxyServers.map((server) => [server.id, server]));

  const server = new Server(
    { name: "mcp-hub-proxy", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logAudit({
      userId: tokenUser.userId,
      userEmail: tokenUser.userEmail ?? undefined,
      action: "mcp.proxy",
      resource: "McpProxy",
      metadata: {
        traceId,
        method: request.method,
        proxyServerCount: proxyServers.length,
        event: "discovery_tools",
      },
    });

    const allTools: {
      name: string;
      title?: string;
      description?: string;
      inputSchema: object;
      annotations?: {
        destructiveHint?: boolean;
        readOnlyHint?: boolean;
      };
    }[] = [];

    for (const mcpServer of proxyServers) {
      try {
        const resolvedServer = await resolveMcpServerTools(mcpServer);
        for (const tool of resolvedServer.tools) {
          allTools.push({
            name: tool.name,
            title: tool.displayName ?? tool.name,
            description: `[${mcpServer.name}] ${tool.description ?? ""}`.trim(),
            inputSchema: tool.inputSchema ?? { type: "object", properties: {} },
            annotations: {
              destructiveHint: tool.isDestructive ?? false,
              readOnlyHint: tool.readOnly ?? false,
            },
          });
        }
      } catch {
        // Skip unresponsive servers.
      }
    }

    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (toolRequest) => {
    const { name, arguments: args } = toolRequest.params;

    const toolIndex = new Map<string, { server: McpServerConfig; toolName: string }>();
    for (const serverCandidate of proxyServers) {
      try {
        const resolvedServer = await resolveMcpServerTools(serverCandidate);
        for (const tool of resolvedServer.tools) {
          if (!toolIndex.has(tool.name)) {
            toolIndex.set(tool.name, { server: serverCandidate, toolName: tool.name });
          }
        }
      } catch {
        // Skip unresponsive servers.
      }
    }

    const toolEntry = toolIndex.get(name);
    const mcpServer = toolEntry?.server;
    const resolvedToolName = toolEntry?.toolName;

    if (!mcpServer || !resolvedToolName) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    logAudit({
      userId: tokenUser.userId,
      userEmail: tokenUser.userEmail ?? undefined,
      action: "mcp.proxy",
      resource: "McpProxy",
      metadata: {
        traceId,
        method: toolRequest.method,
        serverId: mcpServer.id,
        toolName: resolvedToolName,
        event: "tool_used",
      },
    });

    if (!(await isRegisteredToolEnabled(mcpServer.id, resolvedToolName))) {
      return {
        content: [{ type: "text", text: `Tool is disabled or unknown: ${name}` }],
        isError: true,
      };
    }

    const execServer: McpServerConfig = {
      ...mcpServer,
      approvalMode: "always",
      approvedToolNames: [],
    };

    try {
      const result = await executeGovernedMcpTool(
        execServer,
        resolvedToolName,
        (args as Record<string, unknown>) ?? {},
        {
          personalTokenId: tokenUser.tokenId,
          source: "proxy",
          traceId,
          userId: tokenUser.userId,
        },
      );
      const content =
        result &&
        typeof result === "object" &&
        "content" in result &&
        Array.isArray((result as { content: unknown }).content)
          ? (result as { content: unknown[] }).content
          : [{ type: "text", text: JSON.stringify(result) }];

      return { content };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : "Tool execution failed.",
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}

export const GET = handleProxyRequest;
export const POST = handleProxyRequest;
export const DELETE = handleProxyRequest;
