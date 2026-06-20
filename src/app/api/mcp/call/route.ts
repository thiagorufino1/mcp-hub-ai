import { auth } from "@/lib/auth";
import { executeMcpTool } from "@/lib/mcp-client";
import { isToolExecutionAllowed } from "@/lib/mcp-authorization";
import type { McpServerConfig } from "@/types/mcp";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function normalizeServerPayload(server: Partial<McpServerConfig>) {
  if (!server.id || !server.name || !server.transport) {
    return { error: "Invalid MCP configuration." as const };
  }

  if (!["stdio", "sse", "streamable-http"].includes(server.transport)) {
    return { error: "Invalid MCP transport." as const };
  }

  if (server.args && (!Array.isArray(server.args) || server.args.some((arg) => typeof arg !== "string"))) {
    return { error: "MCP args must be an array of strings." as const };
  }

  if (server.env && !isRecordOfStrings(server.env)) {
    return { error: "MCP env must be a string record." as const };
  }

  if (server.headers && !isRecordOfStrings(server.headers)) {
    return { error: "MCP headers must be a string record." as const };
  }

  if (server.transport === "stdio" && !server.command?.trim()) {
    return { error: "stdio transport requires a command." as const };
  }

  if (server.transport !== "stdio" && !server.url?.trim()) {
    return { error: "Remote transport requires a URL." as const };
  }

  return {
    server: {
      authMode: server.authMode ?? "none",
      approvalMode: server.approvalMode ?? "never",
      approvedToolNames: server.approvedToolNames ?? [],
      args: server.args ?? [],
      command: server.command?.trim(),
      connectionStatus: server.connectionStatus ?? "pending",
      description: server.description?.trim() || undefined,
      enabled: server.enabled ?? true,
      env: server.env ?? {},
      errorMessage: server.errorMessage,
      headers: server.headers ?? {},
      id: server.id,
      lastCheckedAt: server.lastCheckedAt,
      name: server.name.trim(),
      oauth: server.oauth,
      tools: server.tools ?? [],
      transport: server.transport,
      url: server.url?.trim(),
    } satisfies McpServerConfig,
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { server?: Partial<McpServerConfig>; toolName?: string; args?: unknown };

  try {
    body = (await request.json()) as { server?: Partial<McpServerConfig>; toolName?: string; args?: unknown };
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const normalized = normalizeServerPayload(body.server ?? {});
  if ("error" in normalized) {
    return Response.json({ error: normalized.error }, { status: 400 });
  }

  if (typeof body.toolName !== "string" || body.toolName.trim().length === 0) {
    return Response.json({ error: "toolName is required." }, { status: 400 });
  }

  const toolName = body.toolName.trim();
  if (!isToolExecutionAllowed(normalized.server, toolName)) {
    return Response.json({ error: `Tool "${toolName}" is not approved for execution.` }, { status: 403 });
  }

  if (!isRecord(body.args)) {
    return Response.json({ error: "args must be a JSON object." }, { status: 400 });
  }

  try {
    const result = await executeMcpTool(normalized.server, toolName, body.args);
    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to execute MCP tool." },
      { status: 422 },
    );
  }
}
