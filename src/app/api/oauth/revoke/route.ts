import { prisma } from "@/lib/db";
import { revokeToken } from "@/lib/oauth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const body = new URLSearchParams(await request.text());
  const token = body.get("token");
  const clientId = body.get("client_id");

  // client_id is required per RFC 7009 §2.1 for public clients
  if (!clientId) {
    return Response.json({ error: "invalid_request", error_description: "client_id is required." }, { status: 400 });
  }

  if (token) {
    // Look up the token to verify ownership before revoking
    const { createHash } = await import("crypto");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const [accessToken, refreshToken] = await Promise.all([
      prisma.oAuthAccessToken.findUnique({ where: { tokenHash }, select: { clientId: true } }),
      prisma.oAuthRefreshToken.findUnique({ where: { tokenHash }, select: { clientId: true } }),
    ]);

    const record = accessToken ?? refreshToken;

    // If token exists but belongs to a different client, reject
    if (record && record.clientId !== clientId) {
      return Response.json({ error: "invalid_request", error_description: "Token does not belong to this client." }, { status: 400 });
    }

    // RFC 7009: revoke if found and client matches; silently succeed for unknown tokens
    if (record) {
      await revokeToken(token).catch(() => undefined);
    }
  }

  return new Response(null, { status: 200 });
}
