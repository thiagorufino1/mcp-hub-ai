import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ADMIN_ACTIVITY_ACTIONS } from "@/lib/audit";
import { AuditClient } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Log - Admin" };

export default async function AdminAuditPage() {
  await requireAdmin();

  const auditLogSelect = {
    id: true,
    userId: true,
    userEmail: true,
    action: true,
    resource: true,
    resourceId: true,
    metadata: true,
    createdAt: true,
  } as const;

  const [activityLogs, proxyLogs, llmLogs, executions, metrics, adminLogs24h, executions24h, proxy24h, llm24h] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      where: { action: { notIn: ["mcp.proxy", "mcp.namespace", "llm.chat", "llm.test"] } },
      select: auditLogSelect,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      where: { action: { in: ["mcp.proxy", "mcp.namespace"] } },
      select: auditLogSelect,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      where: { action: { in: ["llm.chat", "llm.test"] } },
      select: auditLogSelect,
    }),
    prisma.mcpToolExecution.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        actorUserId: true,
        actorUser: {
          select: {
            email: true,
          },
        },
        createdAt: true,
        errorMessage: true,
        latencyMs: true,
        serverName: true,
        source: true,
        status: true,
        toolName: true,
        traceId: true,
        attemptCount: true,
      },
    }),
    prisma.$queryRaw<
      Array<{ averageLatency: number | null; failures: bigint; total: bigint }>
    >`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status <> 'success') AS failures,
        AVG("latencyMs")::double precision AS "averageLatency"
      FROM "McpToolExecution"
      WHERE "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    `,
    prisma.auditLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        action: { in: [...ADMIN_ACTIVITY_ACTIONS] },
      },
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM "McpToolExecution"
      WHERE "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    `.then((r) => Number(r[0]?.count ?? 0)),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM "AuditLog"
      WHERE "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        AND action IN ('mcp.proxy','mcp.namespace')
    `.then((r) => Number(r[0]?.count ?? 0)),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM "AuditLog"
      WHERE "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        AND action IN ('llm.test','llm.chat')
    `.then((r) => Number(r[0]?.count ?? 0)),
  ]);

  const metric = metrics[0];

  return (
    <AuditClient
      auditLogs={[...activityLogs, ...proxyLogs, ...llmLogs].map((l) => ({
        ...l,
        metadata: l.metadata as Record<string, unknown>,
        createdAt: l.createdAt.toISOString(),
      }))}
      executions={executions.map((e) => ({
      ...e,
        actorUserEmail: e.actorUser?.email ?? null,
        createdAt: e.createdAt.toISOString(),
      }))}
      metrics={{
        total24h: Number(metric?.total ?? 0),
        failures24h: Number(metric?.failures ?? 0),
        averageLatency: Math.round(metric?.averageLatency ?? 0),
      }}
      counts24h={{
        activity: adminLogs24h,
        executions: executions24h,
        proxy: proxy24h,
        llm: llm24h,
      }}
    />
  );
}
