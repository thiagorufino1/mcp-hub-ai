-- AlterTable
ALTER TABLE "McpServer" ADD COLUMN     "oauthClientId" TEXT,
ADD COLUMN     "oauthClientSecret" TEXT,
ADD COLUMN     "oauthScopes" TEXT;

-- CreateTable
CREATE TABLE "UserMcpConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMcpConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMcpConnection_userId_mcpServerId_key" ON "UserMcpConnection"("userId", "mcpServerId");

-- AddForeignKey
ALTER TABLE "UserMcpConnection" ADD CONSTRAINT "UserMcpConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMcpConnection" ADD CONSTRAINT "UserMcpConnection_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
