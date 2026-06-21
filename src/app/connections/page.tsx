import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { getUserContext } from "@/lib/user-context";
import { ConnectionsClient } from "./client";
import { PortalShell } from "@/components/layout/portal-shell";

export const metadata = { title: "My Connections — MCP Hub" };

export default async function ConnectionsPage() {
  const user = await requireAuth();

  // 1. MCPs via AccessPolicy (groups)
  const context = await getUserContext(user.groups ?? [], undefined, user.id);
  const policyMcpIds = new Set(context.mcpServers.map((s) => s.id));

  // 2. MCPs via workspaces the user has access to → namespace → servers
  const accessibleWorkspaces = await prisma.workspace.findMany({
    where: {
      enabled: true,
      OR: [
        { groups: { some: { entraGroupId: { in: user.groups ?? [] } } } },
        { users: { some: { id: user.id } } },
        // no groups/users = open to all
        { AND: [{ groups: { none: {} } }, { users: { none: {} } }] },
      ],
    },
    select: { namespaceId: true },
  });

  const namespaceIds = accessibleWorkspaces
    .map((w) => w.namespaceId)
    .filter((id): id is string => id !== null);

  const namespaceMcpIds: string[] = [];
  if (namespaceIds.length > 0) {
    const nsServers = await prisma.namespaceMcpServer.findMany({
      where: { namespaceId: { in: namespaceIds }, enabled: true },
      select: { mcpServerId: true },
    });
    namespaceMcpIds.push(...nsServers.map((s) => s.mcpServerId));
  }

  // 3. Merge all unique MCP ids
  const allMcpIds = [...new Set([...policyMcpIds, ...namespaceMcpIds])];

  // 4. Fetch full MCP records with tool count from registry
  const allMcps = await prisma.mcpServer.findMany({
    where: { id: { in: allMcpIds }, enabled: true },
    select: {
      id: true,
      name: true,
      description: true,
      transport: true,
      url: true,
      authType: true,
      _count: { select: { registryTools: { where: { enabled: true } } } },
    },
    orderBy: { name: "asc" },
  });

  // 5. Fetch user's existing OAuth connections
  const oauthIds = allMcps
    .filter((m) => m.authType === "oauth_delegated")
    .map((m) => m.id);

  const [connections, preferences] = await Promise.all([
    oauthIds.length > 0
      ? prisma.userMcpConnection.findMany({
          where: { userId: user.id, mcpServerId: { in: oauthIds } },
          select: { mcpServerId: true, status: true, updatedAt: true, expiresAt: true },
        })
      : [],
    prisma.userMcpPreference.findMany({
      where: { userId: user.id, mcpServerId: { in: allMcpIds } },
      select: { mcpServerId: true, enabled: true },
    }),
  ]);

  const connectionMap = new Map(connections.map((c) => [c.mcpServerId, c]));
  const preferenceMap = new Map(preferences.map((p) => [p.mcpServerId, p.enabled]));

  const items = allMcps.map((mcp) => {
    const conn = connectionMap.get(mcp.id) ?? null;
    const isExpired = conn?.expiresAt && conn.expiresAt <= new Date();
    return {
      id: mcp.id,
      name: mcp.name,
      description: mcp.description,
      transport: mcp.transport,
      authType: mcp.authType,
      toolCount: mcp._count.registryTools,
      userEnabled: preferenceMap.get(mcp.id) ?? true,
      connection: conn
        ? {
            status: conn.status === "connected" && isExpired ? "expired" : conn.status,
            updatedAt: conn.updatedAt,
          }
        : null,
    };
  });

  return (
    <PortalShell isAdmin={user.isAdmin} section="My Connections" userName={user.name}>
      <ConnectionsClient items={items} />
    </PortalShell>
  );
}
