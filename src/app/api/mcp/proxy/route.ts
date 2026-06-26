import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getUserContext } from "@/lib/user-context";
import { resolveTokenUser } from "@/lib/token-auth";
import { executeGovernedMcpTool } from "@/lib/mcp-governance";
import {
  getRegisteredToolPermission,
  isRegisteredToolEnabled,
  resolveMcpServerTools,
} from "@/lib/mcp-tool-registry";
import { logAudit } from "@/lib/audit";
import type { McpServerConfig } from "@/types/mcp";

function extractBearer(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
}

function sanitizeToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

function buildToolName(serverId: string, toolName: string): string {
  return `${sanitizeToken(serverId)}__${sanitizeToken(toolName)}`.slice(0, 64);
}

function parseToolName(functionName: string): { serverId: string; toolName: string } | null {
  const idx = functionName.indexOf("__");
  if (idx === -1) return null;
  return {
    serverId: functionName.slice(0, idx),
    toolName: functionName.slice(idx + 2),
  };
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
          "WWW-Authenticate": `Bearer realm="mcp-hub", resource_metadata="${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/.well-known/oauth-protected-resource"`,
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
          "WWW-Authenticate": `Bearer realm="mcp-hub", error="invalid_token", resource_metadata="${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/.well-known/oauth-protected-resource"`,
        },
      },
    );
  }

  // Scope enforcement: OAuth tokens must have mcp:proxy scope
  if (tokenUser.scope !== undefined && !tokenUser.scope.split(" ").includes("mcp:proxy")) {
    return new Response(
      JSON.stringify({ error: "Insufficient scope. mcp:proxy required." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const context = await getUserContext(tokenUser.entraGroups, undefined, tokenUser.userId);
  const proxyServers = context.mcpServers.filter((server) => server.enabled);

  const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  // Build a map from sanitized-server-id → original McpServerConfig
  const serverMap = new Map<string, McpServerConfig>(
    proxyServers.map((s) => [sanitizeToken(s.id), s]),
  );

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
            name: buildToolName(mcpServer.id, tool.name),
            title: tool.displayName,
            description: `[${mcpServer.name}] ${tool.description ?? ""}`.trim(),
            inputSchema: tool.inputSchema ?? { type: "object", properties: {} },
            annotations: {
              destructiveHint: tool.isDestructive ?? false,
              readOnlyHint: tool.readOnly ?? false,
            },
          });
        }
      } catch {
        // Skip unresponsive servers
      }
    }

    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const parsed = parseToolName(name);

    if (!parsed) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    const mcpServer = serverMap.get(parsed.serverId);
    if (!mcpServer) {
      return {
        content: [{ type: "text", text: `Server not found for tool: ${name}` }],
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
        method: request.method,
        serverId: mcpServer.id,
        toolName: parsed.toolName,
        event: "tool_used",
      },
    });

    if (!(await isRegisteredToolEnabled(mcpServer.id, parsed.toolName))) {
      return {
        content: [{ type: "text", text: `Tool is disabled or unknown: ${name}` }],
        isError: true,
      };
    }
    if ((await getRegisteredToolPermission(mcpServer.id, parsed.toolName)) === "approval") {
      return {
        content: [{ type: "text", text: `Tool requires interactive user approval: ${name}` }],
        isError: true,
      };
    }

    // Build server config with approvalMode always to allow execution
    const execServer: McpServerConfig = {
      ...mcpServer,
      approvalMode: "always",
      approvedToolNames: [],
    };

    try {
      const result = await executeGovernedMcpTool(
        execServer,
        parsed.toolName,
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
    sessionIdGenerator: undefined, // stateless
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}

export const GET = handleProxyRequest;
export const POST = handleProxyRequest;
export const DELETE = handleProxyRequest;
