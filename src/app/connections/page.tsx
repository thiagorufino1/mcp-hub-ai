import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { getUserContext, dbMcpToConfig } from "@/lib/user-context";
import { resolveMcpServerTools } from "@/lib/mcp-tool-registry";
import { resolveDelegatedAuthorizationHeaders } from "@/lib/delegated-oauth";
import { ConnectionsClient } from "./client";
import { PortalShell } from "@/components/layout/portal-shell";

export const metadata = { title: "My Connections — MCP Hub" };

export default async function ConnectionsPage() {
  const user = await requireAuth();

  // 1. All MCPs the user has access to via namespaces, ignoring user preferences
  //    getUserContext removes disabled servers — My Connections must show them all so user can re-enable.
  const context = await getUserContext(user.groups ?? [], undefined, user.id);
  const [accessibleNamespaces2] = await Promise.all([
    prisma.mcpNamespace.findMany({
      where: {
        enabled: true,
        OR: [
          ...(user.groups && user.groups.length > 0 ? [{ groups: { some: { entraGroupId: { in: user.groups } } } }] : []),
          { users: { some: { id: user.id } } },
          { AND: [{ groups: { none: {} } }, { users: { none: {} } }] },
        ],
      },
      include: {
        servers: { where: { enabled: true, mcpServer: { enabled: true } }, select: { mcpServerId: true } },
      },
    }),
  ]);
  const allMcpIdSet = new Set<string>();
  for (const ns of accessibleNamespaces2) ns.servers.forEach((s) => allMcpIdSet.add(s.mcpServerId));
  const allMcpIds = [...allMcpIdSet];

  // 2. Accessible namespaces (for endpoint display)
  const accessibleNamespaces = await prisma.mcpNamespace.findMany({
    where: {
      enabled: true,
      OR: [
        ...(user.groups && user.groups.length > 0
          ? [{ groups: { some: { entraGroupId: { in: user.groups } } } }]
          : []),
        { users: { some: { id: user.id } } },
        { AND: [{ groups: { none: {} } }, { users: { none: {} } }] },
      ],
    },
    select: {
      id: true,
      alias: true,
      name: true,
      description: true,
      _count: { select: { servers: { where: { enabled: true, mcpServer: { enabled: true } } } } },
    },
    orderBy: { name: "asc" },
  });

  // 3. Full MCP records with tool count + OAuth status
  const allMcps = await prisma.mcpServer.findMany({
    where: { id: { in: allMcpIds }, enabled: true },
    select: {
      id: true,
      name: true,
      description: true,
      transport: true,
      authType: true,
      _count: { select: { registryTools: { where: { enabled: true } } } },
    },
    orderBy: { name: "asc" },
  });

  const oauthIds = allMcps.filter((m) => m.authType === "oauth_delegated").map((m) => m.id);

  const [connections, preferences] = await Promise.all([
    oauthIds.length > 0
      ? prisma.userMcpConnection.findMany({
          where: { userId: user.id, mcpServerId: { in: oauthIds } },
          select: { mcpServerId: true, status: true, updatedAt: true, expiresAt: true },
        })
      : [],
    allMcpIds.length > 0
      ? prisma.userMcpPreference.findMany({
          where: { userId: user.id, mcpServerId: { in: allMcpIds } },
          select: { mcpServerId: true, enabled: true },
        })
      : [],
  ]);

  const connectionMap = new Map(connections.map((c) => [c.mcpServerId, c]));
  const preferenceMap = new Map(preferences.map((p) => [p.mcpServerId, p.enabled]));
  // connectedOauthServerIds from DB connections — independent of user preference
  const connectedOauthServerIds = new Set(connections.filter((c) => c.status === "connected").map((c) => c.mcpServerId));

  // For connected oauth servers, do live probe to get real tool count.
  // Build server configs with tokens from context (includes disabled) or fallback to context servers.
  const oauthToolCounts = new Map<string, number>();
  // context.mcpServers may exclude preference-disabled servers — use full server map from getUserContext
  // by temporarily including all oauth servers that have a DB connection.
  const allContextServers = new Map(context.mcpServers.map((s) => [s.id, s]));
  // For servers not in context (disabled pref), rebuild config with delegated headers
  const oauthMcpIds = [...connectedOauthServerIds];
  const delegatedHeaders = await resolveDelegatedAuthorizationHeaders(user.id, oauthMcpIds);
  const oauthMcpRecords = await prisma.mcpServer.findMany({
    where: { id: { in: oauthMcpIds }, enabled: true },
  });
  const connectedOauthServers = oauthMcpRecords.map((mcp) =>
    allContextServers.get(mcp.id) ?? dbMcpToConfig(mcp as Parameters<typeof dbMcpToConfig>[0], delegatedHeaders.get(mcp.id))
  ).filter((s) => s.enabled);
  await Promise.allSettled(
    connectedOauthServers.map(async (s) => {
      const result = await resolveMcpServerTools(s).catch(() => null);
      if (result?.connectionStatus === "connected") {
        oauthToolCounts.set(s.id, result.tools.length);
      }
    }),
  );

  const items = allMcps.map((mcp) => {
    const conn = connectionMap.get(mcp.id) ?? null;
    const isExpired = conn?.expiresAt && conn.expiresAt <= new Date();
    return {
      id: mcp.id,
      name: mcp.name,
      description: mcp.description,
      transport: mcp.transport,
      authType: mcp.authType,
      toolCount: oauthToolCounts.get(mcp.id) ?? mcp._count.registryTools,
      userEnabled: mcp.authType === "oauth_delegated"
        // OAuth: only enabled if actually connected AND user hasn't explicitly disabled it
        ? connectionMap.get(mcp.id)?.status === "connected" && (preferenceMap.get(mcp.id) ?? true)
        : (preferenceMap.get(mcp.id) ?? true),
      connection: conn
        ? { status: conn.status === "connected" && isExpired ? "expired" : conn.status, updatedAt: conn.updatedAt }
        : null,
    };
  });

  const namespaces = accessibleNamespaces.map((ns) => ({
    id: ns.id,
    alias: ns.alias,
    name: ns.name,
    description: ns.description,
    mcpCount: ns._count.servers,
    endpointUrl: `/api/mcp/namespaces/${ns.alias}`,
  }));

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const proxyUrl = `${protocol}://${host}/api/mcp/proxy`;

  return (
    <PortalShell isAdmin={user.isAdmin} section="My Connections" showUserNavigation userName={user.name}>
      <ConnectionsClient items={items} namespaces={namespaces} proxyUrl={proxyUrl} />
    </PortalShell>
  );
}
