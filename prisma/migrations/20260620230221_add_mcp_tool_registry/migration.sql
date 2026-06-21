-- AlterTable
ALTER TABLE "McpServer" ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "lastHealthCheckAt" TIMESTAMP(3),
ADD COLUMN     "lastLatencyMs" INTEGER;

-- CreateTable
CREATE TABLE "McpToolRegistry" (
    "id" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "inputSchema" JSONB NOT NULL DEFAULT '{}',
    "annotations" JSONB NOT NULL DEFAULT '{}',
    "schemaHash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "readOnly" BOOLEAN NOT NULL DEFAULT false,
    "destructive" BOOLEAN NOT NULL DEFAULT false,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpToolRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpToolRegistry_mcpServerId_enabled_idx" ON "McpToolRegistry"("mcpServerId", "enabled");

-- CreateIndex
CREATE INDEX "McpToolRegistry_lastSeenAt_idx" ON "McpToolRegistry"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "McpToolRegistry_mcpServerId_name_key" ON "McpToolRegistry"("mcpServerId", "name");

-- AddForeignKey
ALTER TABLE "McpToolRegistry" ADD CONSTRAINT "McpToolRegistry_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
