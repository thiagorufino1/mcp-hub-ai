"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { McpForm } from "@/components/admin/mcp-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Layers3,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  Shield,
  Wrench,
  Trash2,
  XCircle,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

import {
  deleteMcp,
  refreshMcpConfig,
  setMcpEnabled,
  setMcpToolPermission,
  type McpServerRow,
} from "../actions";

type McpDetail = {
  id: string;
  name: string;
  description: string | null;
  transport: string;
  command: string | null;
  args: string[];
  url: string | null;
  enabled: boolean;
  authType: string;
  healthStatus: string;
  lastHealthCheckAt: Date | null;
  lastLatencyMs: number | null;
  consecutiveFailures: number;
  connectionTimeoutMs: number;
  toolTimeoutMs: number;
  maxRetries: number;
  failureThreshold: number;
  circuitCooldownMs: number;
  maxConcurrentCalls: number;
  rateLimitRequests: number;
  rateLimitWindowMs: number;
  circuitState: string;
  circuitOpenedAt: Date | null;
  createdAt: string;
  updatedAt: string;
  registryTools: Array<{
    id: string;
    name: string;
    displayName: string | null;
    description: string | null;
    enabled: boolean;
    permissionMode: string;
    readOnly: boolean;
    destructive: boolean;
  }>;
  namespaces: Array<{
    id: string;
    enabled: boolean;
    namespaceId: string;
    namespace: {
      id: string;
      name: string;
      alias: string;
      enabled: boolean;
      published: boolean;
    };
  }>;
};

function transportLabel(transport: string) {
  return transport === "stdio"
    ? "STDIO"
    : transport === "sse"
      ? "SSE"
      : transport === "streamable_http"
        ? "STREAMABLE-HTTP"
        : transport.toUpperCase();
}

function healthStatusMeta(healthStatus: string) {
  switch (healthStatus) {
    case "connected":
      return { label: "Connected", variant: "success" as const };
    case "authorization_required":
      return { label: "Auth required", variant: "info" as const };
    case "error":
      return { label: "Error", variant: "error" as const };
    case "unknown":
      return { label: "Unknown", variant: "secondary" as const };
    default:
      return { label: healthStatus || "Unknown", variant: "secondary" as const };
  }
}

export function McpServerDetailClient({ mcp }: { mcp: McpDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [enabled, setEnabled] = useState(mcp.enabled);
  const [lastCheck, setLastCheck] = useState<Date | null>(mcp.lastHealthCheckAt);

  const endpoint = mcp.transport === "stdio"
    ? [mcp.command, ...mcp.args].filter(Boolean).join(" ")
    : mcp.url;

  const enabledTools = mcp.registryTools.filter((tool) => tool.enabled).length;
  const visibleTools = useMemo(
    () =>
      mcp.registryTools.filter((tool) =>
        [tool.name, tool.displayName ?? "", tool.description ?? "", tool.permissionMode]
          .some((value) => value.toLowerCase().includes(search.toLowerCase())),
      ),
    [mcp.registryTools, search],
  );
  const activeNamespaces = mcp.namespaces.filter((entry) => entry.enabled).length;
  const health = healthStatusMeta(mcp.healthStatus);
  const formMcp: McpServerRow = {
    id: mcp.id,
    name: mcp.name,
    description: mcp.description,
    transport: mcp.transport,
    command: mcp.command,
    args: mcp.args,
    url: mcp.url,
    env: {},
    headers: {},
    authType: mcp.authType,
    sharedSecret: null,
    oauthClientId: null,
    oauthClientSecret: null,
    oauthScopes: null,
    enabled,
    healthStatus: mcp.healthStatus,
    lastHealthCheckAt: mcp.lastHealthCheckAt,
    lastLatencyMs: mcp.lastLatencyMs,
    consecutiveFailures: mcp.consecutiveFailures,
    connectionTimeoutMs: mcp.connectionTimeoutMs,
    toolTimeoutMs: mcp.toolTimeoutMs,
    maxRetries: mcp.maxRetries,
    failureThreshold: mcp.failureThreshold,
    circuitCooldownMs: mcp.circuitCooldownMs,
    maxConcurrentCalls: mcp.maxConcurrentCalls,
    rateLimitRequests: mcp.rateLimitRequests,
    rateLimitWindowMs: mcp.rateLimitWindowMs,
    circuitState: mcp.circuitState,
    circuitOpenedAt: mcp.circuitOpenedAt,
    registryTools: mcp.registryTools,
  };

  function copyEndpoint() {
    if (!endpoint) return;
    void navigator.clipboard.writeText(endpoint).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  function toggleEnabled(nextEnabled: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await setMcpEnabled(mcp.id, nextEnabled);
        setEnabled(nextEnabled);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not update the MCP server.");
      }
    });
  }

  function refresh() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await refreshMcpConfig(mcp.id);
        setLastCheck(new Date());
        setError(result.error ?? null);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not refresh the MCP server.");
      }
    });
  }

  return (
    <div className="portal-page max-w-6xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Link
          href="/admin/mcp"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-[var(--color-primary)]"
        >
          <ArrowRight aria-hidden="true" className="size-4 rotate-180" />
          Back to MCP Servers
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={health.variant}>{health.label}</Badge>
          <Badge variant={enabled ? "success" : "secondary"}>{enabled ? "Enabled" : "Disabled"}</Badge>
          <Badge variant="info">{transportLabel(mcp.transport)}</Badge>
          {mcp.authType !== "none" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-warning)]">
              <Shield className="size-3" />
              Autenticação requerida
            </span>
          )}
        </div>
      </div>

      <div className="portal-page-heading flex-row items-start justify-between gap-5">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{mcp.name}</h1>
          {mcp.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {mcp.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No description.</p>
          )}
        </div>

        <div className="flex max-w-full items-center gap-2">
          <code className="truncate rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 font-mono text-xs text-muted-foreground">
            {endpoint ?? "No endpoint configured"}
          </code>
          <Button
            size="sm"
            variant="outline"
            className="size-9 rounded-full px-0"
            onClick={copyEndpoint}
            aria-label="Copy MCP server endpoint"
            disabled={!endpoint}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="size-9 rounded-full px-0"
            onClick={() => setFormOpen(true)}
            aria-label="Edit MCP server settings"
          >
            <PencilLine aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "size-9 rounded-full px-0",
              enabled ? "text-[var(--color-success)]" : "text-muted-foreground",
            )}
            onClick={() => toggleEnabled(!enabled)}
            aria-label={enabled ? "Disable MCP server" : "Enable MCP server"}
          >
            {enabled ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
          </Button>
          {mcp.authType === "oauth_delegated" ? (
            <span title="Sincronização não disponível para servidores com autenticação delegada">
              <Button
                size="sm"
                variant="outline"
                className="size-9 rounded-full px-0"
                disabled
                aria-label="Refresh MCP server"
              >
                <RefreshCw aria-hidden="true" />
              </Button>
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="size-9 rounded-full px-0"
              onClick={refresh}
              aria-label="Refresh MCP server"
            >
              <RefreshCw aria-hidden="true" />
            </Button>
          )}
          <form action={async () => { await deleteMcp(mcp.id); }}>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="size-9 rounded-full px-0 text-[var(--color-error)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
              aria-label="Delete MCP server"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </form>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--color-error)] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Namespaces" value={String(mcp.namespaces.length)} tone="info" />
        <KpiCard label="Active Namespaces" value={String(activeNamespaces)} tone="success" />
        <KpiCard label="Tools" value={String(mcp.registryTools.length)} tone="neutral" />
        <KpiCard label="Enabled Tools" value={String(enabledTools)} tone="success" />
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Tools</h2>
            <p className="text-sm text-muted-foreground">
              Global tool permissions for this MCP server.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tools..."
              aria-label="Search tools"
              className="pl-9"
            />
          </div>
        </div>

        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[66%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-4 py-3 font-medium">Tool</th>
                <th className="px-4 py-3 text-center font-medium">
                  <span className="inline-block translate-x-48">Permission</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleTools.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-muted-foreground">
                    No tools match this search.
                  </td>
                </tr>
              ) : visibleTools.map((tool) => (
                <ToolRow key={tool.id} mcpServerId={mcp.id} tool={tool} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {visibleTools.length} tool{visibleTools.length === 1 ? "" : "s"} shown
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Namespaces</h2>
            <p className="text-sm text-muted-foreground">
              Namespaces that include this MCP server.
            </p>
          </div>
        </div>

        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
            <colgroup>
              <col className="w-[42%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-4 py-3 font-medium">Namespace</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Access</th>
                <th className="px-4 py-3 text-center font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {mcp.namespaces.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    This MCP server is not assigned to any namespace.
                  </td>
                </tr>
              ) : mcp.namespaces.map((entry) => (
                <tr key={entry.id} className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
                        <Layers3 className="size-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--color-text-secondary)]">{entry.namespace.name}</p>
                        <p className="truncate text-xs text-muted-foreground">/{entry.namespace.alias}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Badge variant={entry.namespace.enabled ? "success" : "secondary"}>
                      {entry.namespace.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Badge variant={entry.namespace.published ? "info" : "secondary"}>
                      {entry.namespace.published ? "Published" : "Private"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Link
                      href={`/admin/namespaces/${entry.namespace.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                      aria-label={`Open namespace ${entry.namespace.name}`}
                    >
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {mcp.namespaces.length} namespace{mcp.namespaces.length === 1 ? "" : "s"} total
        </p>
      </section>

      <McpForm
        key={`${mcp.id}-${formOpen ? "open" : "closed"}`}
        open={formOpen}
        mcp={formMcp}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}

function ToolRow({
  mcpServerId,
  tool,
}: {
  mcpServerId: string;
  tool: McpDetail["registryTools"][number];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [permission, setPermission] = useState<"allow" | "blocked">(
    normalizeToolPermission(tool.permissionMode, tool.enabled),
  );

  const options: Array<{
    label: string;
    value: "allow" | "blocked";
    icon: typeof CheckCircle2;
  }> = [
    { label: "Allow", value: "allow", icon: CheckCircle2 },
    { label: "Blocked", value: "blocked", icon: XCircle },
  ];

  function changePermission(nextPermission: "allow" | "blocked") {
    if (nextPermission === permission) return;
    startTransition(async () => {
      await setMcpToolPermission(mcpServerId, tool.id, nextPermission);
      setPermission(nextPermission);
      router.refresh();
    });
  }

  return (
    <tr className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
            <Wrench className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p
              className={cn(
                "truncate font-medium text-[var(--color-text-secondary)]",
                tool.destructive && "text-[var(--color-error)]",
              )}
              title={tool.displayName ?? tool.name}
            >
              {tool.displayName ?? tool.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={tool.description ?? undefined}>
              {tool.description ?? "No description."}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="inline-flex translate-x-48 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1" aria-label={`Permission for ${tool.displayName ?? tool.name}`}>
            {options.map((option) => {
              const Icon = option.icon;
              const selected = permission === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => changePermission(option.value)}
                  disabled={pending}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition whitespace-nowrap",
                    selected && option.value === "allow" &&
                      "bg-[var(--color-success-soft)] text-[var(--color-success)] shadow-sm",
                    selected && option.value === "blocked" &&
                      "bg-[var(--color-error-soft)] text-[var(--color-error)] shadow-sm",
                    !selected && "text-muted-foreground hover:bg-[var(--color-surface)] hover:text-[var(--color-text-secondary)]",
                  )}
                  aria-label={option.label}
                  aria-pressed={selected}
                  title={option.label}
                >
                  {pending && selected ? <LoaderCircle className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
                  <span>{option.label}</span>
                </button>
              );
            })}
        </div>
      </td>
    </tr>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "info" | "success" | "neutral";
}) {
  const valueClass = tone === "success"
    ? "text-[var(--color-success)]"
    : tone === "info"
      ? "text-[var(--color-primary)]"
      : "text-[var(--color-text-secondary)]";

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-3xl font-semibold", valueClass)}>{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeToolPermission(permissionMode: string, enabled: boolean): "allow" | "blocked" {
  if (!enabled || permissionMode === "blocked") return "blocked";
  return "allow";
}

