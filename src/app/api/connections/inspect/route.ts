import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveDelegatedAuthorizationHeaders } from "@/lib/delegated-oauth";
import { dbMcpToConfig } from "@/lib/user-context";
import { resolveMcpServerTools } from "@/lib/mcp-tool-registry";
import { z } from "zod";

const Schema = z.object({ mcpServerId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = Schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { mcpServerId } = body.data;

  const mcp = await prisma.mcpServer.findUnique({
    where: { id: mcpServerId, enabled: true, authType: "oauth_delegated" },
  });

  if (!mcp) {
    return Response.json({ error: "Server not found." }, { status: 404 });
  }

  const delegatedHeaders = await resolveDelegatedAuthorizationHeaders(session.user.id, [mcpServerId]);
  const authHeader = delegatedHeaders.get(mcpServerId);

  if (!authHeader) {
    return Response.json({ error: "Not connected." }, { status: 403 });
  }

  const serverConfig = dbMcpToConfig(mcp, authHeader);

  try {
    const result = await resolveMcpServerTools(serverConfig);
    if (result.connectionStatus === "connected") {
      return Response.json({ toolCount: result.tools.length });
    }
    return Response.json({ toolCount: 0 });
  } catch {
    return Response.json({ toolCount: 0 });
  }
}
