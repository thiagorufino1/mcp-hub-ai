import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { PortalShell } from "@/components/layout/portal-shell";
import { WorkspacesClient } from "./client";

export const metadata = { title: "Workspaces — MCP Hub" };

export default async function WorkspacesPage() {
  const user = await requireAuth();

  const workspaces = await prisma.workspace.findMany({
    where: {
      enabled: true,
      OR: [
        // All authenticated users (no group or user restrictions)
        { AND: [{ groups: { none: {} } }, { users: { none: {} } }] },
        // User is in an assigned Entra group
        ...(user.groups && user.groups.length > 0
          ? [{ groups: { some: { entraGroupId: { in: user.groups } } } }]
          : []),
        // User directly assigned
        { users: { some: { id: user.id } } },
      ],
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isDefault: true,
      conversationStarters: true,
      llmConfig: {
        select: { displayName: true, provider: true },
      },
      _count: {
        select: { skills: { where: { enabled: true } } },
      },
      namespace: {
        select: { name: true, alias: true },
      },
    },
  });

  const items = workspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    description: ws.description,
    isDefault: ws.isDefault,
    conversationStarters: ws.conversationStarters,
    llmProvider: ws.llmConfig?.provider ?? null,
    llmName: ws.llmConfig?.displayName ?? null,
    skillCount: ws._count.skills,
    namespaceName: ws.namespace?.name ?? null,
    namespaceAlias: ws.namespace?.alias ?? null,
  }));

  return (
    <PortalShell isAdmin={user.isAdmin} section="Workspaces" showUserNavigation userName={user.name}>
      <WorkspacesClient items={items} />
    </PortalShell>
  );
}
