import { revokeToken } from "@/lib/oauth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const body = new URLSearchParams(await request.text());
  const token = body.get("token");

  if (token) {
    // RFC 7009: always 200 even if token unknown
    await revokeToken(token).catch(() => undefined);
  }

  return new Response(null, { status: 200 });
}
