import { auth } from "@/lib/auth";
import { createInspectableServerConfig, inspectMcpServer } from "@/lib/mcp-client";
import type { McpInspectResponse, McpServerConfig } from "@/types/mcp";

import { z } from "zod";

const ServerPayloadSchema = z.object({
  authMode: z.enum(["none", "oauth"]).optional().default("none"),
  approvalMode: z.enum(["always", "never", "selected"]).optional().default("never"),
  approvedToolNames: z.array(z.string()).optional().default([]),
  args: z.array(z.string()).optional().default([]),
  command: z.string().trim().optional(),
  description: z.string().trim().optional(),
  enabled: z.boolean().optional().default(true),
  env: z.record(z.string(), z.string()).optional().default({}),
  headers: z.record(z.string(), z.string()).optional().default({}),
  id: z.string().min(1),
  name: z.string().trim().min(1, "MCP server name is required."),
  oauth: z
    .object({
      accessToken: z.string().optional(),
      authorizationServerUrl: z.string().trim().url().optional(),
      clientId: z.string().trim().optional(),
      clientName: z.string().trim().optional(),
      clientSecret: z.string().trim().optional(),
      expiresAt: z.string().trim().optional(),
      refreshToken: z.string().trim().optional(),
      redirectUri: z.string().trim().url().optional(),
      resourceUrl: z.string().trim().url().optional(),
      scope: z.string().trim().optional(),
      tokenEndpoint: z.string().trim().url().optional(),
      tokenType: z.string().trim().optional(),
    })
    .optional(),
  transport: z.enum(["stdio", "sse", "streamable-http"]),
  url: z.string().trim().optional(),
}).refine(data => {
  if (data.transport === "stdio" && (!data.command || data.command.length === 0)) {
    return false;
  }
  return true;
}, { message: "stdio transport requires a command.", path: ["command"] })
.refine(data => {
  if (data.transport !== "stdio" && (!data.url || data.url.length === 0)) {
    return false;
  }
  return true;
}, { message: "Remote transport requires a URL.", path: ["url"] });

const SLOW_INSPECT_LOG_THRESHOLD_MS = 500;

function describeInspectTarget(server: McpServerConfig) {
  if (server.transport === "stdio") {
    const commandPreview = [server.command, ...(server.args ?? [])].filter(Boolean).join(" ").trim();
    return commandPreview || "(no command)";
  }

  return server.url ?? "(no url)";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { server?: Partial<McpServerConfig> };
  try {
    body = (await request.json()) as { server?: Partial<McpServerConfig> };
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = ServerPayloadSchema.safeParse(body.server ?? {});
  
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const serverConfig = createInspectableServerConfig({
    ...parsed.data,
    connectionStatus: "pending",
    tools: [],
  } as McpServerConfig);

  const startedAt = performance.now();
  const result = await inspectMcpServer(serverConfig);
  const durationMs = Math.round(performance.now() - startedAt);
  const target = describeInspectTarget(serverConfig);

  if (result.server.connectionStatus === "connected") {
    if (durationMs >= SLOW_INSPECT_LOG_THRESHOLD_MS) {
      console.info(
        `[mcp inspect] slow server="${serverConfig.name}" transport=${serverConfig.transport} target="${target}" durationMs=${durationMs} tools=${result.server.tools.length}`,
      );
    }
  } else {
    console.warn(
      `[mcp inspect] failed server="${serverConfig.name}" transport=${serverConfig.transport} target="${target}" durationMs=${durationMs} error="${result.server.errorMessage ?? "unknown"}"`,
    );
  }

  return Response.json(result satisfies McpInspectResponse, {
    status: result.server.connectionStatus === "connected" ? 200 : 422,
  });
}
