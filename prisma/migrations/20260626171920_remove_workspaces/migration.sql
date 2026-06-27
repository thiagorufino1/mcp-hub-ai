-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT IF EXISTS "Workspace_llmConfigId_fkey";

-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT IF EXISTS "Workspace_namespaceId_fkey";

-- DropTable
DROP TABLE IF EXISTS "_WorkspaceUsers";

-- DropTable
DROP TABLE IF EXISTS "_EntraGroupToWorkspace";

-- DropTable (CASCADE removes _SkillToWorkspace FK before remove_skills migration runs)
DROP TABLE IF EXISTS "Workspace" CASCADE;
