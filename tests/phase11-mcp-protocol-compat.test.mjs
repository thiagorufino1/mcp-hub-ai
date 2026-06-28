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
const importLib = await readFile(
  new URL("../src/lib/mcp-import.ts", import.meta.url),
  "utf8",
);
const mcpActions = await readFile(
  new URL("../src/app/admin/mcp/actions.ts", import.meta.url),
  "utf8",
);
const mcpClient = await readFile(
  new URL("../src/app/admin/mcp/client.tsx", import.meta.url),
  "utf8",
);
const mcpDetailPage = await readFile(
  new URL("../src/app/admin/mcp/[id]/page.tsx", import.meta.url),
  "utf8",
);
const mcpDetailClient = await readFile(
  new URL("../src/app/admin/mcp/[id]/client.tsx", import.meta.url),
  "utf8",
);
const importClient = await readFile(
  new URL("../src/app/admin/mcp/import/import-client.tsx", import.meta.url),
  "utf8",
);
const auditPage = await readFile(
  new URL("../src/app/admin/audit/page.tsx", import.meta.url),
  "utf8",
);
const auditClient = await readFile(
  new URL("../src/app/admin/audit/client.tsx", import.meta.url),
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
  assert.match(connections, /Connect/);
  assert.match(connections, /Disconnect/);
  assert.match(connections, /Reconnect/);
});

test("MCP JSON import supports the modern type-based example and auto-syncs", () => {
  assert.match(importLib, /type:\s*z\.string\(\)\.optional\(\)/);
  assert.match(importLib, /resolveMcpImportTransport/);
  assert.match(importLib, /rawTransport === "http"/);
  assert.match(importLib, /return "streamable-http"/);
  assert.match(mcpActions, /await inspectMcpConfig\(created\.id, false\);/);
  assert.match(mcpActions, /headers:\s*encryptSecretJson\(/);
  assert.match(mcpClient, /onImported=\{\(\) => \{\s*router\.refresh\(\);\s*\}\}/s);
});

test("MCP detail edit modal receives decrypted headers", () => {
  assert.match(mcpDetailPage, /decryptSecretJson\(mcp\.headers\)/);
  assert.match(mcpDetailClient, /headers:\s*mcp\.headers/);
});

test("MCP import example includes token, oauth and sse samples", () => {
  assert.match(importClient, /"http-example-token"/);
  assert.match(importClient, /"http-example-oauth"/);
  assert.match(importClient, /"http-example-sse"/);
  assert.match(importClient, /"Authorization": "Bearer your-token"/);
  assert.match(importClient, /"authType": "oauth_delegated"/);
});

test("MCP export uses the import-friendly type field", () => {
  assert.match(mcpActions, /type:\s*exportTransportType\(server\.transport\)/);
  assert.match(mcpActions, /if \(transport === "streamable-http"\) return "http"/);
  assert.doesNotMatch(mcpActions, /transport:\s*server\.transport/);
  assert.doesNotMatch(mcpActions, /enabled:\s*server\.enabled/);
});

test("audit MCP executions show actor email before trace id", () => {
  assert.match(auditPage, /actorUser:\s*{\s*select:\s*{\s*email:\s*true/s);
  assert.match(auditPage, /actorUserEmail:\s*e\.actorUser\?\.email\s*\?\?\s*null/);
  assert.match(auditClient, /exec\.actorUserEmail\s*\?\?\s*exec\.actorUserId\s*\?\?\s*"unknown"/);
});
