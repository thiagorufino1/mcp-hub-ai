import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const userContext = await readFile(new URL("../src/lib/user-context.ts", import.meta.url), "utf8");
const namespaceContext = await readFile(new URL("../src/lib/mcp-namespace.ts", import.meta.url), "utf8");
const namespaceRoute = await readFile(new URL("../src/app/api/mcp/namespaces/[alias]/route.ts", import.meta.url), "utf8");
const chatRoute = await readFile(new URL("../src/app/api/chat/route.ts", import.meta.url), "utf8");
const adminActions = await readFile(new URL("../src/app/admin/namespaces/actions.ts", import.meta.url), "utf8");
const settingsClient = await readFile(new URL("../src/app/settings/client.tsx", import.meta.url), "utf8");

test("namespace schema supports curated servers and aliased tools", () => {
  assert.match(schema, /model McpNamespace/);
  assert.match(schema, /model NamespaceMcpServer/);
  assert.match(schema, /model NamespaceTool/);
  assert.match(schema, /@@unique\(\[namespaceId, alias\]\)/);
  assert.match(schema, /users\s+User\[\]\s+@relation\("NamespaceUsers"\)/);
  assert.match(schema, /groups\s+EntraGroup\[\]/);
});

test("namespace access and user context include public namespaces", () => {
  assert.match(userContext, /groups: \{ none: \{\} \}/);
  assert.match(userContext, /users: \{ none: \{\} \}/);
  assert.match(namespaceContext, /canAccess\(namespace, userId, entraGroups\)/);
  assert.match(namespaceContext, /published: true/);
  assert.match(namespaceContext, /permissionMode: \{ not: "blocked" \}/);
});

test("published namespace endpoint authenticates and executes through governance", () => {
  assert.match(namespaceRoute, /resolveTokenUser/);
  assert.match(namespaceRoute, /resolveAccessibleNamespace/);
  assert.match(namespaceRoute, /executeGovernedMcpTool/);
  assert.match(namespaceRoute, /source: "namespace"/);
  assert.match(namespaceRoute, /CHARACTER_LIMIT = 25_000/);
});

test("chat resolves user context and respects the step limit", () => {
  assert.match(chatRoute, /getUserContext/);
  assert.match(chatRoute, /resolveLiveMcpServers/);
  assert.match(chatRoute, /stepCountIs\(6\)/);
});

test("admin composes namespaces and exports client-ready configurations", () => {
  assert.match(adminActions, /normalizeAlias/);
  assert.match(adminActions, /revalidatePath\(`\/admin\/namespaces\/\$\{savedId\}`\)/);
  assert.match(adminActions, /syncNamespaceToolsForNamespace/);
  assert.match(settingsClient, /Gerencie seus tokens pessoais de acesso ao MCP proxy/);
  assert.match(settingsClient, /Tokens Pessoais/);
  assert.match(settingsClient, /Gerar novo token/);
  assert.match(settingsClient, /Revogar/);
});
