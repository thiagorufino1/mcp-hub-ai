"use client";

import type React from "react";
import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { McpForm } from "@/components/admin/mcp-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Cable,
  LoaderCircle,
  RadioTower,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Wrench,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteMcp,
  exportMcpServers,
  importMcpServers,
  refreshMcpConfig,
  setMcpEnabled,
  type McpServerRow,
} from "./actions";

type Stats = {
  total: number;
  toolsTotal: number;
  byTransport: Record<string, number>;
  withAuth: number;
  disabled: number;
};

type Props = { mcps: McpServerRow[]; stats: Stats };

export function McpAdminClient({ mcps, stats }: Props) {
  const [form, setForm] = useState<{ open: boolean; mcp?: McpServerRow }>({ open: false });
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [importResult, setImportResult] = useState<{
    imported: string[];
    skipped: string[];
    errors: string[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    startTransition(async () => {
      const json = await exportMcpServers();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mcp-servers-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const text = await file.text();
    startTransition(async () => {
      try {
        const result = await importMcpServers(text);
        setImportResult(result);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "Erro ao importar.");
      }
    });
    e.target.value = "";
  }

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
            Importar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button onClick={() => setForm({ open: true })}>+ Add MCP</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <McpKpiCard icon={Cable} label="Servidores" value={String(stats.total)} sub={`${stats.total - stats.disabled} ativos`} tone={stats.disabled > 0 ? "error" : "neutral"} />
        <McpKpiCard icon={Wrench} label="Tools" value={String(stats.toolsTotal)} sub="habilitadas no registry" tone="info" />
        <McpKpiCard icon={Shield} label="Autenticação" value={String(stats.withAuth)} sub="servidores com auth" tone="neutral" />
        <div className="group flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(17,63,124,0.04)] transition-all">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Transport</p>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
              <RadioTower className="size-4" />
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.byTransport).map(([t, count]) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-[11px] font-medium">
                <span className="font-bold text-[var(--color-primary)]">{count}</span>
                <span className="text-muted-foreground">{t === "streamable-http" ? "HTTP" : t.toUpperCase()}</span>
              </span>
            ))}
            {Object.keys(stats.byTransport).length === 0 && (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        </div>
      </div>

      {importResult && (
        <Dialog open onOpenChange={() => setImportResult(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resultado da Importação</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {importResult.imported.length > 0 && (
                <div>
                  <p className="font-medium text-[var(--color-success)]">
                    ✓ {importResult.imported.length} importado(s)
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {importResult.imported.map((n) => <li key={n}>{n}</li>)}
                  </ul>
                </div>
              )}
              {importResult.skipped.length > 0 && (
                <div>
                  <p className="font-medium text-[var(--color-warning)]">
                    ⚠ {importResult.skipped.length} ignorado(s) por conflito de nome
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {importResult.skipped.map((n) => <li key={n}>{n}</li>)}
                  </ul>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div>
                  <p className="font-medium text-[var(--color-error)]">
                    ✗ {importResult.errors.length} com erro
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
              {importResult.imported.length === 0 &&
                importResult.skipped.length === 0 &&
                importResult.errors.length === 0 && (
                  <p>Nenhum servidor encontrado no arquivo.</p>
                )}
            </div>
            <DialogFooter>
              <Button onClick={() => setImportResult(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {importError && (
        <p className="text-sm text-[var(--color-error)]">{importError}</p>
      )}

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

function McpKpiCard({ icon: Icon, label, value, sub, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone: "info" | "success" | "neutral" | "error";
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
    <div className="group flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(17,63,124,0.04)] transition-all">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
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
