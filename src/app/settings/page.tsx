import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { SettingsClient } from "./client";
import { PortalShell } from "@/components/layout/portal-shell";

export const metadata = { title: "Settings — MCP Hub" };

export default async function SettingsPage() {
  const user = await requireAuth();

  const [tokens, namespaceCandidates] = await Promise.all([
    prisma.personalToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, lastUsedAt: true, createdAt: true },
    }),
    prisma.mcpNamespace.findMany({
      where: { enabled: true, published: true },
      orderBy: { name: "asc" },
      include: {
        groups: { select: { entraGroupId: true } },
        users: { select: { id: true } },
      },
    }),
  ]);

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const proxyUrl = `${protocol}://${host}/api/mcp/proxy`;
  const namespaceEndpoints = namespaceCandidates
    .filter(
      (namespace) =>
        (namespace.groups.length === 0 && namespace.users.length === 0) ||
        namespace.users.some((entry) => entry.id === user.id) ||
        namespace.groups.some((group) => user.groups.includes(group.entraGroupId)),
    )
    .map((namespace) => ({
      name: namespace.name,
      alias: namespace.alias,
      url: `${protocol}://${host}/api/mcp/namespaces/${namespace.alias}`,
    }));

  return (
    <PortalShell isAdmin={user.isAdmin} section="Settings" showUserNavigation userName={user.name}>
      <SettingsClient namespaceEndpoints={namespaceEndpoints} tokens={tokens} proxyUrl={proxyUrl} />
    </PortalShell>
  );
}
