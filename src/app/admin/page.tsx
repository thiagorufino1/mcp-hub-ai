import Link from "next/link";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  Bot,
  Cable,
  Layers3,
  RadioTower,
  Shield,
  User,
  Wrench,
  Zap,
} from "@/components/ui/icons";
import { ExecutionChart, type ExecDayData } from "@/components/admin/execution-chart";
import { LlmUsageChart, type LlmDayData } from "@/components/admin/llm-usage-chart";

export const metadata = { title: "Admin Dashboard - MCP Hub" };

export default async function AdminDashboardPage() {
  await requireAdmin();

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const fourteenDaysWindowAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [
    mcpTotal,
    namespaceTotal,
    namespacePublished,
    toolTotal,
    oauthConnectionTotal,
    llmEnabled,
    groupCount,
    userCount,
    execTotal,
    execSuccess,
    execError,
    execByDay,
    topServers,
    llmByDay,
  ] = await Promise.all([
    prisma.mcpServer.count(),
    prisma.mcpNamespace.count(),
    prisma.mcpNamespace.count({ where: { published: true } }),
    prisma.mcpToolRegistry.count({ where: { enabled: true } }),
    prisma.userMcpConnection.count({ where: { status: "connected" } }),
    prisma.llmConfig.count({ where: { enabled: true } }),
    prisma.entraGroup.count(),
    prisma.user.count(),
    prisma.mcpToolExecution.count({ where: { createdAt: { gte: fourteenDaysWindowAgo } } }),
    prisma.mcpToolExecution.count({ where: { createdAt: { gte: fourteenDaysWindowAgo }, status: "success" } }),
    prisma.mcpToolExecution.count({ where: { createdAt: { gte: fourteenDaysWindowAgo }, status: { not: "success" } } }),
    prisma.$queryRaw<Array<{ day: Date; status: string; count: bigint }>>`
      SELECT
        DATE_TRUNC('day', "createdAt") AS day,
        CASE WHEN status = 'success' THEN 'success' ELSE 'error' END AS status,
        COUNT(*)::int AS count
      FROM "McpToolExecution"
      WHERE "createdAt" >= ${fourteenDaysAgo}
      GROUP BY DATE_TRUNC('day', "createdAt"), CASE WHEN status = 'success' THEN 'success' ELSE 'error' END
      ORDER BY day ASC
    `,
    prisma.mcpToolExecution.groupBy({
      by: ["serverName"],
      where: { createdAt: { gte: fourteenDaysWindowAgo } },
      _count: { serverName: true },
      orderBy: { _count: { serverName: "desc" } },
      take: 5,
    }),
    prisma.$queryRaw<Array<{ day: Date; model: string; totalTokens: number }>>`
      SELECT
        DATE_TRUNC('day', "createdAt") AS day,
        COALESCE(metadata->>'model', 'unknown') AS model,
        COALESCE(SUM((metadata->>'totalTokens')::numeric), 0)::int AS "totalTokens"
      FROM "AuditLog"
      WHERE action = 'llm.chat' AND "createdAt" >= ${fourteenDaysAgo}
      GROUP BY DATE_TRUNC('day', "createdAt"), COALESCE(metadata->>'model', 'unknown')
      ORDER BY day ASC
    `,
  ]);

  const execMap = new Map<string, number>();
  for (const r of execByDay) {
    execMap.set(`${r.day.toISOString().slice(0, 10)}:${r.status}`, Number(r.count));
  }

  const llmMap = new Map<string, number>();
  for (const r of llmByDay) {
    llmMap.set(`${r.day.toISOString().slice(0, 10)}:${r.model}`, Number(r.totalTokens ?? 0));
  }

  const chartData: ExecDayData[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayKey = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en", { month: "short", day: "numeric" });
    const success = execMap.get(`${dayKey}:success`) ?? 0;
    const error = execMap.get(`${dayKey}:error`) ?? 0;
    chartData.push({ date: label, success, error, total: success + error });
  }

  const successRate = execTotal > 0 ? Math.round((execSuccess / execTotal) * 100) : 100;

  const llmModels = [...new Set(llmByDay.map((r) => r.model))];
  const llmChartData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000);
    const dayKey = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
    const entry: Record<string, string | number> = { date: label };
    for (const model of llmModels) {
      entry[model] = llmMap.get(`${dayKey}:${model}`) ?? 0;
    }
    return entry;
  });

  return (
    <div className="portal-page">
      <div className="portal-page-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Governed AI platform overview.</p>
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl border border-white/10 p-6 text-white shadow-[0_14px_32px_rgba(17,63,124,0.18)]"
        style={{ background: "var(--gradient-action)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Control center</p>
        <h2 className="mt-2 text-xl font-semibold">Build your governed AI environment</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/72">
          Connect MCP servers, configure an LLM provider, and publish namespaces for your users.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard href="/admin/mcp" label="MCP Servers" value={String(mcpTotal)} sub="registered servers" icon={Cable} tone="info" />
        <KpiCard href="/admin/namespaces" label="Namespaces" value={`${namespacePublished}/${namespaceTotal}`} sub="published endpoints" icon={Layers3} tone="info" />
        <KpiCard href="/admin/audit" label="Executions (14d)" value={String(execTotal)} sub={`${successRate}% success rate`} icon={Zap} tone={execError > 0 && successRate < 90 ? "error" : "success"} />
        <KpiCard href="/admin/llm" label="LLM" value={String(llmEnabled)} sub="enabled providers" icon={Bot} tone="info" />
        <KpiCard href="/admin/mcp" label="MCP Tools" value={String(toolTotal)} sub="enabled tools" icon={Wrench} tone="info" />
        <KpiCard label="OAuth Connections" value={String(oauthConnectionTotal)} sub="active connections" icon={RadioTower} tone="neutral" />
        <KpiCard href="/admin/groups" label="Entra Groups" value={String(groupCount)} sub="registered groups" icon={Shield} tone="neutral" />
        <KpiCard label="Users" value={String(userCount)} sub="authenticated" icon={User} tone="neutral" />
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Tool executions - last 14 days</h2>
            <p className="text-xs text-muted-foreground">{execTotal} calls in last 14d - {successRate}% success</p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--color-primary)]" />
              Success
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--color-error)]" />
              Error
            </span>
            <Link href="/admin/audit" className="font-medium text-[var(--color-primary)] hover:underline">View log</Link>
          </div>
        </div>
        <ExecutionChart data={chartData} />

        {topServers.length > 0 && (
          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Top servers (14d)</p>
            <div className="flex flex-col gap-2">
              {topServers.map((row) => {
                const pct = execTotal > 0 ? Math.round((row._count.serverName / execTotal) * 100) : 0;
                return (
                  <div key={row.serverName} className="flex items-center gap-3">
                    <p className="w-56 shrink-0 truncate text-[12px] font-medium text-[var(--color-text-secondary)]">{row.serverName}</p>
                    <div className="ml-10 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]" style={{ height: 5 }}>
                      <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%`, transition: "width 0.5s" }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-[11px] font-semibold text-[var(--color-primary)]">{row._count.serverName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Consumo de tokens LLM - ultimos 14 dias</h2>
            <p className="text-xs text-muted-foreground">Total de tokens por dia (input + output)</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/audit" className="text-[11px] font-medium text-[var(--color-primary)] hover:underline">Ver logs</Link>
          </div>
        </div>
        <LlmUsageChart data={llmChartData} models={llmModels} />
      </section>
    </div>
  );
}

function KpiCard({
  href,
  icon: Icon,
  label,
  sub,
  tone,
  value,
}: {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  tone: "info" | "success" | "error" | "neutral";
  value: string;
}) {
  const color =
    tone === "success" ? "text-[var(--color-success)]"
      : tone === "error" ? "text-[var(--color-error)]"
        : tone === "neutral" ? "text-[var(--color-text-secondary)]"
          : "text-[var(--color-primary)]";
  const bg =
    tone === "success" ? "bg-[var(--color-success-soft)]"
      : tone === "error" ? "bg-[var(--color-error-soft)]"
        : tone === "neutral" ? "bg-[var(--color-surface-muted)]"
          : "bg-[var(--color-primary-soft)]";

  const cardClassName = href
    ? "group flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(17,63,124,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(17,63,124,0.10)]"
    : "group flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(17,63,124,0.04)] transition-all";

  const content = (
    <div className={cardClassName}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${bg} ${color} transition-transform group-hover:scale-110`}>
          <Icon className="size-4" />
        </span>
      </div>
      <div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
