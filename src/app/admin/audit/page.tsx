import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { AuditClient } from "./client";

export const metadata = { title: "Audit Log — Admin" };

export default async function AdminAuditPage() {
  await requireAdmin();

  const [auditLogs, executions, metrics] = await Promise.all([
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
    />
  );
}
