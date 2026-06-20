import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { SkillsAdminClient } from "./client";

export const metadata = { title: "Skills — Admin" };

export default async function AdminSkillsPage() {
  await requireAdmin();
  const skills = await prisma.skill.findMany({ orderBy: { createdAt: "asc" } });
  return <SkillsAdminClient skills={skills} />;
}
