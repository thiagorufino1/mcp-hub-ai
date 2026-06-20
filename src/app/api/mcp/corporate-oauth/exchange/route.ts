import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { discoverMcpOAuth, exchangeMcpOAuthCode } from "@/lib/mcp-oauth";
import { getUserContext } from "@/lib/user-context";
import { z } from "zod";

// tokenEndpoint, clientId, clientSecret are intentionally NOT accepted from the client
// to prevent SSRF — they are resolved server-side from the DB and OAuth discovery.
const ExchangeSchema = z.object({
  mcpServerId: z.string().min(1),
  code: z.string().min(1),
  codeVerifier: z.string().min(1),
  redirectUri: z.string().url(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = ExchangeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Verify user has access to this MCP and fetch OAuth credentials from DB (not from client)
  const context = await getUserContext(session.user.groups, undefined, session.user.id);
  const accessible = context.mcpServers.some((s) => s.id === body.data.mcpServerId);
  if (!accessible) {
    return Response.json({ error: "MCP not found or not accessible." }, { status: 404 });
  }

  const dbMcp = await prisma.mcpServer.findUnique({
    where: { id: body.data.mcpServerId },
    select: { url: true, oauthClientId: true, oauthClientSecret: true },
  });
  if (!dbMcp?.url) {
    return Response.json({ error: "MCP has no URL." }, { status: 400 });
  }

  try {
    // Re-discover OAuth metadata server-side — never trust client-provided tokenEndpoint
    const discovery = await discoverMcpOAuth(dbMcp.url);

    const result = await exchangeMcpOAuthCode(discovery.tokenEndpoint, {
      clientId: dbMcp.oauthClientId ?? "",
      clientSecret: dbMcp.oauthClientSecret ?? undefined,
      code: body.data.code,
      codeVerifier: body.data.codeVerifier,
      redirectUri: body.data.redirectUri,
    });

    await prisma.userMcpConnection.upsert({
      where: { userId_mcpServerId: { userId: session.user.id, mcpServerId: body.data.mcpServerId } },
      create: {
        userId: session.user.id,
        mcpServerId: body.data.mcpServerId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? null,
        tokenType: result.tokenType ?? "Bearer",
        expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
        scope: result.scope ?? null,
        status: "connected",
      },
      update: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? null,
        tokenType: result.tokenType ?? "Bearer",
        expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
        scope: result.scope ?? null,
        status: "connected",
        updatedAt: new Date(),
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Token exchange failed." },
      { status: 502 },
    );
  }
}
