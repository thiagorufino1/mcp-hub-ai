import { consumeAuthCode, createTokenPair, rotateRefreshToken, ACCESS_TOKEN_TTL_MS } from "@/lib/oauth-server";

export const dynamic = "force-dynamic";

function parseBody(request: Request): Promise<URLSearchParams> {
  return request.text().then((text) => new URLSearchParams(text));
}

function tokenError(error: string, description?: string) {
  return Response.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status: 400, headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
}

function tokenResponse(data: object) {
  return Response.json(data, {
    status: 200,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return tokenError("invalid_request", "Content-Type must be application/x-www-form-urlencoded.");
  }

  const body = await parseBody(request);
  const grantType = body.get("grant_type");
  const clientId = body.get("client_id");

  if (!clientId) return tokenError("invalid_client", "client_id required.");

  if (grantType === "authorization_code") {
    const code = body.get("code");
    const redirectUri = body.get("redirect_uri");
    const codeVerifier = body.get("code_verifier");

    if (!code || !redirectUri || !codeVerifier) {
      return tokenError("invalid_request", "code, redirect_uri, and code_verifier required.");
    }

    const result = await consumeAuthCode(code, clientId, redirectUri, codeVerifier);
    if (!result) {
      return tokenError("invalid_grant", "Authorization code invalid, expired, or already used.");
    }

    const tokens = await createTokenPair(clientId, result.userId, result.scope);

    return tokenResponse({
      access_token: tokens.accessToken,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      refresh_token: tokens.refreshToken,
      scope: result.scope,
    });
  }

  if (grantType === "refresh_token") {
    const rawRefresh = body.get("refresh_token");
    if (!rawRefresh) return tokenError("invalid_request", "refresh_token required.");

    const result = await rotateRefreshToken(rawRefresh, clientId);
    if (!result) {
      return tokenError("invalid_grant", "Refresh token invalid, expired, or revoked.");
    }

    const tokens = await createTokenPair(clientId, result.userId, result.scope);

    return tokenResponse({
      access_token: tokens.accessToken,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      refresh_token: tokens.refreshToken,
      scope: result.scope,
    });
  }

  return tokenError("unsupported_grant_type");
}
