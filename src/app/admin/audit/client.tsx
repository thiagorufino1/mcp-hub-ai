"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

type Metrics = {
  total24h: number;
  failures24h: number;
  averageLatency: number;
};

const ACTION_COLORS: Record<string, string> = {
  "mcp.create": "bg-green-100 text-green-800 border-green-200",
  "mcp.update": "bg-blue-100 text-blue-800 border-blue-200",
  "mcp.delete": "bg-red-100 text-red-800 border-red-200",
  "mcp.enable": "bg-green-100 text-green-800 border-green-200",
  "mcp.disable": "bg-orange-100 text-orange-800 border-orange-200",
  "mcp.tool.enable": "bg-green-100 text-green-800 border-green-200",
  "mcp.tool.disable": "bg-orange-100 text-orange-800 border-orange-200",
  "mcp.tool.permission": "bg-blue-100 text-blue-800 border-blue-200",
  "llm.create": "bg-green-100 text-green-800 border-green-200",
  "llm.update": "bg-blue-100 text-blue-800 border-blue-200",
  "llm.delete": "bg-red-100 text-red-800 border-red-200",
  "llm.test": "bg-purple-100 text-purple-800 border-purple-200",
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

export function AuditClient({
  auditLogs,
  executions,
  metrics,
}: {
  auditLogs: AuditLogEntry[];
  executions: ExecutionEntry[];
  metrics: Metrics;
}) {
  const [tab, setTab] = useState<"activity" | "executions">("activity");
  const [search, setSearch] = useState("");

  const filteredLogs = auditLogs.filter(
    (l) =>
      !search ||
      l.action.includes(search) ||
      (l.userEmail ?? "").toLowerCase().includes(search.toLowerCase()) ||
      l.resource.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredExecs = executions.filter(
    (e) =>
      !search ||
      e.toolName.includes(search) ||
      e.serverName.toLowerCase().includes(search.toLowerCase()) ||
      e.source.includes(search),
  );

  return (
    <div className="portal-page">
      <div className="portal-page-heading">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          All portal actions and MCP tool executions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="MCP Executions (24h)" value={metrics.total24h} />
        <MetricCard title="Failures (24h)" value={metrics.failures24h} />
        <MetricCard title="Avg latency (24h)" value={`${metrics.averageLatency} ms`} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
          <button
            onClick={() => setTab("activity")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              tab === "activity"
                ? "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
                : "text-muted-foreground hover:bg-[var(--color-surface-muted)]/50",
            )}
          >
            Activity Log
            <span className="ml-2 rounded-full bg-[var(--color-border)] px-1.5 py-0.5 text-[10px]">
              {auditLogs.length}
            </span>
          </button>
          <button
            onClick={() => setTab("executions")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-l border-[var(--color-border)]",
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
        </div>

        <input
          type="text"
          placeholder={tab === "activity" ? "Filter by action, user, resource…" : "Filter by tool, server, source…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)] w-72"
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
                    <p className="font-medium text-xs">{log.resource}</p>
                    {log.resourceId && (
                      <p className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {log.resourceId}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {log.userEmail ?? log.userId ?? "—"}
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
      ) : (
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
      )}
    </div>
  );
}
