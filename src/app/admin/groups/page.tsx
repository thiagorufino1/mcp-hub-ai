import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { GroupsAdminClient } from "./client";

export const metadata = { title: "Groups — Admin" };

export default async function AdminGroupsPage() {
  await requireAdmin();

  const [groups, mcpOptions, skillOptions] = await Promise.all([
    prisma.entraGroup.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        policy: {
          include: {
            mcpServers: { select: { id: true, name: true } },
            skills: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.mcpServer.findMany({ where: { enabled: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.skill.findMany({ where: { enabled: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return <GroupsAdminClient groups={groups} mcpOptions={mcpOptions} skillOptions={skillOptions} />;
}
