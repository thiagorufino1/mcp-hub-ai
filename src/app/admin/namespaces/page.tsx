import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NamespacesAdminClient } from "./client";

export const metadata = { title: "Namespaces - Administração" };

export default async function AdminNamespacesPage() {
  await requireAdmin();

  const [namespaces, groups, users, mcpServers, nsStats] = await Promise.all([
    prisma.mcpNamespace.findMany({
      orderBy: { name: "asc" },
      include: {
        groups: { select: { id: true, displayName: true } },
        users: { select: { id: true, name: true, email: true } },
        tools: { select: { id: true } },
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
    prisma.mcpServer.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, transport: true },
    }),
    prisma.mcpNamespace.aggregate({ _count: { id: true }, where: {} }).then(async (total) => {
      const [enabled, published, mcpLinks, toolLinks] = await Promise.all([
        prisma.mcpNamespace.count({ where: { enabled: true } }),
        prisma.mcpNamespace.count({ where: { published: true } }),
        prisma.namespaceMcpServer.count({ where: { enabled: true } }),
        prisma.namespaceTool.count({ where: { enabled: true } }),
      ]);
      return {
        total: total._count.id,
        enabled,
        disabled: total._count.id - enabled,
        published,
        unpublished: total._count.id - published,
        mcpLinks,
        toolLinks,
      };
    }),
  ]);

  return (
    <NamespacesAdminClient
      groups={groups}
      mcpServers={mcpServers}
      namespaces={namespaces.map((ns) => ({
        ...ns,
        allUsers: ns.groups.length === 0 && ns.users.length === 0,
        mcpServerIds: ns.servers.map((s) => s.mcpServerId),
        toolsCount: ns.tools.length,
      }))}
      users={users}
      stats={nsStats}
    />
  );
}
