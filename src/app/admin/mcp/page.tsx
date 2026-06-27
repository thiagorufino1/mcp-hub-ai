import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  decryptSecretJson,
} from "@/lib/secret-crypto";
import { McpAdminClient } from "./client";
import type { McpServerRow } from "./actions";

export const metadata = { title: "MCP Servers - Admin" };

export default async function AdminMcpPage() {
  await requireAdmin();
  const [mcps, toolsTotal, transportCounts, withAuthCount, disabledCount] = await Promise.all([
    prisma.mcpServer.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        registryTools: {
          orderBy: { name: "asc" },
          select: {
            destructive: true,
            displayName: true,
            enabled: true,
            id: true,
            name: true,
            permissionMode: true,
            readOnly: true,
          },
        },
      },
    }),
    prisma.mcpToolRegistry.count({ where: { enabled: true } }),
    prisma.mcpServer.groupBy({ by: ["transport"], _count: { id: true } }),
    prisma.mcpServer.count({ where: { authType: { not: "none" } } }),
    prisma.mcpServer.count({ where: { enabled: false } }),
  ]);

  const byTransport = Object.fromEntries(
    transportCounts.map((r) => [r.transport, r._count.id]),
  );

  const stats = {
    total: mcps.length,
    toolsTotal,
    byTransport,
    withAuth: withAuthCount,
    disabled: disabledCount,
  };

  return (
    <McpAdminClient
      mcps={mcps.map((mcp) => ({
        ...mcp,
        env: decryptSecretJson(mcp.env),
        headers: decryptSecretJson(mcp.headers),
        oauthClientSecret: null,
        sharedSecret: null,
      })) satisfies McpServerRow[]}
      stats={stats}
    />
  );
}
