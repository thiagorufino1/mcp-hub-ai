export const dynamic = "force-dynamic";

function baseUrl() {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function resourceFromPath(path: string[]) {
  if (path.length === 0) {
    return baseUrl();
  }

  if (path[0] === "api" && path[1] === "mcp") {
    return `${baseUrl()}/${path.join("/")}`;
  }

  return baseUrl();
}

export function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  return context.params.then(({ path = [] }) =>
    Response.json({
      resource: resourceFromPath(path),
      authorization_servers: [baseUrl()],
      bearer_methods_supported: ["header"],
      resource_signing_alg_values_supported: [],
    }),
  );
}
