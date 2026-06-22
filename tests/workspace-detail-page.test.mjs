import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const listClient = await readFile(
  new URL("../src/app/admin/workspaces/client.tsx", import.meta.url),
  "utf8",
);
const detailPage = await readFile(
  new URL("../src/app/admin/workspaces/[id]/page.tsx", import.meta.url),
  "utf8",
);
const detailClient = await readFile(
  new URL("../src/app/admin/workspaces/[id]/client.tsx", import.meta.url),
  "utf8",
);
const detailActions = await readFile(
  new URL("../src/app/admin/workspaces/[id]/actions.ts", import.meta.url),
  "utf8",
);

test("workspace list links names and edit actions to workspace details", () => {
  assert.match(listClient, /href=\{`\/admin\/workspaces\/\$\{ws\.id\}`\}/);
  assert.match(listClient, /hover:underline/);
});

test("workspace detail exposes configuration, skills, access and settings", () => {
  assert.match(detailPage, /WorkspaceDetailClient/);
  assert.match(detailClient, /Edit workspace/);
  assert.match(detailClient, /Edit system prompt/);
  assert.match(detailClient, /<h2 className="text-base font-semibold">LLM<\/h2>/);
  assert.match(detailClient, /<h2 className="text-base font-semibold">Namespace<\/h2>/);
  assert.match(detailClient, /<th className="px-4 py-3">Description<\/th>/);
  assert.match(detailClient, /<th className="px-4 py-3">Provider<\/th>/);
  assert.match(detailClient, /<th className="px-4 py-3 text-center">Last sync<\/th>/);
  assert.match(detailClient, /<th className="px-4 py-3 text-center">Action<\/th>/);
  assert.match(detailClient, /ProviderLogo/);
  assert.match(detailClient, /Sync LLM status/);
  assert.match(detailClient, /Edit LLM/);
  assert.match(detailClient, /Edit namespace/);
  assert.match(detailClient, /title="Skills"/);
  assert.match(detailClient, /Access control/);
  assert.match(detailClient, /<h2 className="text-base font-semibold">Settings<\/h2>/);
  assert.match(detailClient, /Available to all authenticated users/);
});

test("workspace detail mutations authenticate, audit and scope writes", () => {
  assert.match(detailActions, /requireAdmin\(\)/);
  assert.match(detailActions, /addWorkspaceSkill/);
  assert.match(detailActions, /addWorkspaceGroup/);
  assert.match(detailActions, /groups: \{ set: \[\] \}, users: \{ set: \[\] \}/);
  assert.match(detailActions, /tx\.workspace\.updateMany/);
  assert.match(detailActions, /revalidatePath\(`\/admin\/workspaces\/\$\{id\}`\)/);
});
