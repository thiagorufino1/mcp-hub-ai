-- Preserve the oldest default LLM and clear any duplicate defaults.
WITH ranked_defaults AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS default_rank
  FROM "LlmConfig"
  WHERE "isDefault" = true
)
UPDATE "LlmConfig"
SET "isDefault" = false
WHERE "id" IN (
  SELECT "id"
  FROM ranked_defaults
  WHERE default_rank > 1
);

-- PostgreSQL partial unique index: at most one row may be the global default.
CREATE UNIQUE INDEX "LlmConfig_single_default_idx"
ON "LlmConfig" ("isDefault")
WHERE "isDefault" = true;
