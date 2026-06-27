import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateScope } from "@/lib/oauth-server";
import { createAuthorizeState } from "@/lib/oauth-server-state";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const p = url.searchParams;

  const responseType = p.get("response_type");
  const clientId = p.get("client_id");
  const redirectUri = p.get("redirect_uri");
  const scope = p.get("scope") ?? "mcp:proxy";
  const state = p.get("state") ?? "";
  const codeChallenge = p.get("code_challenge");
  const codeChallengeMethod = p.get("code_challenge_method");

  // 1. Verify redirect_uri is present before any redirect - no redirect until uri is confirmed.
  if (!redirectUri) return new Response("redirect_uri required", { status: 400 });

  // 2. Verify client_id is present - still no redirect, uri not yet confirmed registered.
  if (!clientId) return new Response("client_id required", { status: 400 });

  // 3. Look up client and confirm redirect_uri is registered on it.
  const client = await prisma.oAuthClient.findUnique({ where: { id: clientId } });
  if (!client || !client.redirectUris.includes(redirectUri)) {
    return new Response("invalid client or redirect_uri", { status: 400 });
  }

  // redirect_uri is now confirmed registered - safe to use errorRedirect for remaining checks.
  function errorRedirect(error: string): Response {
    const target = new URL(redirectUri!);
    target.searchParams.set("error", error);
    if (state) target.searchParams.set("state", state);
    return Response.redirect(target.toString(), 302);
  }

  if (responseType !== "code") return errorRedirect("unsupported_response_type");
  if (!codeChallenge) return errorRedirect("invalid_request");
  if (codeChallengeMethod !== "S256") return errorRedirect("invalid_request");

  const normalizedScope = validateScope(scope);
  if (!normalizedScope) return errorRedirect("invalid_scope");

  const session = await auth();
  if (!session?.user?.email) {
    const callbackUrl = request.url;
    return Response.redirect(
      `${url.origin}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      302,
    );
  }

  const hubState = createAuthorizeState({
    clientId,
    redirectUri,
    scope: normalizedScope,
  });

  const approveUrl = new URL("/oauth/approve", url.origin);
  approveUrl.searchParams.set("hub_state", hubState);
  approveUrl.searchParams.set("client_name", client.clientName);
  approveUrl.searchParams.set("scope", normalizedScope);
  approveUrl.searchParams.set("original_state", state);
  approveUrl.searchParams.set("code_challenge", codeChallenge);

  return Response.redirect(approveUrl.toString(), 302);
}
