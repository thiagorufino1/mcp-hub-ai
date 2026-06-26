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

  function errorRedirect(error: string): Response {
    if (!redirectUri) return new Response(error, { status: 400 });
    const target = new URL(redirectUri);
    target.searchParams.set("error", error);
    if (state) target.searchParams.set("state", state);
    return Response.redirect(target.toString(), 302);
  }

  if (responseType !== "code") return errorRedirect("unsupported_response_type");
  if (!clientId) return errorRedirect("invalid_request");
  if (!redirectUri) return new Response("redirect_uri required", { status: 400 });
  if (!codeChallenge) return errorRedirect("invalid_request");
  if (codeChallengeMethod !== "S256") return errorRedirect("invalid_request");

  const normalizedScope = validateScope(scope);
  if (!normalizedScope) return errorRedirect("invalid_scope");

  const client = await prisma.oAuthClient.findUnique({ where: { id: clientId } });
  if (!client) return errorRedirect("invalid_client");
  if (!client.redirectUris.includes(redirectUri)) return errorRedirect("invalid_request");

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
