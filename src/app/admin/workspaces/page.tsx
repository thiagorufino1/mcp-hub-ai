import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { WorkspacesAdminClient } from "./client";

export const metadata = { title: "Workspaces & Namespaces — Admin" };

export default async function WorkspacesAdminPage() {
  await requireAdmin();
  const [workspaces, namespaces, groups, users, skills, llms, mcpServers] =
    await Promise.all([
      prisma.workspace.findMany({
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        include: {
          groups: { select: { id: true, displayName: true } },
          skills: { select: { id: true, name: true } },
          users: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.mcpNamespace.findMany({
        orderBy: { name: "asc" },
        include: {
          groups: { select: { id: true, displayName: true } },
          users: { select: { id: true, name: true, email: true } },
          servers: { select: { mcpServerId: true } },
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
      prisma.mcpServer.findMany({
        where: { enabled: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, description: true, transport: true },
      }),
    ]);

  return (
    <WorkspacesAdminClient
      groups={groups}
      llms={llms}
      mcpServers={mcpServers}
      namespaces={namespaces.map((ns) => ({
        ...ns,
        allUsers: ns.groups.length === 0 && ns.users.length === 0,
        mcpServerIds: ns.servers.map((s) => s.mcpServerId),
      }))}
      skills={skills}
      users={users}
      workspaces={workspaces}
    />
  );
}
