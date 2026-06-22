import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("namespace list links to the namespace detail page", async () => {
  const source = await read("src/app/admin/namespaces/client.tsx");

  assert.match(source, /href=\{`\/admin\/namespaces\/\$\{ns\.id\}`\}/);
});

test("namespace detail exposes endpoint, server toggles and tool permissions", async () => {
  const source = await read("src/app/admin/namespaces/[id]/client.tsx");

  assert.match(source, /Copy namespace endpoint URL/);
  assert.match(source, /setNamespaceMcpEnabled/);
  assert.match(source, /setNamespaceToolEnabled/);
  assert.match(source, /This toggle only affects this namespace/);
  assert.match(source, /sourcePermissionMode/);
});

test("namespace detail mutations authenticate and scope writes to the namespace", async () => {
  const source = await read("src/app/admin/namespaces/[id]/actions.ts");

  assert.match(source, /await requireAdmin\(\)/);
  assert.match(source, /where: \{ namespaceId, mcpServerId \}/);
  assert.match(source, /prisma\.namespaceTool\.updateMany/);
  assert.match(source, /logAudit\(/);
});
