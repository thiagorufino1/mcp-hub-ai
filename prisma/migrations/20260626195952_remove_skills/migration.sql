-- DropForeignKey
ALTER TABLE "_AccessPolicyToSkill" DROP CONSTRAINT "_AccessPolicyToSkill_A_fkey";

-- DropForeignKey
ALTER TABLE "_AccessPolicyToSkill" DROP CONSTRAINT "_AccessPolicyToSkill_B_fkey";

-- DropForeignKey
ALTER TABLE "_SkillToWorkspace" DROP CONSTRAINT "_SkillToWorkspace_A_fkey";

-- DropForeignKey
ALTER TABLE "_SkillToWorkspace" DROP CONSTRAINT "_SkillToWorkspace_B_fkey";

-- DropTable
DROP TABLE "_AccessPolicyToSkill";

-- DropTable
DROP TABLE "_SkillToWorkspace";

-- DropTable
DROP TABLE "Skill";
