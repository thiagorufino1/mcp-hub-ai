import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "MCP Audit — Admin" };

export default async function AdminAuditPage() {
  await requireAdmin();

  const [recent, metrics] = await Promise.all([
    prisma.mcpToolExecution.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        actorUserId: true,
        attemptCount: true,
        createdAt: true,
        errorMessage: true,
        id: true,
        latencyMs: true,
        serverName: true,
        source: true,
        status: true,
        toolName: true,
        traceId: true,
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
  const total24h = Number(metric?.total ?? 0);
  const failures24h = Number(metric?.failures ?? 0);
  const averageLatency = Math.round(metric?.averageLatency ?? 0);

  return (
    <div className="portal-page">
      <div className="portal-page-heading">
        <h1 className="text-2xl font-bold">MCP execution audit</h1>
        <p className="text-sm text-muted-foreground">
          Last 100 executions. Sensitive argument fields are redacted before storage.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Executions (24h)" value={total24h} />
        <Metric title="Non-success (24h)" value={failures24h} />
        <Metric title="Average latency (24h)" value={`${averageLatency} ms`} />
      </div>

      <div className="portal-table-shell">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Server / tool</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Latency</th>
              <th className="px-3 py-2 text-left">Actor / trace</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((execution) => (
              <tr key={execution.id} className="border-b align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {execution.createdAt.toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium">{execution.serverName}</p>
                  <p className="font-mono text-xs">{execution.toolName}</p>
                  {execution.errorMessage ? (
                    <p className="mt-1 max-w-lg truncate text-xs text-destructive">
                      {execution.errorMessage}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2">{execution.source}</td>
                <td className="px-3 py-2">
                  <Badge variant={execution.status === "success" ? "default" : "destructive"}>
                    {execution.status}
                  </Badge>
                  {execution.attemptCount > 1 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {execution.attemptCount} attempts
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right">{execution.latencyMs} ms</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  <p>{execution.actorUserId ?? "unknown"}</p>
                  <p>{execution.traceId ?? "—"}</p>
                </td>
              </tr>
            ))}
            {recent.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No MCP executions recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
