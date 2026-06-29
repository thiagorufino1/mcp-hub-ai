import { createOAuthClient } from "@/lib/oauth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_request", error_description: "Body must be JSON." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const clientName = typeof b.client_name === "string" ? b.client_name.trim() : null;
  if (!clientName) {
    return Response.json(
      { error: "invalid_client_metadata", error_description: "client_name is required." },
      { status: 400 },
    );
  }

  const redirectUris = Array.isArray(b.redirect_uris)
    ? (b.redirect_uris as unknown[]).filter((u): u is string => typeof u === "string")
    : [];
  if (redirectUris.length === 0) {
    return Response.json(
      { error: "invalid_client_metadata", error_description: "redirect_uris must be a non-empty array." },
      { status: 400 },
    );
  }

  const invalidUri = redirectUris.find((uri) => {
    if (uri.includes("#")) return true; // RFC 6749 §3.1.2: no fragments
    let parsed: URL;
    try { parsed = new URL(uri); } catch { return true; }
    if (parsed.protocol === "https:") return false;
    if (parsed.protocol === "http:" &&
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1")) {
      return false;
    }
    return true;
  });
  if (invalidUri) {
    return Response.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris must use https:// or http://localhost." },
      { status: 400 },
    );
  }

  const grantTypes = Array.isArray(b.grant_types)
    ? (b.grant_types as unknown[]).filter((g): g is string => typeof g === "string")
    : ["authorization_code", "refresh_token"];

  const responseTypes = Array.isArray(b.response_types)
    ? (b.response_types as unknown[]).filter((r): r is string => typeof r === "string")
    : ["code"];

  const tokenEndpointAuthMethod =
    typeof b.token_endpoint_auth_method === "string" ? b.token_endpoint_auth_method : "none";

  // Only PKCE public clients supported
  if (tokenEndpointAuthMethod !== "none") {
    return Response.json(
      {
        error: "invalid_client_metadata",
        error_description: "Only token_endpoint_auth_method=none supported.",
      },
      { status: 400 },
    );
  }

  const client = await createOAuthClient({
    clientName,
    clientUri: typeof b.client_uri === "string" ? b.client_uri : undefined,
    redirectUris,
    grantTypes,
    responseTypes,
    tokenEndpointAuthMethod,
  });

  return Response.json(
    {
      client_id: client.id,
      client_name: client.clientName,
      client_uri: client.clientUri,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
    },
    { status: 201 },
  );
}
