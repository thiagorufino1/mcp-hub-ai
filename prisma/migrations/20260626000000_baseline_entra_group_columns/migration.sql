-- Baseline migration: columns that exist in the database but were missing from migration history
-- These columns were added directly to the DB during development

ALTER TABLE "EntraGroup" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "EntraGroup" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);
ALTER TABLE "EntraGroup" ADD COLUMN IF NOT EXISTS "memberCount" INTEGER NOT NULL DEFAULT 0;
