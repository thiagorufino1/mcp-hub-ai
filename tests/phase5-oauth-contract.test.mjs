import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import ts from "typescript";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

async function importTypeScriptModule(relativePath) {
  const compiledModule = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  return import(
    `data:text/javascript;base64,${Buffer.from(compiledModule).toString("base64")}`
  );
}

test("corporate OAuth exchange validates signed state and does not trust client endpoints", () => {
  const exchange = read("src/app/api/mcp/corporate-oauth/exchange/route.ts");

  assert.match(exchange, /verifyCorporateOAuthState/);
  assert.match(exchange, /state:\s*z\.string\(\)\.min\(1\)/);
  assert.doesNotMatch(exchange, /tokenEndpoint:\s*z\.string/);
  assert.doesNotMatch(exchange, /clientSecret:\s*z\.string/);
});

test("dynamic OAuth registration is persisted for the server-side exchange", () => {
  const start = read("src/app/api/mcp/corporate-oauth/start/route.ts");

  assert.match(start, /registerMcpOAuthClient/);
  assert.match(start, /prisma\.mcpServer\.update/);
  assert.match(start, /oauthClientId:\s*clientId/);
});

test("delegated tokens are only injected while connected and unexpired", () => {
  const userContext = read("src/lib/user-context.ts");

  assert.match(userContext, /resolveDelegatedAuthorizationHeaders/);
  assert.match(userContext, /dbMcpToConfig\(mcp,\s*delegatedHeaders\.get\(mcp\.id\)\)/);
  assert.match(userContext, /withoutAuthorizationHeader\(storedHeaders\)/);
  assert.match(userContext, /Boolean\(resolvedDelegatedAuthorization\)/);
});

test("global Authorization headers cannot authenticate delegated OAuth MCPs", () => {
  const adminActions = read("src/app/admin/mcp/actions.ts");
  const namespaceContext = read("src/lib/mcp-namespace.ts");
  const workspaceContext = read("src/lib/workspace-context.ts");

  assert.match(adminActions, /sanitizeMcpHeaders/);
  assert.match(adminActions, /key\.toLowerCase\(\)\s*!==\s*"authorization"/);
  assert.match(namespaceContext, /dbMcpToConfig\(entry\.mcpServer,\s*authorization\)/);
  assert.match(namespaceContext, /if \(config\.enabled\)/);
  assert.match(workspaceContext, /server\.enabled\s*&&\s*server\.approvedToolNames\.length\s*>\s*0/);
});

test("connections UI handles blocked and closed OAuth popups", () => {
  const client = read("src/app/connections/client.tsx");

  assert.match(client, /if \(!popup\)/);
  assert.match(client, /popup\.closed/);
  assert.match(client, /window\.removeEventListener\("message", handleMessage\)/);
});

test("signed corporate OAuth state rejects tampering, wrong users, and expiry", async () => {
  process.env.NEXTAUTH_SECRET = "phase5-oauth-state-test-secret";
  const {
    createCorporateOAuthState,
    verifyCorporateOAuthState,
  } = await importTypeScriptModule("src/lib/corporate-oauth-state.ts");

  const state = createCorporateOAuthState("user-1", "mcp-1", 60_000);
  assert.equal(
    verifyCorporateOAuthState(state, {
      mcpServerId: "mcp-1",
      userId: "user-1",
    }),
    true,
  );
  assert.equal(
    verifyCorporateOAuthState(state, {
      mcpServerId: "mcp-1",
      userId: "user-2",
    }),
    false,
  );
  assert.equal(
    verifyCorporateOAuthState(`${state.slice(0, -1)}x`, {
      mcpServerId: "mcp-1",
      userId: "user-1",
    }),
    false,
  );

  const expiredState = createCorporateOAuthState("user-1", "mcp-1", -1);
  assert.equal(
    verifyCorporateOAuthState(expiredState, {
      mcpServerId: "mcp-1",
      userId: "user-1",
    }),
    false,
  );
});

test("OAuth discovery, PKCE authorization, and token exchange work against a compliant server", async () => {
  const server = http.createServer(async (request, response) => {
    const origin = `http://127.0.0.1:${server.address().port}`;

    if (request.url === "/.well-known/oauth-protected-resource") {
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          authorization_servers: [origin],
          resource: `${origin}/mcp`,
        }),
      );
      return;
    }

    if (request.url === "/.well-known/oauth-authorization-server") {
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          authorization_endpoint: `${origin}/authorize`,
          token_endpoint: `${origin}/token`,
        }),
      );
      return;
    }

    if (request.url === "/token" && request.method === "POST") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
      assert.equal(form.get("grant_type"), "authorization_code");
      assert.equal(form.get("client_id"), "client-1");
      assert.ok(form.get("code_verifier"));

      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          access_token: "access-1",
          expires_in: 3600,
          refresh_token: "refresh-1",
          token_type: "Bearer",
        }),
      );
      return;
    }

    response.statusCode = request.url === "/mcp" ? 401 : 404;
    response.end();
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const {
      buildMcpOAuthAuthorizationUrl,
      createPkcePair,
      discoverMcpOAuth,
      exchangeMcpOAuthCode,
    } = await importTypeScriptModule("src/lib/mcp-oauth.ts");

    const discovery = await discoverMcpOAuth(`${origin}/mcp`);
    const pkce = await createPkcePair();
    const authorizationUrl = new URL(
      buildMcpOAuthAuthorizationUrl(discovery, {
        clientId: "client-1",
        codeChallenge: pkce.codeChallenge,
        redirectUri: "http://localhost:3000/oauth/callback",
        state: "state-1",
      }),
    );

    assert.equal(authorizationUrl.origin, origin);
    assert.equal(authorizationUrl.pathname, "/authorize");
    assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");
    assert.equal(authorizationUrl.searchParams.get("resource"), `${origin}/mcp`);

    const token = await exchangeMcpOAuthCode(discovery.tokenEndpoint, {
      clientId: "client-1",
      code: "code-1",
      codeVerifier: pkce.codeVerifier,
      redirectUri: "http://localhost:3000/oauth/callback",
      resourceUrl: `${origin}/mcp`,
    });

    assert.equal(token.accessToken, "access-1");
    assert.equal(token.refreshToken, "refresh-1");
    assert.equal(token.tokenType, "Bearer");
    assert.ok(token.expiresAt);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
