"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, AlertCircle, LoaderCircle, RefreshCw, Search, Zap } from "@/components/ui/icons";
import { cn, formatTokenCount } from "@/lib/utils";
import { ADMIN_ACTIVITY_ACTIONS } from "@/lib/audit";

type AuditLogEntry = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type ExecutionEntry = {
  id: string;
  actorUserId: string | null;
  actorUserEmail: string | null;
  createdAt: string;
  errorMessage: string | null;
  latencyMs: number;
  serverName: string;
  source: string;
  status: string;
  toolName: string;
  traceId: string | null;
  attemptCount: number;
};

type Metrics = { total24h: number; failures24h: number; averageLatency: number };
type Counts24h = { activity: number; executions: number; proxy: number; llm: number };

const ADMIN_ACTIVITY_ACTIONS_SET = new Set<string>(ADMIN_ACTIVITY_ACTIONS);

function actionVariant(action: string): string {
  if (/create|enable|connect|add|default/.test(action))
    return "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]";
  if (/delete|disable|disconnect|remove/.test(action))
    return "border-[var(--color-error)] bg-[var(--color-error-soft)] text-[var(--color-error)]";
  if (/update|permission|upsert/.test(action))
    return "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
  if (/test|chat|llm|proxy|namespace/.test(action))
    return "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-muted-foreground";
  return "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-muted-foreground";
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono font-medium", actionVariant(action))}>
      {action}
    </span>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return ok ? (
    <span className="inline-flex items-center rounded-full border border-[var(--color-success)] bg-[var(--color-success-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-success)]">
      {label ?? "success"}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-[var(--color-error)] bg-[var(--color-error-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-error)]">
      {label ?? "error"}
    </span>
  );
}


function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center text-sm text-muted-foreground">{message}</td>
    </tr>
  );
}

const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th className={cn("px-4 py-3 text-left text-[var(--color-text-secondary)]", right && "text-right")}>{children}</th>
);

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

type Tab = "activity" | "executions" | "proxy" | "llm";

export function AuditClient({
  auditLogs,
  executions,
  metrics,
  counts24h,
}: {
  auditLogs: AuditLogEntry[];
  executions: ExecutionEntry[];
  metrics: Metrics;
  counts24h: Counts24h;
}) {
  const [isPending, setIsPending] = useState(false);
  const [tab, setTab] = useState<Tab>("activity");
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();

  const filteredLogs = auditLogs.filter(
    (l) => ADMIN_ACTIVITY_ACTIONS_SET.has(l.action) &&
      (!q || l.action.toLowerCase().includes(q) || (l.userEmail ?? "").toLowerCase().includes(q) || l.resource.toLowerCase().includes(q)),
  );
  const filteredExecs = executions.filter(
    (e) => !q || e.toolName.toLowerCase().includes(q) || e.serverName.toLowerCase().includes(q) || e.source.toLowerCase().includes(q),
  );
  const filteredProxy = auditLogs.filter(
    (l) => (l.action === "mcp.proxy" || l.action === "mcp.namespace") &&
      (!q || (l.userEmail ?? "").toLowerCase().includes(q) || l.resource.toLowerCase().includes(q)),
  );
  const filteredLlm = auditLogs.filter(
    (l) => (l.action === "llm.test" || l.action === "llm.chat") &&
      (!q || (l.userEmail ?? "").toLowerCase().includes(q) || l.resource.toLowerCase().includes(q)),
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "activity",   label: "Admin Activity" },
    { id: "executions", label: "MCP Executions" },
    { id: "proxy",      label: "Proxy / Namespace" },
    { id: "llm",        label: "LLM" },
  ];

  return (
    <div className="portal-page">
      <div className="portal-page-heading">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Atividade administrativa, execuções MCP, eventos de proxy e logs de LLM.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_5px_18px_rgba(17,63,124,0.045)]">
        <div className="flex items-center gap-4 px-6 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)]">
            <Activity className="size-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">MCP Execuções (24h)</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{metrics.total24h}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-l border-[var(--color-border)] px-6 py-5">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", metrics.failures24h > 0 ? "bg-[var(--color-error-soft)]" : "bg-[var(--color-success-soft)]")}>
            <AlertCircle className={cn("size-5", metrics.failures24h > 0 ? "text-[var(--color-error)]" : "text-[var(--color-success)]")} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Falhas (24h)</p>
            <p className={cn("text-2xl font-bold tracking-tight", metrics.failures24h > 0 ? "text-[var(--color-error)]" : "text-foreground")}>
              {metrics.failures24h}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-l border-[var(--color-border)] px-6 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-warning-soft)]">
            <Zap className="size-5 text-[var(--color-warning)]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Latência média</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{metrics.averageLatency} ms</p>
            <p className="text-[11px] text-muted-foreground">últimas 24h</p>
          </div>
        </div>
      </div>

      {/* Tabs + Search - full width */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-[var(--color-surface)] text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            disabled={isPending}
            onClick={() => { setIsPending(true); window.location.href = window.location.pathname + "?t=" + Date.now(); }}
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar..."
              className="w-full pl-9 text-[var(--color-text-secondary)]"
            />
          </div>
        </div>
      </div>

      {/* Activity Tab */}
      {tab === "activity" && (
        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full text-sm text-[var(--color-text-secondary)]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50">
                <TH>Data</TH>
                <TH>Ação</TH>
                <TH>Recurso</TH>
                <TH>Usuário</TH>
                <TH>Detalhes</TH>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/40">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmtDate(log.createdAt)}</td>
                  <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium">{log.resource}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.userEmail ?? "-"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {Object.keys(log.metadata).length > 0 && (
                      <span className="font-mono">{Object.entries(log.metadata).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && <EmptyRow cols={5} message="Nenhum evento de auditoria registrado." />}
            </tbody>
          </table>
        </div>
      )}

      {/* Executions Tab */}
      {tab === "executions" && (
        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full text-sm text-[var(--color-text-secondary)]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50">
                <TH>Data</TH>
                <TH>Servidor / Tool</TH>
                <TH>Fonte</TH>
                <TH>Status</TH>
                <TH right>Latência</TH>
                <TH>Ator</TH>
                <TH>Trace</TH>
              </tr>
            </thead>
            <tbody>
              {filteredExecs.map((exec) => (
                <tr key={exec.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/40">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmtDate(exec.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{exec.serverName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{exec.toolName}</p>
                    {exec.errorMessage && <p className="mt-1 max-w-xs truncate text-xs text-[var(--color-error)]">{exec.errorMessage}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs">{exec.source}</td>
                  <td className="px-4 py-3">
                    <StatusBadge ok={exec.status === "success"} label={exec.status} />
                    {exec.attemptCount > 1 && <p className="mt-1 text-[10px] text-muted-foreground">{exec.attemptCount} tentativas</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">{exec.latencyMs} ms</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    <p className="truncate max-w-[160px]">{exec.actorUserEmail ?? exec.actorUserId ?? "unknown"}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    <p className="truncate max-w-[160px]">{exec.traceId ?? "-"}</p>
                  </td>
                </tr>
              ))}
              {filteredExecs.length === 0 && <EmptyRow cols={7} message="Nenhuma execução MCP registrada." />}
            </tbody>
          </table>
        </div>
      )}

      {/* Proxy Tab */}
      {tab === "proxy" && (
        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full text-sm text-[var(--color-text-secondary)]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50">
                <TH>Data</TH>
                <TH>Usuário</TH>
                <TH>Cliente</TH>
                <TH>Evento</TH>
                <TH>Alvo</TH>
                <TH>Tool</TH>
                <TH>Trace</TH>
              </tr>
            </thead>
            <tbody>
              {filteredProxy.map((log) => {
                const meta = log.metadata as Record<string, unknown>;
                const target = typeof meta.workspaceSlug === "string" ? meta.workspaceSlug : typeof meta.slug === "string" ? meta.slug : log.resourceId ?? "-";
                const traceId = typeof meta.traceId === "string" && meta.traceId ? meta.traceId : null;
                const toolName = typeof meta.toolName === "string" && meta.toolName ? meta.toolName : "-";
                const event = meta.event === "tool_used" ? "tool utilizada" : meta.event === "discovery_tools" ? "discovery tools" : meta.event === "client_connect" ? "conectado" : "mcp event";
                const clientName = typeof meta.clientName === "string" && meta.clientName ? meta.clientName : "-";
                return (
                  <tr key={log.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/40">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmtDate(log.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{log.userEmail ?? log.userId ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{clientName}</td>
                    <td className="px-4 py-3 text-xs">{event}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium">{target}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{log.resource}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{toolName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[140px]">{traceId ?? "-"}</td>
                  </tr>
                );
              })}
              {filteredProxy.length === 0 && <EmptyRow cols={7} message="Nenhum evento de proxy registrado." />}
            </tbody>
          </table>
        </div>
      )}

      {/* LLM Tab */}
      {tab === "llm" && (
        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full text-sm text-[var(--color-text-secondary)]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50">
                <TH>Data</TH>
                <TH>Usuário</TH>
                <TH>Modelo</TH>
                <TH right>Tokens</TH>
                <TH right>Latência</TH>
                <TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {filteredLlm.map((log) => {
                const meta = log.metadata as Record<string, unknown>;
                const inputTokens  = typeof meta.inputTokens  === "number" ? meta.inputTokens  : 0;
                const outputTokens = typeof meta.outputTokens === "number" ? meta.outputTokens : 0;
                const totalTokens  = typeof meta.totalTokens  === "number" ? meta.totalTokens  : 0;
                const latencyMs    = typeof meta.latencyMs    === "number" ? meta.latencyMs    : 0;
                const ok = meta.ok !== false;
                const model = typeof meta.model === "string" && meta.model ? meta.model : null;
                return (
                  <tr key={log.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/40">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmtDate(log.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{log.userEmail ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{model ?? "-"}</td>
                    <td className="px-4 py-3 text-right text-xs font-mono">
                      <p className="text-foreground">{formatTokenCount(totalTokens)}</p>
                      <p className="text-[10px] text-muted-foreground">↑{formatTokenCount(inputTokens)} ↓{formatTokenCount(outputTokens)}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{latencyMs > 0 ? `${latencyMs} ms` : "-"}</td>
                    <td className="px-4 py-3"><StatusBadge ok={ok} /></td>
                  </tr>
                );
              })}
              {filteredLlm.length === 0 && <EmptyRow cols={6} message="Nenhum evento LLM registrado." />}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
