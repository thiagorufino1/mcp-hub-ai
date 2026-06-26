export const dynamic = "force-dynamic";

function baseUrl() {
  const url = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function GET() {
  const base = baseUrl();

  return Response.json({
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    revocation_endpoint: `${base}/api/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp:proxy", "mcp:namespace"],
    service_documentation: `${base}/docs`,
  });
}
