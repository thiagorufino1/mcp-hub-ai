"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useMemo, useState, useTransition } from "react";

import {
  deleteNamespace,
  setNamespaceEnabled,
  setNamespacePublished,
  type NamespaceRow,
} from "@/app/admin/namespaces/actions";
import { NamespaceForm } from "@/components/admin/namespace-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Cable,
  Check,
  CheckCircle2,
  Copy,
  Globe,
  Layers3,
  PencilLine,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Option = { id: string; displayName: string };
type McpOption = { id: string; name: string; description: string | null; transport: string };

type NamespaceStats = {
  total: number;
  enabled: number;
  disabled: number;
  published: number;
  unpublished: number;
  mcpLinks: number;
  toolLinks: number;
};

export function NamespacesAdminClient({
  groups,
  mcpServers,
  namespaces,
  users,
  stats,
}: {
  groups: Option[];
  mcpServers: McpOption[];
  namespaces: NamespaceRow[];
  users: Array<{ id: string; name: string | null; email: string | null }>;
  stats: NamespaceStats;
}) {
  const [form, setForm] = useState<NamespaceRow | null | undefined>();
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NamespaceRow | null>(null);
  const router = useRouter();
  const [isDeleting, startDeleteTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? namespaces.filter((n) =>
          [n.name, n.alias, n.description].some((v) => v?.toLowerCase().includes(q)),
        )
      : namespaces;
  }, [namespaces, search]);

  return (
    <div className="portal-page">
      <div className="portal-page-heading">
        <h1 className="text-2xl font-bold">Namespaces</h1>
        <p className="text-sm text-muted-foreground">Agrupamentos lógicos de MCP Servers.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <NamespaceKpiCard
          icon={Layers3}
          label="Namespaces"
          value={`${stats.enabled}/${stats.total}`}
          sub="namespaces ativos"
          tone="success"
        />
        <NamespaceKpiCard
          icon={Globe}
          label="Publicados"
          value={String(stats.published)}
          sub={`${stats.unpublished} privados`}
          tone={stats.published > 0 ? "info" : "neutral"}
        />
        <NamespaceKpiCard
          icon={Cable}
          label="Servidores vinculados"
          value={String(stats.mcpLinks)}
          sub="MCP Servers vinculados"
          tone={stats.mcpLinks > 0 ? "info" : "neutral"}
        />
        <NamespaceKpiCard
          icon={Wrench}
          label="Tools disponíveis"
          value={String(stats.toolLinks)}
          sub="tools disponíveis"
          tone={stats.toolLinks > 0 ? "success" : "neutral"}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-64">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar namespaces..."
            aria-label="Buscar namespaces"
            className="h-9 pl-9 text-[var(--color-text-secondary)]"
          />
        </div>
        <Button className="h-9 gap-1.5" onClick={() => setForm(null)}>
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>

      <div className="portal-table-shell overflow-x-auto">
        <table className="w-full min-w-[1240px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[28%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Namespace</th>
              <th className="px-4 py-3 text-center font-medium">MCP Servers</th>
              <th className="px-4 py-3 text-center font-medium">Tools</th>
              <th className="px-4 py-3 text-center font-medium">Ativo</th>
              <th className="px-4 py-3 text-center font-medium">Publicar</th>
              <th className="px-4 py-3 text-center font-medium">Endpoint</th>
              <th className="px-4 py-3 text-center font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ns) => (
              <tr
                key={ns.id}
                className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
                      <Layers3 className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/namespaces/${ns.id}`}
                        className="font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)] hover:underline"
                      >
                        {ns.name}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">/{ns.alias}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center text-xs text-muted-foreground">
                  <span className="font-medium text-[var(--color-text-secondary)]">{ns.mcpServerIds.length}</span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="font-medium text-[var(--color-text-secondary)]">{ns.toolsCount}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-center">
                    <Switch
                      checked={ns.enabled}
                      disabled={pendingId === ns.id}
                      onCheckedChange={async (enabled) => {
                        setPendingId(ns.id);
                        try {
                          await setNamespaceEnabled(ns.id, enabled);
                          router.refresh();
                        } finally {
                          setPendingId(null);
                        }
                      }}
                      aria-label={`${ns.enabled ? "Desabilitar" : "Habilitar"} ${ns.name}`}
                    />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-center">
                    <Switch
                      checked={ns.published}
                      disabled={pendingId === ns.id || !ns.enabled}
                      onCheckedChange={async (published) => {
                        setPendingId(ns.id);
                        try {
                          await setNamespacePublished(ns.id, published);
                          router.refresh();
                        } finally {
                          setPendingId(null);
                        }
                      }}
                      aria-label={`${ns.published ? "Despublicar" : "Publicar"} ${ns.name}`}
                    />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <p className="min-w-0 truncate font-mono text-xs text-muted-foreground text-center">
                      /api/mcp/namespaces/{ns.alias}
                    </p>
                    <button
                      type="button"
                      className="shrink-0 rounded p-1 text-muted-foreground transition hover:bg-[var(--color-surface-muted)] hover:text-foreground"
                      aria-label={`Copiar endpoint de ${ns.name}`}
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/api/mcp/namespaces/${ns.alias}`,
                        );
                        setCopiedId(ns.id);
                        window.setTimeout(() => setCopiedId((current) => (current === ns.id ? null : current)), 1600);
                      }}
                    >
                      {copiedId === ns.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-success)]"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <Link
                      href={`/admin/namespaces/${ns.id}`}
                      className="inline-flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full p-0 leading-none text-muted-foreground transition-[background-color,color] duration-150 hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] focus-visible:bg-[var(--color-primary-soft)] focus-visible:text-[var(--color-primary)]"
                      title="Editar"
                      aria-label={`Editar ${ns.name}`}
                    >
                      <PencilLine className="size-4" aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      disabled={isDeleting}
                      className="inline-flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full p-0 leading-none text-[var(--color-error)] transition-[background-color,color] duration-150 hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] focus-visible:bg-[var(--color-error-soft)] focus-visible:text-[var(--color-error)]"
                      title="Excluir"
                      onClick={() => setDeleteTarget(ns)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="font-semibold">
                    {namespaces.length === 0 ? "Nenhum namespace configurado" : "Nenhum namespace encontrado"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {namespaces.length === 0
                      ? "Crie um namespace para publicar endpoints MCP."
                      : "Tente um termo de busca diferente."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <NamespaceForm
        key={`${form?.id ?? "new"}-${form === undefined ? "closed" : "open"}`}
        open={form !== undefined}
        namespace={form ?? undefined}
        groups={groups}
        mcpServers={mcpServers}
        onClose={() => setForm(undefined)}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir namespace</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o namespace <strong>{deleteTarget?.name}</strong>? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {(deleteTarget?.toolsCount ?? 0) > 0 && (
            <div className="rounded-lg border border-[var(--color-warning)] bg-[var(--color-warning-soft)] p-3 text-sm text-[var(--color-warning)]">
              ⚠ Este namespace possui {deleteTarget?.toolsCount} tool(s) vinculada(s).
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                if (!deleteTarget) return;
                startDeleteTransition(async () => {
                  await deleteNamespace(deleteTarget.id);
                  setDeleteTarget(null);
                  router.refresh();
                });
              }}
            >
              {isDeleting ? "Excluindo..." : "Excluir namespace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NamespaceKpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone: "info" | "success" | "neutral" | "error";
}) {
  const color =
    tone === "success"
      ? "text-[var(--color-success)]"
      : tone === "error"
        ? "text-[var(--color-error)]"
        : tone === "neutral"
          ? "text-[var(--color-text-secondary)]"
          : "text-[var(--color-primary)]";
  const bg =
    tone === "success"
      ? "bg-[var(--color-success-soft)]"
      : tone === "error"
        ? "bg-[var(--color-error-soft)]"
        : tone === "neutral"
          ? "bg-[var(--color-surface-muted)]"
          : "bg-[var(--color-primary-soft)]";

  return (
    <div className="group flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(17,63,124,0.04)] transition-all">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <div>
        <p className={`text-[1.65rem] font-bold leading-none ${color}`}>{value}</p>
        {sub ? <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}
