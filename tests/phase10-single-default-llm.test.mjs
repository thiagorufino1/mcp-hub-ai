import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const actions = await readFile(
  new URL("../src/app/admin/llm/actions.ts", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL(
    "../prisma/migrations/20260621013000_enforce_single_default_llm/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

test("LLM administrative writes replace the previous global default transactionally", () => {
  assert.match(actions, /prisma\.\$transaction\(async \(tx\) =>/);
  assert.match(actions, /tx\.llmConfig\.updateMany/);
  assert.match(actions, /data: \{ isDefault: false \}/);
  assert.match(actions, /isDefault,/);
});

test("database prevents multiple default LLM configurations", () => {
  assert.match(migration, /ROW_NUMBER\(\) OVER/);
  assert.match(migration, /CREATE UNIQUE INDEX "LlmConfig_single_default_idx"/);
  assert.match(migration, /WHERE "isDefault" = true/);
});
