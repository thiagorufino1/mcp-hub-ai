"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatTokenCount } from "@/lib/utils";

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

type WorkspaceEntry = {
  id: string;
  name: string;
  slug: string;
};

type Metrics = {
  total24h: number;
  failures24h: number;
  averageLatency: number;
};

type ProxyEventType = "discovery_tools" | "tool_used";

const ACTION_COLORS: Record<string, string> = {
  "mcp.create": "bg-green-100 text-green-800 border-green-200",
  "mcp.update": "bg-blue-100 text-blue-800 border-blue-200",
  "mcp.delete": "bg-red-100 text-red-800 border-red-200",
  "mcp.enable": "bg-green-100 text-green-800 border-green-200",
  "mcp.disable": "bg-orange-100 text-orange-800 border-orange-200",
  "mcp.tool.enable": "bg-green-100 text-green-800 border-green-200",
  "mcp.tool.disable": "bg-orange-100 text-orange-800 border-orange-200",
  "mcp.tool.permission": "bg-blue-100 text-blue-800 border-blue-200",
  "mcp.proxy": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "mcp.namespace": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "namespace.mcp.add": "bg-green-100 text-green-800 border-green-200",
  "namespace.mcp.remove": "bg-red-100 text-red-800 border-red-200",
  "namespace.group.add": "bg-green-100 text-green-800 border-green-200",
  "namespace.group.remove": "bg-red-100 text-red-800 border-red-200",
  "namespace.access.update": "bg-slate-100 text-slate-800 border-slate-200",
  "namespace.tool.enable": "bg-green-100 text-green-800 border-green-200",
  "namespace.tool.disable": "bg-orange-100 text-orange-800 border-orange-200",
  "llm.create": "bg-green-100 text-green-800 border-green-200",
  "llm.update": "bg-blue-100 text-blue-800 border-blue-200",
  "llm.default": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "llm.delete": "bg-red-100 text-red-800 border-red-200",
  "llm.test": "bg-purple-100 text-purple-800 border-purple-200",
  "llm.chat": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "skill.create": "bg-green-100 text-green-800 border-green-200",
  "skill.update": "bg-blue-100 text-blue-800 border-blue-200",
  "skill.delete": "bg-red-100 text-red-800 border-red-200",
  "group.upsert": "bg-blue-100 text-blue-800 border-blue-200",
  "group.delete": "bg-red-100 text-red-800 border-red-200",
  "workspace.create": "bg-green-100 text-green-800 border-green-200",
  "workspace.update": "bg-blue-100 text-blue-800 border-blue-200",
  "workspace.delete": "bg-red-100 text-red-800 border-red-200",
  "user.mcp.enable": "bg-green-100 text-green-800 border-green-200",
  "user.mcp.disable": "bg-orange-100 text-orange-800 border-orange-200",
  "user.oauth.connect": "bg-green-100 text-green-800 border-green-200",
  "user.oauth.disconnect": "bg-orange-100 text-orange-800 border-orange-200",
  "user.login": "bg-gray-100 text-gray-800 border-gray-200",
};

const ADMIN_ACTIVITY_ACTIONS = new Set([
  "mcp.create",
  "mcp.update",
  "mcp.delete",
  "mcp.enable",
  "mcp.disable",
  "mcp.tool.enable",
  "mcp.tool.disable",
  "mcp.tool.permission",
  "namespace.mcp.add",
  "namespace.mcp.remove",
  "namespace.group.add",
  "namespace.group.remove",
  "namespace.access.update",
  "namespace.tool.enable",
  "namespace.tool.disable",
  "llm.create",
  "llm.update",
  "llm.default",
  "llm.delete",
  "skill.create",
  "skill.update",
  "skill.delete",
  "group.upsert",
  "group.delete",
  "workspace.create",
  "workspace.update",
  "workspace.delete",
]);

function isAdminActivity(action: string): boolean {
  return ADMIN_ACTIVITY_ACTIONS.has(action);
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? "bg-gray-100 text-gray-800 border-gray-200";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono font-medium", cls)}>
      {action}
    </span>
  );
}

function MetricCard({ title, value }: { title: string; value: number | string }) {
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

function getProxyEventLabel(metadata: Record<string, unknown>): string {
  const event = metadata.event;
  if (event === "tool_used") {
    return "tool utilizada";
  }
  if (event === "discovery_tools") {
    return "discovery tools";
  }
  return "mcp event";
}

function getProxyToolName(metadata: Record<string, unknown>): string {
  const toolName = metadata.toolName;
  return typeof toolName === "string" && toolName.length > 0 ? toolName : "—";
}

export function AuditClient({
  auditLogs,
  executions,
  workspaces,
  metrics,
}: {
  auditLogs: AuditLogEntry[];
  executions: ExecutionEntry[];
  workspaces: WorkspaceEntry[];
  metrics: Metrics;
}) {
  const [tab, setTab] = useState<"activity" | "executions" | "proxy" | "llm">("activity");
  const [search, setSearch] = useState("");
  const normalizedSearch = search.toLowerCase();

  const filteredLogs = auditLogs.filter(
    (l) =>
      isAdminActivity(l.action) &&
      (!search ||
        l.action.toLowerCase().includes(normalizedSearch) ||
        (l.userEmail ?? "").toLowerCase().includes(normalizedSearch) ||
        l.resource.toLowerCase().includes(normalizedSearch)),
  );

  const filteredExecs = executions.filter(
    (e) =>
      !search ||
      e.toolName.toLowerCase().includes(normalizedSearch) ||
      e.serverName.toLowerCase().includes(normalizedSearch) ||
      e.source.toLowerCase().includes(normalizedSearch),
  );

  const filteredLlmLogs = auditLogs.filter(
    (l) =>
      (l.action === "llm.test" || l.action === "llm.chat") &&
      (!search ||
        l.userEmail?.toLowerCase().includes(normalizedSearch) ||
        l.resource.toLowerCase().includes(normalizedSearch) ||
        Object.entries(l.metadata)
          .map(([key, value]) => `${key}:${String(value)}`)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)),
  );
  const filteredProxyLogs = auditLogs.filter(
    (l) =>
      (l.action === "mcp.proxy" || l.action === "mcp.namespace") &&
      (!search ||
        l.userEmail?.toLowerCase().includes(normalizedSearch) ||
        l.resource.toLowerCase().includes(normalizedSearch) ||
        Object.entries(l.metadata)
          .map(([key, value]) => `${key}:${String(value)}`)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)),
  );

  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

  return (
    <div className="portal-page">
      <div className="portal-page-heading">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Administrative actions go into Activity. MCP executions, proxy, and LLM logs live in their own tabs.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="MCP Executions (24h)" value={metrics.total24h} />
        <MetricCard title="Failures (24h)" value={metrics.failures24h} />
        <MetricCard title="Avg latency (24h)" value={`${metrics.averageLatency} ms`} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
          <button
            onClick={() => setTab("activity")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              tab === "activity"
                ? "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
                : "text-muted-foreground hover:bg-[var(--color-surface-muted)]/50",
            )}
          >
            Admin Activity
            <span className="ml-2 rounded-full bg-[var(--color-border)] px-1.5 py-0.5 text-[10px]">
              {filteredLogs.length}
            </span>
          </button>
          <button
            onClick={() => setTab("executions")}
            className={cn(
              "border-l border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors",
              tab === "executions"
                ? "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
                : "text-muted-foreground hover:bg-[var(--color-surface-muted)]/50",
            )}
          >
            MCP Executions
            <span className="ml-2 rounded-full bg-[var(--color-border)] px-1.5 py-0.5 text-[10px]">
              {executions.length}
            </span>
          </button>
          <button
            onClick={() => setTab("proxy")}
            className={cn(
              "border-l border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors",
              tab === "proxy"
                ? "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
                : "text-muted-foreground hover:bg-[var(--color-surface-muted)]/50",
            )}
          >
            Proxy / Namespace
            <span className="ml-2 rounded-full bg-[var(--color-border)] px-1.5 py-0.5 text-[10px]">
              {filteredProxyLogs.length}
            </span>
          </button>
          <button
            onClick={() => setTab("llm")}
            className={cn(
              "border-l border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors",
              tab === "llm"
                ? "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
                : "text-muted-foreground hover:bg-[var(--color-surface-muted)]/50",
            )}
          >
            LLM
            <span className="ml-2 rounded-full bg-[var(--color-border)] px-1.5 py-0.5 text-[10px]">
              {filteredLlmLogs.length}
            </span>
          </button>
        </div>

        <input
          type="text"
          placeholder={
            tab === "activity"
              ? "Filter by action, user, resource..."
              : tab === "executions"
                ? "Filter by tool, server, source..."
                : tab === "proxy"
                  ? "Filter by user, namespace, workspace..."
                  : "Filter by user, tokens, latency..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)] sm:w-72"
        />
      </div>

      {tab === "activity" ? (
        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Resource</th>
                <th className="px-3 py-2 text-left">Actor</th>
                <th className="px-3 py-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b align-top last:border-0 hover:bg-[var(--color-surface-muted)]/40">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-xs font-medium">{log.resource}</p>
                    {log.resourceId && (
                      <p className="max-w-[120px] truncate font-mono text-[10px] text-muted-foreground">
                        {log.resourceId}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {log.userEmail ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {Object.keys(log.metadata).length > 0 ? (
                      <span className="font-mono">
                        {Object.entries(log.metadata)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No audit events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : tab === "executions" ? (
        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Server / Tool</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Latency</th>
                <th className="px-3 py-2 text-left">Actor / Trace</th>
              </tr>
            </thead>
            <tbody>
              {filteredExecs.map((exec) => (
                <tr key={exec.id} className="border-b align-top last:border-0 hover:bg-[var(--color-surface-muted)]/40">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {new Date(exec.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{exec.serverName}</p>
                    <p className="font-mono text-xs">{exec.toolName}</p>
                    {exec.errorMessage && (
                      <p className="mt-1 max-w-lg truncate text-xs text-destructive">
                        {exec.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">{exec.source}</td>
                  <td className="px-3 py-2">
                    <Badge variant={exec.status === "success" ? "default" : "destructive"}>
                      {exec.status}
                    </Badge>
                    {exec.attemptCount > 1 && (
                      <p className="mt-1 text-xs text-muted-foreground">{exec.attemptCount} attempts</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{exec.latencyMs} ms</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    <p>{exec.actorUserId ?? "unknown"}</p>
                    <p>{exec.traceId ?? "—"}</p>
                  </td>
                </tr>
              ))}
              {filteredExecs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No MCP executions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : tab === "proxy" ? (
        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Target</th>
                <th className="px-3 py-2 text-left">Trace</th>
                <th className="px-3 py-2 text-left">Tool Name</th>
                <th className="px-3 py-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredProxyLogs.map((log) => {
                const metadata = log.metadata as Record<string, unknown>;
                const target =
                  typeof metadata.workspaceSlug === "string" && metadata.workspaceSlug
                    ? metadata.workspaceSlug
                    : typeof metadata.slug === "string" && metadata.slug
                      ? metadata.slug
                      : log.resourceId ?? "—";
                const traceId =
                  typeof metadata.traceId === "string" && metadata.traceId.length > 0
                    ? metadata.traceId
                    : null;
                const toolName = getProxyToolName(metadata);
                const details = Object.entries(metadata)
                  .filter(([key]) => !["traceId", "event", "toolName"].includes(key))
                  .map(([key, value]) => `${key}: ${String(value)}`)
                  .join(" · ");

                return (
                  <tr key={log.id} className="border-b align-top last:border-0 hover:bg-[var(--color-surface-muted)]/40">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {log.userEmail ?? log.userId ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {getProxyEventLabel(metadata)}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      <div className="font-medium text-[var(--color-text-secondary)]">{target}</div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {log.resource}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {traceId ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {toolName}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {details || "—"}
                    </td>
                  </tr>
                );
              })}
              {filteredProxyLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No proxy or namespace events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">LLM / Model</th>
                <th className="px-3 py-2 text-right">Tokens</th>
                <th className="px-3 py-2 text-right">Latency</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Workspace</th>
              </tr>
            </thead>
            <tbody>
              {filteredLlmLogs.map((log) => {
                const metadata = log.metadata as Record<string, unknown>;
                const inputTokens = typeof metadata.inputTokens === "number" ? metadata.inputTokens : 0;
                const outputTokens = typeof metadata.outputTokens === "number" ? metadata.outputTokens : 0;
                const totalTokens = typeof metadata.totalTokens === "number" ? metadata.totalTokens : 0;
                const latencyMs = typeof metadata.latencyMs === "number" ? metadata.latencyMs : 0;
                const ok = metadata.ok !== false;
                const model =
                  typeof metadata.model === "string" && metadata.model.length > 0
                    ? metadata.model
                    : null;
                const workspaceId =
                  typeof metadata.workspaceId === "string" && metadata.workspaceId.length > 0
                    ? metadata.workspaceId
                    : null;
                const workspace = workspaceId ? workspaceById.get(workspaceId) : null;

                return (
                  <tr key={log.id} className="border-b align-top last:border-0 hover:bg-[var(--color-surface-muted)]/40">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {log.userEmail ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      <div className="font-mono text-[var(--color-text-secondary)]">{model ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      <div className="font-mono">{formatTokenCount(totalTokens)}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        in {formatTokenCount(inputTokens)} · out {formatTokenCount(outputTokens)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      {latencyMs > 0 ? `${latencyMs} ms` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      <Badge variant={ok ? "default" : "destructive"}>
                        {ok ? "success" : "error"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      <div className="font-medium text-[var(--color-text-secondary)]">
                        {workspace ? workspace.name : workspaceId ?? "—"}
                      </div>
                      {workspace ? (
                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                          /{workspace.slug}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {filteredLlmLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No LLM test events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
