"use client";

import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GroupForm } from "@/components/admin/group-form";
import { deleteGroup, syncAllGroups } from "./actions";
import type { GroupRow } from "./actions";
import { RefreshCw, Search, Trash2, User } from "@/components/ui/icons";

export function GroupsAdminClient({ groups }: { groups: GroupRow[] }) {
  const [form, setForm] = useState<{ open: boolean; group?: GroupRow }>({ open: false });
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GroupRow | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups.filter((group) =>
      [
        group.displayName,
        group.entraGroupId,
        group.isActive ? "active" : "inactive",
        String(group.memberCount),
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [groups, search]);

  return (
    <div className="portal-page">
      <div className="portal-page-heading flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-sm text-muted-foreground">
            Registre grupos do Entra ID para controlar o acesso aos namespaces.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={syncAllGroups}>
            <Button type="submit" variant="outline" className="rounded-lg">
              <RefreshCw className="size-4" aria-hidden="true" />
              Sincronizar grupos
            </Button>
          </form>
          <Button onClick={() => setForm({ open: true })}>+ Adicionar grupo</Button>
        </div>
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
          placeholder="Buscar grupos..."
          className="pl-9 text-[var(--color-text-secondary)]"
        />
      </div>

      <div className="portal-table-shell overflow-x-auto">
        <table className="w-full min-w-[1120px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[27%]" />
            <col className="w-[12%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Grupo</th>
              <th className="px-4 py-3 text-center font-medium">Entra Object ID</th>
              <th className="px-4 py-3 text-center font-medium">Membros</th>
              <th className="px-4 py-3 text-center font-medium">Última sincronização</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="font-semibold text-[var(--color-text-secondary)]">
                    {groups.length === 0 ? "Nenhum grupo cadastrado" : "Nenhum grupo encontrado"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {groups.length === 0
                      ? "Adicione um grupo para usá-lo no controle de acesso aos namespaces."
                      : "Tente um termo de busca diferente."}
                  </p>
                </td>
              </tr>
            )}
            {filteredGroups.map((group) => (
              <tr
                key={group.id}
                className={`border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55 ${
                  group.isActive ? "" : "opacity-65"
                }`}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
                      <User className="size-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--color-text-secondary)]">
                        {group.displayName}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-block max-w-full truncate font-mono text-xs text-muted-foreground">
                    {group.entraGroupId}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-xs text-muted-foreground">
                    {group.memberCount} membros
                  </span>
                </td>
                <td className="px-4 py-4 text-center text-xs text-muted-foreground">
                  {group.lastSyncedAt
                    ? new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(group.lastSyncedAt))
                    : "-"}
                </td>
                <td className="px-4 py-4 text-center">
                  <Badge
                    variant="outline"
                    className={
                      group.isActive
                        ? "rounded-md border-green-200 bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-normal text-green-800"
                        : "rounded-md border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-normal text-red-800"
                    }
                  >
                    {group.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
                      aria-label={`Excluir ${group.displayName}`}
                      onClick={() => setDeleteTarget(group)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <GroupForm
        open={form.open}
        group={form.group}
        onClose={() => setForm({ open: false })}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir grupo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o grupo <strong>{deleteTarget?.displayName}</strong>? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                if (!deleteTarget) return;
                startDelete(async () => {
                  await deleteGroup(deleteTarget.id);
                  setDeleteTarget(null);
                });
              }}
            >
              {isDeleting ? "Excluindo..." : "Excluir grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
