import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { WorkspacesAdminClient } from "./client";

export const metadata = { title: "Workspaces — Admin" };

export default async function WorkspacesAdminPage() {
  await requireAdmin();

  const [workspaces, groups, users, skills, llms, namespaces] = await Promise.all([
    prisma.workspace.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: {
        groups: { select: { id: true, displayName: true } },
        skills: { select: { id: true, name: true } },
        users: { select: { id: true, name: true, email: true } },
        llmConfig: {
          select: {
            displayName: true,
            allowedModels: true,
          },
        },
        namespace: {
          select: {
            id: true,
            name: true,
            alias: true,
            enabled: true,
            _count: {
              select: {
                servers: true,
                tools: true,
              },
            },
          },
        },
      },
    }),
    prisma.entraGroup.findMany({
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
    prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true },
    }),
    prisma.skill.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.llmConfig.findMany({
      where: { enabled: true },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, allowedModels: true },
    }),
    prisma.mcpNamespace.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <WorkspacesAdminClient
      groups={groups}
      llms={llms}
      namespaces={namespaces}
      skills={skills}
      users={users}
      workspaces={workspaces}
    />
  );
}
