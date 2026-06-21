import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
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

test("secret encryption supports round trips, plaintext compatibility, and tamper rejection", async () => {
  process.env.MCP_HUB_ENCRYPTION_KEY = "phase6-test-encryption-key";
  const {
    decryptSecret,
    decryptSecretJson,
    encryptSecret,
    encryptSecretJson,
    isEncryptedString,
  } = await importTypeScriptModule("src/lib/secret-crypto.ts");

  const encrypted = encryptSecret("sensitive-value");
  assert.equal(isEncryptedString(encrypted), true);
  assert.notEqual(encrypted, "sensitive-value");
  assert.equal(decryptSecret(encrypted), "sensitive-value");
  assert.equal(decryptSecret("legacy-plaintext"), "legacy-plaintext");

  const encryptedJson = encryptSecretJson({
    apiKey: "secret",
    endpoint: "https://example.test",
  });
  assert.deepEqual(decryptSecretJson(encryptedJson), {
    apiKey: "secret",
    endpoint: "https://example.test",
  });
  assert.deepEqual(decryptSecretJson({ apiKey: "legacy" }), {
    apiKey: "legacy",
  });

  const prefix = "enc:v1:";
  const tamperedPayload = Buffer.from(encrypted.slice(prefix.length), "base64url");
  tamperedPayload[tamperedPayload.length - 1] ^= 1;
  const tampered = `${prefix}${tamperedPayload.toString("base64url")}`;
  assert.throws(() => decryptSecret(tampered));
});

test("administrative writes encrypt persisted LLM and MCP credentials", () => {
  const llmActions = read("src/app/admin/llm/actions.ts");
  const mcpActions = read("src/app/admin/mcp/actions.ts");

  assert.match(llmActions, /encryptSecretJson\(credentials\)/);
  assert.match(mcpActions, /encryptSecretJson\(JSON\.parse\(envRaw\)/);
  assert.match(mcpActions, /optionalEncryptedValue/);
});

test("delegated OAuth tokens are encrypted and refresh failures expire connections", () => {
  const exchange = read("src/app/api/mcp/corporate-oauth/exchange/route.ts");
  const delegatedOAuth = read("src/lib/delegated-oauth.ts");

  assert.match(exchange, /accessToken:\s*encryptSecret\(result\.accessToken\)/);
  assert.match(exchange, /encryptSecret\(result\.refreshToken\)/);
  assert.match(delegatedOAuth, /refreshMcpOAuthToken/);
  assert.match(delegatedOAuth, /status:\s*"expired"/);
  assert.match(delegatedOAuth, /REFRESH_WINDOW_MS/);
});

test("admin pages do not serialize primary secret fields back to the browser", () => {
  const llmPage = read("src/app/admin/llm/page.tsx");
  const mcpPage = read("src/app/admin/mcp/page.tsx");

  assert.match(llmPage, /delete credentials\.apiKey/);
  assert.match(llmPage, /delete credentials\.secretKey/);
  assert.match(mcpPage, /oauthClientSecret:\s*null/);
  assert.match(mcpPage, /sharedSecret:\s*null/);
});
