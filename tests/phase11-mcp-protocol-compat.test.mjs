import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminForm = await readFile(
  new URL("../src/components/admin/mcp-form.tsx", import.meta.url),
  "utf8",
);
const oauth = await readFile(
  new URL("../src/lib/mcp-oauth.ts", import.meta.url),
  "utf8",
);
const client = await readFile(
  new URL("../src/lib/mcp-client.ts", import.meta.url),
  "utf8",
);
const connections = await readFile(
  new URL("../src/app/connections/client.tsx", import.meta.url),
  "utf8",
);

test("admin MCP form models protocol transports and delegated OAuth", () => {
  assert.match(adminForm, /streamable-http/);
  assert.match(adminForm, /SSE \(Legacy\)/);
  assert.match(adminForm, /oauth_delegated/);
  assert.doesNotMatch(adminForm, /Shared OAuth/);
  assert.doesNotMatch(adminForm, /Shared key/);
});

test("MCP OAuth uses PKCE and resource indicators", () => {
  assert.match(oauth, /code_challenge_method/);
  assert.match(oauth, /url\.searchParams\.set\("resource"/);
  assert.match(oauth, /resource: args\.resourceUrl/);
  assert.match(oauth, /resource: oauth\.resourceUrl/);
});

test("remote MCP client supports Streamable HTTP with legacy SSE fallback", () => {
  assert.match(client, /StreamableHTTPClientTransport/);
  assert.match(client, /supportsLegacySseFallback/);
  assert.match(client, /SSEClientTransport/);
});

test("delegated MCP connections expose a link action to the user", () => {
  assert.match(connections, /Vincular/);
  assert.match(connections, /Desvincular/);
});
