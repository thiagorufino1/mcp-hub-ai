-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_llmConfigId_fkey";

-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_namespaceId_fkey";

-- DropTable
DROP TABLE IF EXISTS "_WorkspaceUsers";

-- DropTable
DROP TABLE IF EXISTS "_EntraGroupToWorkspace";

-- DropTable
DROP TABLE "Workspace";
