"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  deleteNamespace,
  setNamespaceEnabled,
  setNamespacePublished,
  type NamespaceRow,
} from "@/app/admin/namespaces/actions";
import { NamespaceForm } from "@/components/admin/namespace-form";
import { Button } from "@/components/ui/button";
import { Check, Copy, Layers3, PencilLine, Search, Trash2 } from "@/components/ui/icons";
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 mb-4">
        {[
          { label: "Total", value: stats.total },
          { label: "Habilitados", value: stats.enabled },
          { label: "Publicados", value: stats.published },
          { label: "Servidores vinculados", value: stats.mcpLinks },
          { label: "Tools disponíveis", value: stats.toolLinks },
          { label: "Desabilitados", value: stats.disabled, error: stats.disabled > 0 },
          { label: "Não publicados", value: stats.unpublished },
        ].map(({ label, value, error }) => (
          <div key={label} className="rounded-xl border bg-[var(--color-surface)] px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${error ? "text-[var(--color-error)]" : ""}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="portal-page-heading flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Namespaces</h1>
          <p className="text-sm text-muted-foreground">
            Curated MCP server collections exposed as a single endpoint.
          </p>
        </div>
        <Button onClick={() => setForm(null)}>+ Add namespace</Button>
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search namespaces..."
          className="pl-9 text-[var(--color-text-secondary)]"
        />
      </div>

      <div className="portal-table-shell overflow-x-auto">
        <table className="w-full min-w-[1080px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[25%]" />
            <col className="w-[7%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="px-4 py-3">Namespace</th>
              <th className="px-4 py-3 text-center">MCP Servers</th>
              <th className="px-4 py-3 text-center">Tools</th>
              <th className="px-4 py-3 text-center">Enabled</th>
              <th className="px-4 py-3 text-center">Publish</th>
              <th className="px-4 py-3 text-center">Endpoint</th>
              <th className="px-4 py-3 text-center">Actions</th>
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
                      <p className="font-mono text-xs text-muted-foreground">Alias: /{ns.alias}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center text-xs text-muted-foreground">
                  <div>
                    {ns.mcpServerIds.length} server{ns.mcpServerIds.length !== 1 ? "s" : ""}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="text-xs text-muted-foreground">
                    {ns.toolsCount} tool{ns.toolsCount !== 1 ? "s" : ""}
                  </div>
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
                        } finally {
                          setPendingId(null);
                        }
                      }}
                      aria-label={`${ns.enabled ? "Disable" : "Enable"} ${ns.name}`}
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
                        } finally {
                          setPendingId(null);
                        }
                      }}
                      aria-label={`${ns.published ? "Unpublish" : "Publish"} ${ns.name}`}
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
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 leading-none text-muted-foreground transition-[background-color,color] duration-150 hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] focus-visible:bg-[var(--color-primary-soft)] focus-visible:text-[var(--color-primary)]"
                      aria-label={`Copy endpoint for ${ns.name}`}
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/api/mcp/namespaces/${ns.alias}`,
                        );
                        setCopiedId(ns.id);
                        window.setTimeout(() => setCopiedId((current) => (current === ns.id ? null : current)), 1600);
                      }}
                    >
                      {copiedId === ns.id ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : (
                        <Copy className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <Link
                      href={`/admin/namespaces/${ns.id}`}
                      className="inline-flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full border-0 bg-transparent p-0 leading-none text-muted-foreground transition-[background-color,color] duration-150 hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] focus-visible:bg-[var(--color-primary-soft)] focus-visible:text-[var(--color-primary)]"
                      title="Edit"
                      aria-label={`Edit ${ns.name}`}
                    >
                      <PencilLine className="size-4" aria-hidden="true" />
                    </Link>
                    <form action={async () => { await deleteNamespace(ns.id); }}>
                      <button
                        type="submit"
                        className="inline-flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full border-0 bg-transparent p-0 leading-none text-[var(--color-error)] transition-[background-color,color] duration-150 hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] focus-visible:bg-[var(--color-error-soft)] focus-visible:text-[var(--color-error)]"
                        title="Delete"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="font-semibold">
                    {namespaces.length === 0 ? "No namespaces configured" : "No namespaces found"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {namespaces.length === 0
                      ? "Create a namespace to publish MCP endpoints."
                      : "Try a different search term."}
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
    </div>
  );
}
