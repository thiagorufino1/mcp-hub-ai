-- AlterTable
ALTER TABLE "McpServer" ADD COLUMN     "circuitCooldownMs" INTEGER NOT NULL DEFAULT 60000,
ADD COLUMN     "circuitOpenedAt" TIMESTAMP(3),
ADD COLUMN     "circuitState" TEXT NOT NULL DEFAULT 'closed',
ADD COLUMN     "connectionTimeoutMs" INTEGER NOT NULL DEFAULT 10000,
ADD COLUMN     "failureThreshold" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "maxConcurrentCalls" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "maxRetries" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "rateLimitRequests" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "rateLimitWindowMs" INTEGER NOT NULL DEFAULT 60000,
ADD COLUMN     "toolTimeoutMs" INTEGER NOT NULL DEFAULT 30000;

-- CreateTable
CREATE TABLE "McpToolExecution" (
    "id" TEXT NOT NULL,
    "mcpServerId" TEXT,
    "actorUserId" TEXT,
    "personalTokenId" TEXT,
    "serverName" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "traceId" TEXT,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "arguments" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpToolExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpToolExecution_mcpServerId_createdAt_idx" ON "McpToolExecution"("mcpServerId", "createdAt");

-- CreateIndex
CREATE INDEX "McpToolExecution_actorUserId_createdAt_idx" ON "McpToolExecution"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "McpToolExecution_personalTokenId_createdAt_idx" ON "McpToolExecution"("personalTokenId", "createdAt");

-- CreateIndex
CREATE INDEX "McpToolExecution_source_createdAt_idx" ON "McpToolExecution"("source", "createdAt");

-- CreateIndex
CREATE INDEX "McpToolExecution_status_createdAt_idx" ON "McpToolExecution"("status", "createdAt");

-- CreateIndex
CREATE INDEX "McpToolExecution_traceId_idx" ON "McpToolExecution"("traceId");

-- AddForeignKey
ALTER TABLE "McpToolExecution" ADD CONSTRAINT "McpToolExecution_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpToolExecution" ADD CONSTRAINT "McpToolExecution_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
