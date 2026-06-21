-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT,
    "model" TEXT,
    "maxSteps" INTEGER NOT NULL DEFAULT 6,
    "approvalMode" TEXT NOT NULL DEFAULT 'risk_based',
    "conversationStarters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "llmConfigId" TEXT,
    "namespaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpNamespace" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpNamespace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NamespaceMcpServer" (
    "id" TEXT NOT NULL,
    "namespaceId" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "alias" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NamespaceMcpServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NamespaceTool" (
    "id" TEXT NOT NULL,
    "namespaceId" TEXT NOT NULL,
    "registryToolId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NamespaceTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_WorkspaceUsers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_WorkspaceUsers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SkillToWorkspace" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SkillToWorkspace_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EntraGroupToWorkspace" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EntraGroupToWorkspace_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EntraGroupToMcpNamespace" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EntraGroupToMcpNamespace_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_NamespaceUsers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NamespaceUsers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_enabled_isDefault_idx" ON "Workspace"("enabled", "isDefault");

-- CreateIndex
CREATE INDEX "Workspace_llmConfigId_idx" ON "Workspace"("llmConfigId");

-- CreateIndex
CREATE INDEX "Workspace_namespaceId_idx" ON "Workspace"("namespaceId");

-- CreateIndex
CREATE UNIQUE INDEX "McpNamespace_slug_key" ON "McpNamespace"("slug");

-- CreateIndex
CREATE INDEX "McpNamespace_enabled_published_idx" ON "McpNamespace"("enabled", "published");

-- CreateIndex
CREATE INDEX "NamespaceMcpServer_mcpServerId_idx" ON "NamespaceMcpServer"("mcpServerId");

-- CreateIndex
CREATE INDEX "NamespaceMcpServer_namespaceId_enabled_displayOrder_idx" ON "NamespaceMcpServer"("namespaceId", "enabled", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "NamespaceMcpServer_namespaceId_mcpServerId_key" ON "NamespaceMcpServer"("namespaceId", "mcpServerId");

-- CreateIndex
CREATE INDEX "NamespaceTool_registryToolId_idx" ON "NamespaceTool"("registryToolId");

-- CreateIndex
CREATE INDEX "NamespaceTool_namespaceId_enabled_idx" ON "NamespaceTool"("namespaceId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "NamespaceTool_namespaceId_registryToolId_key" ON "NamespaceTool"("namespaceId", "registryToolId");

-- CreateIndex
CREATE UNIQUE INDEX "NamespaceTool_namespaceId_alias_key" ON "NamespaceTool"("namespaceId", "alias");

-- CreateIndex
CREATE INDEX "_WorkspaceUsers_B_index" ON "_WorkspaceUsers"("B");

-- CreateIndex
CREATE INDEX "_SkillToWorkspace_B_index" ON "_SkillToWorkspace"("B");

-- CreateIndex
CREATE INDEX "_EntraGroupToWorkspace_B_index" ON "_EntraGroupToWorkspace"("B");

-- CreateIndex
CREATE INDEX "_EntraGroupToMcpNamespace_B_index" ON "_EntraGroupToMcpNamespace"("B");

-- CreateIndex
CREATE INDEX "_NamespaceUsers_B_index" ON "_NamespaceUsers"("B");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_llmConfigId_fkey" FOREIGN KEY ("llmConfigId") REFERENCES "LlmConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_namespaceId_fkey" FOREIGN KEY ("namespaceId") REFERENCES "McpNamespace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NamespaceMcpServer" ADD CONSTRAINT "NamespaceMcpServer_namespaceId_fkey" FOREIGN KEY ("namespaceId") REFERENCES "McpNamespace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NamespaceMcpServer" ADD CONSTRAINT "NamespaceMcpServer_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NamespaceTool" ADD CONSTRAINT "NamespaceTool_namespaceId_fkey" FOREIGN KEY ("namespaceId") REFERENCES "McpNamespace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NamespaceTool" ADD CONSTRAINT "NamespaceTool_registryToolId_fkey" FOREIGN KEY ("registryToolId") REFERENCES "McpToolRegistry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WorkspaceUsers" ADD CONSTRAINT "_WorkspaceUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WorkspaceUsers" ADD CONSTRAINT "_WorkspaceUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SkillToWorkspace" ADD CONSTRAINT "_SkillToWorkspace_A_fkey" FOREIGN KEY ("A") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SkillToWorkspace" ADD CONSTRAINT "_SkillToWorkspace_B_fkey" FOREIGN KEY ("B") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EntraGroupToWorkspace" ADD CONSTRAINT "_EntraGroupToWorkspace_A_fkey" FOREIGN KEY ("A") REFERENCES "EntraGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EntraGroupToWorkspace" ADD CONSTRAINT "_EntraGroupToWorkspace_B_fkey" FOREIGN KEY ("B") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EntraGroupToMcpNamespace" ADD CONSTRAINT "_EntraGroupToMcpNamespace_A_fkey" FOREIGN KEY ("A") REFERENCES "EntraGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EntraGroupToMcpNamespace" ADD CONSTRAINT "_EntraGroupToMcpNamespace_B_fkey" FOREIGN KEY ("B") REFERENCES "McpNamespace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NamespaceUsers" ADD CONSTRAINT "_NamespaceUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "McpNamespace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NamespaceUsers" ADD CONSTRAINT "_NamespaceUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
