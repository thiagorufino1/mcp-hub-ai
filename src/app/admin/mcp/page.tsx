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
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const [mcps, execTotal, execP95] = await Promise.all([
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
    prisma.mcpToolExecution.count({ where: { createdAt: { gte: fourteenDaysAgo } } }),
    prisma.$queryRaw<Array<{ p95: number | null }>>`
      SELECT COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "latencyMs"), 0) AS p95
      FROM "McpToolExecution"
      WHERE "createdAt" >= ${fourteenDaysAgo}
    `,
  ]);

  const totalTools = mcps.reduce((sum, mcp) => sum + mcp.registryTools.length, 0);
  const activeTools = mcps.reduce(
    (sum, mcp) =>
      sum +
      (mcp.enabled ? mcp.registryTools.filter((tool) => tool.enabled).length : 0),
    0,
  );
  const enabledServers = mcps.filter((mcp) => mcp.enabled).length;

  const stats = {
    total: mcps.length,
    enabledServers,
    totalTools,
    activeTools,
    execTotal,
    execP95Ms: Math.round(Number(execP95[0]?.p95 ?? 0)),
  };

  return (
    <McpAdminClient
      mcps={mcps.map((mcp) => {
        const decryptedEnv = decryptSecretJson(mcp.env);
        const decryptedHeaders = decryptSecretJson(mcp.headers);
        return {
          ...mcp,
          env: {},
          headers: {},
          envKeys: Object.keys(decryptedEnv),
          headerKeys: Object.keys(decryptedHeaders),
          oauthClientSecret: null,
          sharedSecret: null,
        };
      }) satisfies McpServerRow[]}
      stats={stats}
    />
  );
}
