"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { McpForm } from "@/components/admin/mcp-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Cable,
  Calendar,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  XCircle,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  deleteMcp,
  refreshMcpConfig,
  setMcpEnabled,
  setMcpToolPermission,
  type McpServerRow,
} from "./actions";

type Props = { mcps: McpServerRow[] };

export function McpAdminClient({ mcps }: Props) {
  const [form, setForm] = useState<{ open: boolean; mcp?: McpServerRow }>({ open: false });
  const [search, setSearch] = useState("");
  const filteredMcps = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return mcps;

    return mcps.filter((mcp) =>
      [mcp.name, mcp.description, mcp.url, mcp.command, mcp.transport].some((value) =>
        value?.toLocaleLowerCase("pt-BR").includes(query),
      ),
    );
  }, [mcps, search]);

  return (
    <div className="portal-page">
      <div className="portal-page-heading flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MCP Servers</h1>
          <p className="text-sm text-muted-foreground">Connections, registry health and runtime governance.</p>
        </div>
        <Button onClick={() => setForm({ open: true })}>+ Add MCP</Button>
      </div>

      <div className="relative max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search MCP servers..."
          aria-label="Search MCP servers"
          className="pl-9 text-[var(--color-text-secondary)]"
        />
      </div>

      <div className="portal-table-shell overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm text-[var(--color-text-secondary)]">
          <thead>
            <tr>
              <th className="px-4 py-3">Server</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tools</th>
              <th className="px-4 py-3">Last check</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMcps.map((mcp) => (
              <McpRow
                key={mcp.id}
                mcp={mcp}
                onEdit={() => setForm({ open: true, mcp })}
              />
            ))}
            {filteredMcps.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <p className="font-semibold">
                    {mcps.length === 0 ? "No MCP servers configured" : "No MCP servers found"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mcps.length === 0
                      ? "Add the first server to populate the MCP tool registry."
                      : "Try searching by server name, endpoint or transport."}
                  </p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <McpForm
        key={`${form.mcp?.id ?? "new"}-${form.open ? "open" : "closed"}`}
        open={form.open}
        mcp={form.mcp}
        onClose={() => setForm({ open: false })}
      />
    </div>
  );
}

function McpRow({ mcp, onEdit }: { mcp: McpServerRow; onEdit: () => void }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [toggling, startToggle] = useTransition();
  const [enabled, setEnabled] = useState(mcp.enabled);
  const [status, setStatus] = useState(mcp.healthStatus);
  const [lastCheck, setLastCheck] = useState<Date | null>(mcp.lastHealthCheckAt);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabledTools = mcp.registryTools.filter((tool) => tool.enabled).length;
  const endpoint = mcp.transport === "stdio"
    ? [mcp.command, ...mcp.args].filter(Boolean).join(" ")
    : mcp.url;

  function refresh() {
    setError(null);
    startRefresh(async () => {
      const result = await refreshMcpConfig(mcp.id);
      setStatus(result.ok ? result.status ?? "connected" : "error");
      setLastCheck(new Date());
      setError(result.error ?? null);
      router.refresh();
    });
  }

  function toggleEnabled() {
    const nextEnabled = !enabled;
    startToggle(async () => {
      await setMcpEnabled(mcp.id, nextEnabled);
      setEnabled(nextEnabled);
      router.refresh();
    });
  }

  return (
    <>
      <tr className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55">
        <td className="px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm">
              <Cable className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="max-w-[260px] truncate font-semibold text-[var(--color-text-secondary)]">
                {mcp.name}
              </p>
              <p
                className="mt-0.5 max-w-[340px] truncate font-mono text-xs text-muted-foreground"
                title={endpoint ?? undefined}
              >
                {endpoint || "No endpoint configured"}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex max-w-[240px] flex-wrap items-center gap-2">
            <ConnectionStatus status={status} enabled={enabled} refreshing={refreshing} />
            <Badge variant="info" className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-normal">
              {transportLabel(mcp.transport)}
            </Badge>
            {mcp.lastLatencyMs !== null ? (
              <span className="text-xs text-muted-foreground">{mcp.lastLatencyMs} ms</span>
            ) : null}
          </div>
          {mcp.circuitState !== "closed" ? (
            <p className="mt-2 text-xs text-[var(--color-warning)]">Circuit {mcp.circuitState}</p>
          ) : null}
          {error ? (
            <p className="mt-2 max-w-[240px] truncate text-xs text-[var(--color-error)]" title={error}>
              {error}
            </p>
          ) : null}
        </td>
        <td className="px-4 py-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-[var(--color-primary)]"
            onClick={() => setExpanded((current) => !current)}
            disabled={mcp.registryTools.length === 0}
          >
            <ChevronDown
              aria-hidden="true"
              className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
            />
            <span>{enabledTools}/{mcp.registryTools.length} tools enabled</span>
          </button>
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar aria-hidden="true" className="size-3.5" />
            <span>
              {lastCheck
                ? new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(lastCheck))
                : "Never checked"}
            </span>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-muted-foreground"
              onClick={refresh}
              disabled={refreshing || !enabled}
              aria-label="Refresh MCP server"
              title="Refresh MCP server"
            >
              {refreshing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-8 rounded-full",
                enabled
                  ? "text-[var(--color-success)] hover:bg-[var(--color-success-soft)]"
                  : "text-muted-foreground",
              )}
              onClick={toggleEnabled}
              disabled={toggling}
              aria-label={enabled ? "Disable MCP server" : "Enable MCP server"}
              title={enabled ? "Disable MCP server" : "Enable MCP server"}
            >
              {toggling ? <LoaderCircle className="animate-spin" /> : enabled ? <CheckCircle2 /> : <XCircle />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-muted-foreground"
              onClick={onEdit}
              aria-label="Edit MCP server"
              title="Edit MCP server"
            >
              <PencilLine />
            </Button>
            <form action={async () => deleteMcp(mcp.id)}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)]"
                aria-label="Delete MCP server"
                title="Delete MCP server"
              >
                <Trash2 />
              </Button>
            </form>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]/50">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {mcp.registryTools.map((tool) => (
                <ToolPermissionCard
                  key={tool.id}
                  mcpServerId={mcp.id}
                  tool={tool}
                />
              ))}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

type ToolPermission = "allow" | "approval" | "blocked";

function ToolPermissionCard({
  mcpServerId,
  tool,
}: {
  mcpServerId: string;
  tool: McpServerRow["registryTools"][number];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [permission, setPermission] = useState<ToolPermission>(
    normalizeToolPermission(tool.permissionMode, tool.enabled),
  );
  const options: Array<{
    label: string;
    value: ToolPermission;
    icon: typeof CheckCircle2;
  }> = [
    { label: "Permitir", value: "allow", icon: CheckCircle2 },
    { label: "Requer aprovação", value: "approval", icon: Shield },
    { label: "Bloqueado", value: "blocked", icon: XCircle },
  ];

  function changePermission(nextPermission: ToolPermission) {
    if (nextPermission === permission) return;
    startTransition(async () => {
      await setMcpToolPermission(mcpServerId, tool.id, nextPermission);
      setPermission(nextPermission);
      router.refresh();
    });
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-mono text-xs font-medium text-[var(--color-text-secondary)]",
            tool.destructive && "text-[var(--color-error)]",
          )}
          title={tool.displayName ?? tool.name}
        >
          {tool.displayName ?? tool.name}
          {tool.destructive ? " !" : ""}
        </p>
        {tool.readOnly ? <p className="mt-1 text-[10px] text-muted-foreground">Somente leitura</p> : null}
      </div>
      <div
        className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1"
        aria-label={`Permissão para ${tool.displayName ?? tool.name}`}
      >
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
                "flex size-7 items-center justify-center rounded-md text-muted-foreground transition",
                selected && option.value === "allow" &&
                  "bg-[var(--color-success-soft)] text-[var(--color-success)] shadow-sm",
                selected && option.value === "approval" &&
                  "bg-[var(--color-warning-soft)] text-[var(--color-warning)] shadow-sm",
                selected && option.value === "blocked" &&
                  "bg-[var(--color-error-soft)] text-[var(--color-error)] shadow-sm",
                !selected && "hover:bg-[var(--color-surface)] hover:text-[var(--color-text-secondary)]",
              )}
              aria-label={option.label}
              aria-pressed={selected}
              title={option.label}
            >
              {pending && selected ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className="size-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function normalizeToolPermission(permissionMode: string, enabled: boolean): ToolPermission {
  if (!enabled || permissionMode === "blocked") return "blocked";
  return permissionMode === "approval" ? "approval" : "allow";
}

function ConnectionStatus({
  enabled,
  refreshing,
  status,
}: {
  enabled: boolean;
  refreshing: boolean;
  status: string;
}) {
  const connected = enabled && status === "connected";
  const failed = enabled && status === "error";
  const authorizationRequired = enabled && status === "authorization_required";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        connected && "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]",
        failed && "border-[var(--color-error)] bg-[var(--color-error-soft)] text-[var(--color-error)]",
        authorizationRequired &&
          "border-[var(--color-warning)] bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
        !connected &&
          !failed &&
          !authorizationRequired &&
          "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-muted-foreground",
      )}
    >
      {refreshing ? (
        <LoaderCircle className="size-3 animate-spin" />
      ) : connected ? (
        <CheckCircle2 className="size-3" />
      ) : (
        <XCircle className="size-3" />
      )}
      {refreshing
        ? "Validating"
        : !enabled
          ? "Disabled"
          : connected
            ? "Connected"
            : authorizationRequired
              ? "User OAuth"
              : failed
                ? "Error"
                : "Not checked"}
    </span>
  );
}

function transportLabel(transport: string) {
  if (transport === "streamable-http") return "HTTP";
  return transport.toUpperCase();
}
