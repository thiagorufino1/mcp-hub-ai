ALTER TABLE "McpToolRegistry"
ADD COLUMN "permissionMode" TEXT NOT NULL DEFAULT 'allow';

UPDATE "McpToolRegistry"
SET "permissionMode" = 'blocked'
WHERE "enabled" = false;
