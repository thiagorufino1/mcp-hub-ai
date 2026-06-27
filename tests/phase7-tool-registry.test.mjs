import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("tool registry schema has uniqueness and critical query indexes", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read(
    "prisma/migrations/20260620230221_add_mcp_tool_registry/migration.sql",
  );

  assert.match(schema, /model McpToolRegistry/);
  assert.match(schema, /@@unique\(\[mcpServerId, name\]\)/);
  assert.match(schema, /@@index\(\[mcpServerId, enabled\]\)/);
  assert.match(
    migration,
    /CREATE INDEX "McpToolRegistry_mcpServerId_enabled_idx"/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \("mcpServerId"\).*ON DELETE CASCADE/,
  );
});

test("registry cache persists snapshots and tracks MCP health", () => {
  const registry = read("src/lib/mcp-tool-registry.ts");

  assert.match(registry, /DEFAULT_CACHE_TTL_MS/);
  assert.match(registry, /prisma\.mcpToolRegistry\.upsert/);
  assert.match(registry, /schemaHash:\s*hashTool\(tool\)/);
  assert.match(registry, /healthStatus:\s*"connected"/);
  assert.match(registry, /consecutiveFailures:\s*\{\s*increment:\s*1\s*\}/);
});

test("chat and proxy resolve tools through the persistent registry", () => {
  const chat = read("src/app/api/chat/route.ts");
  const proxy = read("src/app/api/mcp/proxy/route.ts");

  assert.match(chat, /resolveMcpServerTools/);
  assert.doesNotMatch(chat, /MCP_CHAT_SERVER_CACHE_TTL_MS/);
  assert.match(proxy, /resolveMcpServerTools/);
  assert.match(proxy, /isRegisteredToolEnabled/);
});

test("admin can configure registered tool permissions", () => {
  const actions = read("src/app/admin/mcp/actions.ts");
  const client = read("src/app/admin/mcp/client.tsx");

  assert.match(actions, /setMcpToolPermission/);
  assert.match(actions, /prisma\.mcpToolRegistry\.updateMany/);
  assert.match(client, /MCP Servers/);
  assert.match(client, /Enabled/);
  assert.match(client, /Tools/);
  assert.match(client, /Actions/);
});

test("tool permissions persist allow, approval and blocked modes", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read(
    "prisma/migrations/20260621021500_add_mcp_tool_permission_mode/migration.sql",
  );

  assert.match(schema, /permissionMode\s+String\s+@default\("allow"\)/);
  assert.match(migration, /ADD COLUMN "permissionMode"/);
  assert.match(migration, /SET "permissionMode" = 'blocked'/);
});
