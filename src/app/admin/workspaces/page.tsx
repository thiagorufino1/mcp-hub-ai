import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { WorkspacesAdminClient } from "./client";

export const metadata = { title: "Workspaces & Namespaces — Admin" };

export default async function WorkspacesAdminPage() {
  await requireAdmin();
  const [workspaces, namespaces, groups, users, skills, llms, registryTools] =
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
          tools: {
            orderBy: { alias: "asc" },
            select: {
              alias: true,
              description: true,
              displayName: true,
              registryToolId: true,
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
      prisma.mcpToolRegistry.findMany({
        where: { enabled: true, mcpServer: { enabled: true } },
        orderBy: [{ mcpServer: { name: "asc" } }, { name: "asc" }],
        include: { mcpServer: { select: { name: true } } },
      }),
    ]);

  return (
    <WorkspacesAdminClient
      groups={groups}
      llms={llms}
      namespaces={namespaces}
      registryTools={registryTools.map((tool) => ({
        description: tool.description,
        displayName: tool.displayName,
        id: tool.id,
        name: tool.name,
        serverName: tool.mcpServer.name,
      }))}
      skills={skills}
      users={users}
      workspaces={workspaces}
    />
  );
}
