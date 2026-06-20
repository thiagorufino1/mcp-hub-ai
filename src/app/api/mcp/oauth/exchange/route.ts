import { auth } from "@/lib/auth";
import { exchangeMcpOAuthCode } from "@/lib/mcp-oauth";

import { z } from "zod";

const OAuthExchangeSchema = z.object({
  clientId: z.string().trim().min(1),
  clientSecret: z.string().trim().optional(),
  code: z.string().trim().min(1),
  codeVerifier: z.string().trim().min(1),
  redirectUri: z.string().trim().url(),
  state: z.string().trim().min(1),
  tokenEndpoint: z.string().trim().url(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: z.infer<typeof OAuthExchangeSchema>;

  try {
    body = OAuthExchangeSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid OAuth exchange request." }, { status: 400 });
  }

  try {
    const tokens = await exchangeMcpOAuthCode(body.tokenEndpoint, body);

    return Response.json({
      oauth: {
        accessToken: tokens.accessToken,
        clientId: body.clientId,
        clientSecret: body.clientSecret,
        expiresAt: tokens.expiresAt,
        redirectUri: body.redirectUri,
        refreshToken: tokens.refreshToken,
        scope: tokens.scope,
        tokenEndpoint: body.tokenEndpoint,
        tokenType: tokens.tokenType ?? "Bearer",
      },
      state: body.state,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "OAuth exchange failed." },
      { status: 422 },
    );
  }
}
