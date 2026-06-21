import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NamespacesAdminClient } from "./client";

export const metadata = { title: "Namespaces — Admin" };

export default async function AdminNamespacesPage() {
  await requireAdmin();

  const [namespaces, groups, users, mcpServers] = await Promise.all([
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
    prisma.mcpServer.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, transport: true },
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
      }))}
      users={users}
    />
  );
}
