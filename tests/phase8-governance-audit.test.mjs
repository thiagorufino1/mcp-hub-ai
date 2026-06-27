import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const governance = await readFile(new URL("../src/lib/mcp-governance.ts", import.meta.url), "utf8");
const chatRoute = await readFile(new URL("../src/app/api/chat/route.ts", import.meta.url), "utf8");
const proxyRoute = await readFile(new URL("../src/app/api/mcp/proxy/route.ts", import.meta.url), "utf8");
const namespaceRoute = await readFile(new URL("../src/app/api/mcp/namespaces/[alias]/route.ts", import.meta.url), "utf8");
const auditPage = await readFile(new URL("../src/app/admin/audit/page.tsx", import.meta.url), "utf8");

test("governance schema persists runtime policy and indexed execution audits", () => {
  assert.match(schema, /model McpToolExecution/);
  assert.match(schema, /@@index\(\[mcpServerId, createdAt\]\)/);
  assert.match(schema, /@@index\(\[actorUserId, createdAt\]\)/);
  assert.match(schema, /toolTimeoutMs\s+Int\s+@default\(30000\)/);
  assert.match(schema, /failureThreshold\s+Int\s+@default\(3\)/);
  assert.match(schema, /rateLimitRequests\s+Int\s+@default\(60\)/);
});

test("governed executor enforces timeout, safe retry, circuit, concurrency, rate limits and redaction", () => {
  assert.match(governance, /policy\.readOnly \? policy\.maxRetries : 0/);
  assert.match(governance, /enforceCircuit\(policy\)/);
  assert.match(governance, /enforceRateLimit\(rateKey, policy\)/);
  assert.match(governance, /acquireConcurrency\(concurrencyKey/);
  assert.match(governance, /withTimeout\(/);
  assert.match(governance, /\[REDACTED\]/);
  assert.match(governance, /prisma\.mcpToolExecution\.create/);
});

test("all MCP execution entry points use the governed executor", () => {
  for (const source of [chatRoute, proxyRoute, namespaceRoute]) {
    assert.match(source, /executeGovernedMcpTool/);
    assert.doesNotMatch(source, /executeMcpTool\(/);
  }
});

test("admin exposes execution audit metrics and recent events", () => {
  assert.match(auditPage, /mcpToolExecution\.findMany/);
  assert.match(auditPage, /averageLatency/);
  assert.match(auditPage, /total24h/);
  assert.match(auditPage, /failures24h/);
});
