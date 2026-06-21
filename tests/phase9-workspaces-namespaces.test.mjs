import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const workspaceContext = await readFile(new URL("../src/lib/workspace-context.ts", import.meta.url), "utf8");
const namespaceContext = await readFile(new URL("../src/lib/mcp-namespace.ts", import.meta.url), "utf8");
const namespaceRoute = await readFile(new URL("../src/app/api/mcp/namespaces/[slug]/route.ts", import.meta.url), "utf8");
const chatRoute = await readFile(new URL("../src/app/api/chat/route.ts", import.meta.url), "utf8");
const adminActions = await readFile(new URL("../src/app/admin/workspaces/actions.ts", import.meta.url), "utf8");
const settingsClient = await readFile(new URL("../src/app/settings/client.tsx", import.meta.url), "utf8");

test("workspace and namespace schema supports RBAC, curated servers and aliased tools", () => {
  assert.match(schema, /model Workspace/);
  assert.match(schema, /model McpNamespace/);
  assert.match(schema, /model NamespaceMcpServer/);
  assert.match(schema, /model NamespaceTool/);
  assert.match(schema, /@@unique\(\[namespaceId, alias\]\)/);
  assert.match(schema, /users\s+User\[\]\s+@relation\("WorkspaceUsers"\)/);
  assert.match(schema, /groups\s+EntraGroup\[\]/);
});

test("workspace resolution enforces audience and limits tools to its namespace", () => {
  assert.match(workspaceContext, /canAccess\(workspace, userId, entraGroups\)/);
  assert.match(workspaceContext, /approvalMode: "selected"/);
  assert.match(workspaceContext, /approvedToolNames: tools\.map/);
  assert.match(workspaceContext, /resolveDelegatedAuthorizationHeaders/);
});

test("published namespace endpoint authenticates and executes through governance", () => {
  assert.match(namespaceRoute, /resolveTokenUser/);
  assert.match(namespaceRoute, /resolveAccessibleNamespace/);
  assert.match(namespaceRoute, /executeGovernedMcpTool/);
  assert.match(namespaceRoute, /source: "namespace"/);
  assert.match(namespaceRoute, /CHARACTER_LIMIT = 25_000/);
  assert.match(namespaceContext, /published: true/);
});

test("chat accepts a workspace and applies its prompt, model, skills, tools and step limit", () => {
  assert.match(chatRoute, /workspaceId: z\.string/);
  assert.match(chatRoute, /resolveWorkspaceContext/);
  assert.match(chatRoute, /workspaceSystemPrompt/);
  assert.match(chatRoute, /stepCountIs\(body\.maxSteps \?\? 6\)/);
});

test("admin composes namespaces and exports client-ready configurations", () => {
  assert.match(adminActions, /normalizeToolAlias/);
  assert.match(adminActions, /Tool aliases must be unique/);
  assert.match(adminActions, /conversationStarters/);
  assert.match(settingsClient, /Claude Desktop and Cursor configuration/);
  assert.match(settingsClient, /VS Code `\.vscode\/mcp\.json`/);
});
