import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { getUserContext } from "@/lib/user-context";
import { ConnectionsClient } from "./client";
import { PortalShell } from "@/components/layout/portal-shell";

export const metadata = { title: "My Connections — MCP Hub" };

export default async function ConnectionsPage() {
  const user = await requireAuth();

  const context = await getUserContext(user.groups ?? [], undefined, user.id);

  const delegatedDbMcps = await prisma.mcpServer.findMany({
    where: {
      id: { in: context.mcpServers.map((s) => s.id) },
      authType: "oauth_delegated",
      enabled: true,
    },
    select: { id: true, name: true, description: true, url: true },
  });

  const connections = await prisma.userMcpConnection.findMany({
    where: { userId: user.id, mcpServerId: { in: delegatedDbMcps.map((m) => m.id) } },
    select: { expiresAt: true, mcpServerId: true, status: true, updatedAt: true },
  });

  const connectionMap = new Map(connections.map((c) => [c.mcpServerId, c]));

  const items = delegatedDbMcps.map((mcp) => ({
    id: mcp.id,
    name: mcp.name,
    description: mcp.description,
    url: mcp.url,
    connection: (() => {
      const connection = connectionMap.get(mcp.id);
      if (!connection) return null;
      return {
        status:
          connection.status === "connected" &&
          connection.expiresAt &&
          connection.expiresAt <= new Date()
            ? "expired"
            : connection.status,
        updatedAt: connection.updatedAt,
      };
    })(),
  }));

  return (
    <PortalShell isAdmin={user.isAdmin} section="My Connections" userName={user.name}>
      <ConnectionsClient items={items} />
    </PortalShell>
  );
}
