import { auth } from "@/lib/auth";
import { verifyCorporateOAuthState } from "@/lib/corporate-oauth-state";
import { prisma } from "@/lib/db";
import { discoverMcpOAuth, exchangeMcpOAuthCode } from "@/lib/mcp-oauth";
import { getUserContext } from "@/lib/user-context";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import {
  decryptSecret,
  encryptSecret,
} from "@/lib/secret-crypto";

// tokenEndpoint, clientId, clientSecret are intentionally NOT accepted from the client
// to prevent SSRF - they are resolved server-side from the DB and OAuth discovery.
const ExchangeSchema = z.object({
  mcpServerId: z.string().min(1),
  code: z.string().min(1),
  codeVerifier: z.string().min(1),
  redirectUri: z.string().url(),
  state: z.string().min(1),
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

  if (
    !verifyCorporateOAuthState(body.data.state, {
      mcpServerId: body.data.mcpServerId,
      userId: session.user.id,
    })
  ) {
    return Response.json({ error: "Invalid or expired OAuth state." }, { status: 400 });
  }

  // Verify user has access to this MCP and fetch OAuth credentials from DB (not from client)
  // Check access via namespace query - not getUserContext which filters by user preference.
  // A user must be able to connect to a server even if they previously disabled it.
  const accessible = await prisma.mcpNamespace.findFirst({
    where: {
      enabled: true,
      servers: { some: { mcpServerId: body.data.mcpServerId, enabled: true, mcpServer: { enabled: true } } },
      OR: [
        { groups: { some: { entraGroupId: { in: session.user.groups.length > 0 ? session.user.groups : ["__never__"] } } } },
        { users: { some: { id: session.user.id } } },
        { AND: [{ groups: { none: {} } }, { users: { none: {} } }] },
      ],
    },
    select: { id: true },
  });
  if (!accessible) {
    return Response.json({ error: "MCP not found or not accessible." }, { status: 404 });
  }

  const dbMcp = await prisma.mcpServer.findUnique({
    where: { id: body.data.mcpServerId },
    select: {
      authType: true,
      url: true,
      oauthClientId: true,
      oauthClientSecret: true,
    },
  });
  if (!dbMcp?.url) {
    return Response.json({ error: "MCP has no URL." }, { status: 400 });
  }
  if (dbMcp.authType !== "oauth_delegated") {
    return Response.json({ error: "MCP does not use delegated OAuth." }, { status: 400 });
  }
  if (!dbMcp.oauthClientId) {
    return Response.json(
      { error: "OAuth client ID is not configured. Start the connection again." },
      { status: 400 },
    );
  }

  try {
    // Re-discover OAuth metadata server-side - never trust client-provided tokenEndpoint
    const discovery = await discoverMcpOAuth(dbMcp.url);

    const result = await exchangeMcpOAuthCode(discovery.tokenEndpoint, {
      clientId: dbMcp.oauthClientId,
      clientSecret: decryptSecret(dbMcp.oauthClientSecret) || undefined,
      code: body.data.code,
      codeVerifier: body.data.codeVerifier,
      redirectUri: body.data.redirectUri,
      resourceUrl: discovery.resourceUrl,
    });

    await prisma.$transaction([
      prisma.userMcpConnection.upsert({
        where: { userId_mcpServerId: { userId: session.user.id, mcpServerId: body.data.mcpServerId } },
        create: {
          userId: session.user.id,
          mcpServerId: body.data.mcpServerId,
          accessToken: encryptSecret(result.accessToken),
          refreshToken: result.refreshToken ? encryptSecret(result.refreshToken) : null,
          tokenType: result.tokenType ?? "Bearer",
          expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
          scope: result.scope ?? null,
          status: "connected",
        },
        update: {
          accessToken: encryptSecret(result.accessToken),
          refreshToken: result.refreshToken ? encryptSecret(result.refreshToken) : null,
          tokenType: result.tokenType ?? "Bearer",
          expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
          scope: result.scope ?? null,
          status: "connected",
          updatedAt: new Date(),
        },
      }),
      // Auto-enable preference when user connects
      prisma.userMcpPreference.upsert({
        where: { userId_mcpServerId: { userId: session.user.id, mcpServerId: body.data.mcpServerId } },
        create: { userId: session.user.id, mcpServerId: body.data.mcpServerId, enabled: true },
        update: { enabled: true },
      }),
    ]);

    const linkedServer = await prisma.mcpServer.findUnique({
      where: { id: body.data.mcpServerId },
    });
    // Do NOT call resolveMcpServerTools here - oauth_delegated tool discovery
    // must happen in the user's own request context, not as a global side effect
    // that would pollute registryTools and healthStatus for all users.

    logAudit({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: "user.oauth.connect",
      resource: "McpServer",
      resourceId: body.data.mcpServerId,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Token exchange failed." },
      { status: 502 },
    );
  }
}
