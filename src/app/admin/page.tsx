import Link from "next/link";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  Bot,
  Boxes,
  Cable,
  Layers3,
  Shield,
  Sparkles,
  User,
  Zap,
} from "@/components/ui/icons";
import { ExecutionChart, type ExecDayData } from "@/components/admin/execution-chart";

export const metadata = { title: "Admin Dashboard — MCP Hub" };


export default async function AdminDashboardPage() {
  await requireAdmin();

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    mcpTotal,
    workspaceTotal, workspaceEnabled,
    namespaceTotal, namespacePublished,
    skillEnabled,
    llmEnabled,
    groupCount,
    userCount,
    execTotal, execSuccess, execError,
    execByDay,
    topServers,
  ] = await Promise.all([
    prisma.mcpServer.count(),
    prisma.workspace.count(),
    prisma.workspace.count({ where: { enabled: true } }),
    prisma.mcpNamespace.count(),
    prisma.mcpNamespace.count({ where: { published: true } }),
    prisma.skill.count({ where: { enabled: true } }),
    prisma.llmConfig.count({ where: { enabled: true } }),
    prisma.entraGroup.count(),
    prisma.user.count(),
    prisma.mcpToolExecution.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.mcpToolExecution.count({ where: { createdAt: { gte: sevenDaysAgo }, status: "success" } }),
    prisma.mcpToolExecution.count({ where: { createdAt: { gte: sevenDaysAgo }, status: "error" } }),
    prisma.$queryRaw<Array<{ day: Date; status: string; count: bigint }>>`
      SELECT
        DATE_TRUNC('day', "createdAt") AS day,
        status,
        COUNT(*)::int AS count
      FROM "McpToolExecution"
      WHERE "createdAt" >= ${fourteenDaysAgo}
      GROUP BY DATE_TRUNC('day', "createdAt"), status
      ORDER BY day ASC
    `,
    prisma.mcpToolExecution.groupBy({
      by: ["serverName"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { serverName: true },
      orderBy: { _count: { serverName: "desc" } },
      take: 5,
    }),
  ]);

  // Build 14-day chart data
  const chartData: ExecDayData[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayKey = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en", { month: "short", day: "numeric" });
    const rows = execByDay.filter((r) => r.day.toISOString().slice(0, 10) === dayKey);
    const success = Number(rows.find((r) => r.status === "success")?.count ?? 0);
    const error = Number(rows.find((r) => r.status === "error")?.count ?? 0);
    chartData.push({ date: label, success, error, total: success + error });
  }

  const successRate = execTotal > 0 ? Math.round((execSuccess / execTotal) * 100) : 100;
  const platformReady = llmEnabled > 0 && workspaceEnabled > 0;

  return (
    <div className="portal-page">
      {/* Heading */}
      <div className="portal-page-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Governed AI platform overview.</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${platformReady ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" : "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"}`}>
            {platformReady ? "Platform ready" : "Configuration pending"}
          </span>
        </div>
      </div>

      {/* Hero */}
      <div className="rounded-2xl border border-white/10 p-6 text-white shadow-[0_14px_32px_rgba(17,63,124,0.18)]"
        style={{ background: "var(--gradient-action)" }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Control center</p>
        <h2 className="mt-2 text-xl font-semibold">Build your governed AI environment</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/72">
          Connect MCP servers, configure an LLM provider, define namespaces and publish workspaces for your users.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/admin/llm" className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-[var(--color-primary-strong)]">Configure LLM</Link>
          <Link href="/admin/mcp" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white">Add MCP Server</Link>
          <Link href="/admin/namespaces" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white">Manage Namespaces</Link>
          <Link href="/admin/workspaces" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white">Create Workspace</Link>
        </div>
      </div>

      {/* KPIs — 2 rows of 4 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="MCP Servers" value={String(mcpTotal)} sub="registered servers" icon={Cable} href="/admin/mcp" tone="info" />
        <KpiCard label="Workspaces" value={`${workspaceEnabled}/${workspaceTotal}`} sub="enabled" icon={Boxes} href="/admin/workspaces" tone="info" />
        <KpiCard label="Namespaces" value={`${namespacePublished}/${namespaceTotal}`} sub="published endpoints" icon={Layers3} href="/admin/namespaces" tone="info" />
        <KpiCard label="Executions (7d)" value={String(execTotal)} sub={`${successRate}% success rate`} icon={Zap} href="/admin/audit" tone={execError > 0 && successRate < 90 ? "error" : "success"} />
        <KpiCard label="LLM Configs" value={String(llmEnabled)} sub="enabled providers" icon={Bot} href="/admin/llm" tone="info" />
        <KpiCard label="Active Skills" value={String(skillEnabled)} sub="enabled skills" icon={Sparkles} href="/admin/skills" tone="info" />
        <KpiCard label="Entra Groups" value={String(groupCount)} sub="registered groups" icon={Shield} href="/admin/groups" tone="neutral" />
        <KpiCard label="Users" value={String(userCount)} sub="authenticated" icon={User} href="/admin/audit" tone="neutral" />
      </div>

      {/* Execution chart */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Tool executions — last 14 days</h2>
            <p className="text-xs text-muted-foreground">{execTotal} calls in last 7d · {successRate}% success</p>
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

        {/* Top servers mini-bar */}
        {topServers.length > 0 && (
          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Top servers (7d)</p>
            <div className="flex flex-col gap-2">
              {topServers.map((row) => {
                const pct = execTotal > 0 ? Math.round((row._count.serverName / execTotal) * 100) : 0;
                return (
                  <div key={row.serverName} className="flex items-center gap-3">
                    <p className="w-40 shrink-0 truncate text-[12px] font-medium text-[var(--color-text-secondary)]">{row.serverName}</p>
                    <div className="flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]" style={{ height: 5 }}>
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
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  tone: "info" | "success" | "error" | "neutral";
  value: string;
}) {
  const color = tone === "success" ? "text-[var(--color-success)]"
    : tone === "error" ? "text-[var(--color-error)]"
    : tone === "neutral" ? "text-[var(--color-text-secondary)]"
    : "text-[var(--color-primary)]";
  const bg = tone === "success" ? "bg-[var(--color-success-soft)]"
    : tone === "error" ? "bg-[var(--color-error-soft)]"
    : tone === "neutral" ? "bg-[var(--color-surface-muted)]"
    : "bg-[var(--color-primary-soft)]";

  return (
    <Link href={href} className="group flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(17,63,124,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(17,63,124,0.10)]">
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
    </Link>
  );
}
