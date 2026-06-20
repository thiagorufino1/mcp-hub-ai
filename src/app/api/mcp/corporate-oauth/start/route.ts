import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserContext } from "@/lib/user-context";
import {
  buildMcpOAuthAuthorizationUrl,
  createPkcePair,
  discoverMcpOAuth,
  registerMcpOAuthClient,
} from "@/lib/mcp-oauth";
import { z } from "zod";

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

  // Verify user has access to this MCP via their groups
  const context = await getUserContext(session.user.groups);
  const mcp = context.mcpServers.find((s) => s.id === body.data.mcpServerId);
  if (!mcp) {
    return Response.json({ error: "MCP not found or not accessible." }, { status: 404 });
  }
  if (mcp.transport === "stdio") {
    return Response.json({ error: "OAuth not supported for stdio MCPs." }, { status: 400 });
  }

  // Fetch OAuth client credentials from DB
  const dbMcp = await prisma.mcpServer.findUnique({
    where: { id: body.data.mcpServerId },
    select: { url: true, oauthClientId: true, oauthClientSecret: true, oauthScopes: true },
  });
  if (!dbMcp?.url) {
    return Response.json({ error: "MCP has no URL." }, { status: 400 });
  }

  try {
    const discovery = await discoverMcpOAuth(dbMcp.url);
    const { codeChallenge, codeVerifier } = await createPkcePair();
    const state = crypto.randomUUID();

    let clientId = dbMcp.oauthClientId ?? null;
    let clientSecret = dbMcp.oauthClientSecret ?? null;

    // Dynamic registration fallback
    if (!clientId && discovery.registrationEndpoint) {
      const reg = await registerMcpOAuthClient(discovery, {
        clientName: "MCP Hub",
        redirectUri: body.data.redirectUri,
      });
      if (reg) {
        clientId = reg.clientId;
        clientSecret = reg.clientSecret ?? null;
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
