import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { exchangeMcpOAuthCode } from "@/lib/mcp-oauth";
import { z } from "zod";

const ExchangeSchema = z.object({
  mcpServerId: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().optional(),
  code: z.string().min(1),
  codeVerifier: z.string().min(1),
  redirectUri: z.string().url(),
  tokenEndpoint: z.string().url(),
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

  try {
    const result = await exchangeMcpOAuthCode(body.data.tokenEndpoint, {
      clientId: body.data.clientId,
      clientSecret: body.data.clientSecret,
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
