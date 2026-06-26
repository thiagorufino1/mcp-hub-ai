export const dynamic = "force-dynamic";

function baseUrl() {
  const url = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function GET() {
  const base = baseUrl();

  return Response.json({
    resource: base,
    authorization_servers: [base],
    bearer_methods_supported: ["header"],
    resource_signing_alg_values_supported: [],
  });
}
