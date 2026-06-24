import { auth } from "@/lib/auth";
import { createCorporateOAuthState } from "@/lib/corporate-oauth-state";
import { prisma } from "@/lib/db";
import { getUserContext } from "@/lib/user-context";
import {
  buildMcpOAuthAuthorizationUrl,
  createPkcePair,
  discoverMcpOAuth,
  registerMcpOAuthClient,
} from "@/lib/mcp-oauth";
import { z } from "zod";
import {
  decryptSecret,
  encryptSecret,
} from "@/lib/secret-crypto";

const StartSchema = z.object({
  mcpServerId: z.string().min(1),
  redirectUri: z.string().url(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = StartSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const redirectUri = new URL(body.data.redirectUri);
  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).origin
    : requestOrigin;
  if (
    redirectUri.pathname !== "/oauth/callback" ||
    (redirectUri.origin !== requestOrigin && redirectUri.origin !== configuredOrigin)
  ) {
    return Response.json({ error: "Invalid OAuth redirect URI." }, { status: 400 });
  }

  // Verify access via namespace — not getUserContext which filters by user preference.
  const accessibleNs = await prisma.mcpNamespace.findFirst({
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
  if (!accessibleNs) {
    return Response.json({ error: "MCP not found or not accessible." }, { status: 404 });
  }
  const mcpTransport = await prisma.mcpServer.findUnique({
    where: { id: body.data.mcpServerId },
    select: { transport: true },
  });
  if (mcpTransport?.transport === "stdio") {
    return Response.json({ error: "OAuth not supported for stdio MCPs." }, { status: 400 });
  }

  // Fetch OAuth client credentials from DB
  const dbMcp = await prisma.mcpServer.findUnique({
    where: { id: body.data.mcpServerId },
    select: {
      authType: true,
      url: true,
      oauthClientId: true,
      oauthClientSecret: true,
      oauthScopes: true,
    },
  });
  if (!dbMcp?.url) {
    return Response.json({ error: "MCP has no URL." }, { status: 400 });
  }
  if (dbMcp.authType !== "oauth_delegated") {
    return Response.json({ error: "MCP does not use delegated OAuth." }, { status: 400 });
  }

  try {
    const discovery = await discoverMcpOAuth(dbMcp.url);
    const { codeChallenge, codeVerifier } = await createPkcePair();
    const state = createCorporateOAuthState(
      session.user.id,
      body.data.mcpServerId,
    );

    let clientId = dbMcp.oauthClientId ?? null;
    let clientSecret = decryptSecret(dbMcp.oauthClientSecret) || null;

    // Dynamic registration fallback
    if (!clientId && discovery.registrationEndpoint) {
      const reg = await registerMcpOAuthClient(discovery, {
        clientName: "MCP Hub",
        redirectUri: body.data.redirectUri,
      });
      if (reg) {
        clientId = reg.clientId;
        clientSecret = reg.clientSecret ?? null;
        await prisma.mcpServer.update({
          where: { id: body.data.mcpServerId },
          data: {
            oauthClientId: clientId,
            oauthClientSecret: clientSecret
              ? encryptSecret(clientSecret)
              : null,
          },
        });
      }
    }

    if (!clientId) {
      return Response.json(
        { error: "Could not determine OAuth client ID. Configure it in admin." },
        { status: 400 },
      );
    }

    const authorizationUrl = buildMcpOAuthAuthorizationUrl(discovery, {
      clientId,
      codeChallenge,
      redirectUri: body.data.redirectUri,
      scope: dbMcp.oauthScopes ?? undefined,
      state,
    });

    // Only return values needed by the browser for the popup + exchange request.
    // clientId, clientSecret, tokenEndpoint stay server-side — re-discovered on exchange.
    return Response.json({
      authorizationUrl,
      codeVerifier,
      state,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "OAuth discovery failed." },
      { status: 502 },
    );
  }
}
