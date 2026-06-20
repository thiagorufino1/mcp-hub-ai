import { auth } from "@/lib/auth";
import {
  buildMcpOAuthAuthorizationUrl,
  createPkcePair,
  discoverMcpOAuth,
  registerMcpOAuthClient,
} from "@/lib/mcp-oauth";

import { z } from "zod";

const OAuthStartSchema = z.object({
  clientName: z.string().trim().min(1).optional().default("MCP Hub"),
  clientUri: z.string().trim().url().optional(),
  clientId: z.string().trim().min(1).optional(),
  redirectUri: z.string().trim().url(),
  resourceUrl: z.string().trim().url(),
  scope: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: z.infer<typeof OAuthStartSchema>;

  try {
    body = OAuthStartSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid OAuth request." }, { status: 400 });
  }

  try {
    const discovery = await discoverMcpOAuth(body.resourceUrl);
    const { codeChallenge, codeVerifier } = await createPkcePair();
    const state = crypto.randomUUID();

    const registration =
      body.clientId
        ? {
            clientId: body.clientId,
          }
        : await registerMcpOAuthClient(discovery, {
            clientName: body.clientName,
            clientUri: body.clientUri,
            redirectUri: body.redirectUri,
          });

    if (!registration?.clientId) {
      return Response.json(
        {
          error:
            "OAuth client registration failed. Configure a server that supports dynamic client registration or use a static client id.",
        },
        { status: 422 },
      );
    }

    const authorizationUrl = buildMcpOAuthAuthorizationUrl(discovery, {
      clientId: registration.clientId,
      codeChallenge,
      redirectUri: body.redirectUri,
      scope: body.scope,
      state,
    });

    return Response.json({
      authorizationUrl,
      clientId: registration.clientId,
      clientSecret: registration.clientSecret,
      codeVerifier,
      redirectUri: body.redirectUri,
      registration,
      resourceUrl: discovery.resourceUrl,
      scope: body.scope,
      state,
      tokenEndpoint: discovery.tokenEndpoint,
      authorizationServerUrl: discovery.authorizationServerUrl,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "OAuth start failed." },
      { status: 422 },
    );
  }
}
