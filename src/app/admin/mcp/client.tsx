"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { McpForm } from "@/components/admin/mcp-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Cable,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import {
  deleteMcp,
  refreshMcpConfig,
  setMcpEnabled,
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
        <table className="w-full min-w-[1240px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Server</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Transport</th>
              <th className="px-4 py-3 text-center font-medium">Latency</th>
              <th className="px-4 py-3 text-center font-medium">Tools</th>
              <th className="px-4 py-3 text-center font-medium">Enabled</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMcps.map((mcp) => (
              <McpRow key={mcp.id} mcp={mcp} />
            ))}
            {filteredMcps.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
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

function McpRow({ mcp }: { mcp: McpServerRow }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [toggling, startToggle] = useTransition();
  const [enabled, setEnabled] = useState(mcp.enabled);
  const [error, setError] = useState<string | null>(null);
  const enabledTools = mcp.registryTools.filter((tool) => tool.enabled).length;
  const endpoint = mcp.transport === "stdio"
    ? [mcp.command, ...mcp.args].filter(Boolean).join(" ")
    : mcp.url;
  const health = getHealthStatusMeta(mcp.healthStatus);

  function refresh() {
    setError(null);
    startRefresh(async () => {
      const result = await refreshMcpConfig(mcp.id);
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
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
              <Cable className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/admin/mcp/${mcp.id}`}
                className="truncate font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)] hover:underline"
                aria-label={`Open details for ${mcp.name}`}
                title="Open MCP server details"
              >
                {mcp.name}
              </Link>
              <p
                className="mt-0.5 truncate font-mono text-xs text-muted-foreground"
                title={endpoint ?? undefined}
              >
                {endpoint || "No endpoint configured"}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 text-center">
          <Badge variant={health.variant} className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-normal">
            {health.label}
          </Badge>
        </td>
        <td className="px-4 py-4 text-center">
          <Badge variant="info" className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-normal">
            {transportLabel(mcp.transport)}
          </Badge>
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-center text-xs text-muted-foreground">
          {mcp.lastLatencyMs !== null ? `${mcp.lastLatencyMs} ms` : "-"}
        </td>
        <td className="px-4 py-4 text-center">
          <span className="text-xs text-muted-foreground">
            {enabledTools}/{mcp.registryTools.length}
          </span>
        </td>
        <td className="px-4 py-4">
          <div className="flex justify-center">
            <Switch
              checked={enabled}
              disabled={toggling}
              onCheckedChange={toggleEnabled}
              aria-label={enabled ? "Disable MCP server" : "Enable MCP server"}
            />
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-muted-foreground hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
              onClick={refresh}
              disabled={refreshing || !enabled}
              aria-label="Refresh MCP server"
              title="Refresh MCP server"
            >
              {refreshing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
            </Button>
            <form action={async () => deleteMcp(mcp.id)}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
                aria-label="Delete MCP server"
                title="Delete MCP server"
              >
              <Trash2 />
              </Button>
            </form>
          </div>
          {error ? (
            <p className="mt-2 max-w-[220px] truncate text-center text-xs text-[var(--color-error)]" title={error}>
              {error}
            </p>
          ) : null}
        </td>
      </tr>
    </>
  );
}

function transportLabel(transport: string) {
  if (transport === "streamable-http") return "HTTP";
  return transport.toUpperCase();
}

function getHealthStatusMeta(healthStatus: string) {
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
