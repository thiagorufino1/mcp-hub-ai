export const dynamic = "force-dynamic";

function baseUrl() {
  const url = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return context.params.then(({ path }) => {
    const base = baseUrl();
    const resourcePath = path.join("/");
    const resource = `${base}/${resourcePath}`;

    return Response.json({
      resource,
      authorization_servers: [base],
      bearer_methods_supported: ["header"],
      resource_signing_alg_values_supported: [],
    });
  });
}
