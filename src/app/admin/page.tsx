import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Activity, Boxes, Cable, Layers3, Shield, User } from "@/components/ui/icons";

export const metadata = { title: "Admin Dashboard — MCP Hub" };

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [mcpCount, skillCount, llmCount, groupCount, userCount, executionCount, workspaceCount] = await Promise.all([
    prisma.mcpServer.count(),
    prisma.skill.count(),
    prisma.llmConfig.count(),
    prisma.entraGroup.count(),
    prisma.user.count(),
    prisma.mcpToolExecution.count(),
    prisma.workspace.count(),
  ]);

  const stats = [
    { label: "MCP Servers", value: mcpCount, href: "/admin/mcp", icon: Cable },
    { label: "Workspaces", value: workspaceCount, href: "/admin/workspaces", icon: Boxes },
    { label: "Skills", value: skillCount, href: "/admin/skills", icon: Layers3 },
    { label: "LLM Configs", value: llmCount, href: "/admin/llm", icon: Activity },
    { label: "Groups", value: groupCount, href: "/admin/groups", icon: Shield },
    { label: "Users", value: userCount, href: null, icon: User },
    { label: "MCP Executions", value: executionCount, href: "/admin/audit", icon: Activity },
  ];
  const configured = mcpCount + workspaceCount + llmCount;

  return (
    <div className="portal-page">
      <div className="portal-page-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of the governed AI workspace.</p>
          </div>
          <div className="metric-chip rounded-full px-3 py-1.5 text-xs font-medium">
            {configured > 0 ? "Platform configuration in progress" : "Waiting for initial configuration"}
          </div>
        </div>
      </div>
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div
          className="rounded-2xl border border-white/10 p-5 text-white shadow-[0_14px_32px_rgba(17,63,124,0.16)]"
          style={{ background: "var(--gradient-action)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Control center</p>
          <h2 className="mt-2 text-xl font-semibold">Build your governed AI environment</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/72">
            Configure an LLM provider, connect MCP servers and publish a workspace for your users.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/admin/llm" className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-[var(--color-primary-strong)]">Configure LLM</Link>
            <Link href="/admin/mcp" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white">Add MCP server</Link>
            <Link href="/admin/workspaces" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white">Create workspace</Link>
          </div>
        </div>
        <div className="portal-section">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Shield className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Platform readiness</h2>
              <p className="text-xs text-muted-foreground">Minimum services required for users.</p>
            </div>
          </div>
          {[
            ["LLM provider", llmCount > 0],
            ["MCP server", mcpCount > 0],
            ["Workspace", workspaceCount > 0],
          ].map(([label, ready]) => (
            <div key={String(label)} className="flex items-center justify-between border-t border-border/70 pt-3 text-sm">
              <span>{String(label)}</span>
              <span className={ready ? "text-[var(--color-success)]" : "text-muted-foreground"}>
                {ready ? "Configured" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
          <Card key={stat.label} className="transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(17,63,124,0.1)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon className="size-4" /></span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
              {stat.href ? (
                <Link href={stat.href} className="mt-3 inline-flex text-xs font-medium text-[var(--color-primary)] hover:underline">
                  Manage
                </Link>
              ) : null}
            </CardContent>
          </Card>
        )})}
      </div>
    </div>
  );
}
