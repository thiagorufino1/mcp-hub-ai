import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { AuditClient } from "./client";

export const metadata = { title: "Audit Log - Admin" };

export default async function AdminAuditPage() {
  await requireAdmin();

  const [auditLogs, executions, metrics, adminLogs24h, executions24h, proxy24h, llm24h] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        userId: true,
        userEmail: true,
        action: true,
        resource: true,
        resourceId: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prisma.mcpToolExecution.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        actorUserId: true,
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
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM "AuditLog"
      WHERE "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        AND action IN (
          'mcp.create','mcp.update','mcp.delete','mcp.enable','mcp.disable',
          'mcp.tool.enable','mcp.tool.disable','mcp.tool.permission',
          'namespace.mcp.add','namespace.mcp.remove','namespace.group.add',
          'namespace.group.remove','namespace.access.update',
          'namespace.tool.enable','namespace.tool.disable',
          'llm.create','llm.update','llm.default','llm.delete',
          'group.upsert','group.delete'
        )
    `.then((r) => Number(r[0]?.count ?? 0)),
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
      auditLogs={auditLogs.map((l) => ({
        ...l,
        metadata: l.metadata as Record<string, unknown>,
        createdAt: l.createdAt.toISOString(),
      }))}
      executions={executions.map((e) => ({
        ...e,
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
