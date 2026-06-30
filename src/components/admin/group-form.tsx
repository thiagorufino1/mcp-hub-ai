"use client";

import { useEffect, useState, useTransition } from "react";
import { IconCheck, IconLoader2, IconSearch } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertGroup } from "@/app/admin/groups/actions";
import type { GroupRow } from "@/app/admin/groups/actions";
import { cn } from "@/lib/utils";

type EntraGroupSearchResult = {
  id: string;
  displayName: string;
  mail: string | null;
  description: string | null;
};

const BORDER = "border-[var(--color-border)]";

export function GroupForm({
  open,
  onClose,
  group,
}: {
  open: boolean;
  onClose: () => void;
  group?: GroupRow;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EntraGroupSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(group?.entraGroupId ?? null);
  const [selectedGroup, setSelectedGroup] = useState<EntraGroupSearchResult | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSearchQuery("");
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      setSelectedGroupId(group?.entraGroupId ?? null);
      setSelectedGroup(null);
      return;
    }

    if (group) {
      setSearchQuery(group.displayName);
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      setSelectedGroupId(group.entraGroupId);
      setSelectedGroup({
        id: group.entraGroupId,
        displayName: group.displayName,
        mail: null,
        description: null,
      });
      return;
    }

    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);

      try {
        const response = await fetch(`/api/admin/entra-groups/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await response.json()) as
          | { groups?: EntraGroupSearchResult[]; error?: string }
          | undefined;

        if (!response.ok) {
          throw new Error(data?.error ?? "Não foi possível pesquisar grupos do Entra.");
        }

        setSearchResults(data?.groups ?? []);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setSearchResults([]);
        setSearchError(
          requestError instanceof Error ? requestError.message : "Não foi possível pesquisar grupos do Entra.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [group, open, searchQuery]);

  function handleSubmit(formData: FormData) {
    setError(null);
    if (!group && !selectedGroupId) {
      setError("Selecione um grupo antes de salvar.");
      return;
    }
    startTransition(async () => {
      try {
        await upsertGroup(formData);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      }
    });
  }

  function selectGroup(result: EntraGroupSearchResult) {
    setSelectedGroupId(result.id);
    setSelectedGroup(result);
    setSearchQuery(result.displayName);
    setSearchResults([]);
    setSearchError(null);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className={`max-w-2xl gap-0 overflow-hidden rounded-2xl border ${BORDER} bg-[var(--color-surface)] p-0 shadow-[0_20px_48px_rgba(15,23,42,0.10)]`}
      >
        <DialogHeader className={`border-b ${BORDER} bg-[var(--color-surface)] px-6 py-4`}>
          <DialogTitle className="text-base font-semibold">
            {group ? "Editar grupo" : "Adicionar Grupo"}
          </DialogTitle>
        </DialogHeader>

        <form action={handleSubmit}>
          <input type="hidden" name="id" value={group?.id ?? ""} />

          <div className="flex flex-col gap-5 bg-[var(--color-bg)] px-6 py-5">
            {!group ? (
              <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center gap-2">
                  <IconSearch className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Pesquisar grupos do Entra ID</p>
                    <p className="text-xs text-muted-foreground">
                      Pesquise pelo nome de exibição. Selecione um resultado para preencher o formulário automaticamente.
                    </p>
                  </div>
                </div>

                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Digite o nome de um grupo..."
                />

                {searchLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconLoader2 className="size-4 animate-spin" />
                    Pesquisando grupos do Entra...
                  </div>
                )}

                {searchError && <p className="text-xs text-destructive">{searchError}</p>}

                {selectedGroup ? (
                  <div className="rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--color-text-secondary)]">
                          Grupo selecionado
                        </p>
                        <p className="truncate text-sm text-[var(--color-text-secondary)]">
                          {selectedGroup.displayName}
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {selectedGroup.id}
                        </p>
                      </div>
                      <IconCheck className="mt-0.5 size-4 text-[var(--color-primary)]" />
                    </div>
                  </div>
                ) : null}

                {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchError && (
                  <p className="text-xs text-muted-foreground">Nenhum grupo encontrado.</p>
                )}

                {searchResults.length > 0 && (
                  <div className="flex max-h-56 flex-col gap-2 overflow-auto">
                    {searchResults.map((result) => {
                      const isSelected = selectedGroupId === result.id;
                      return (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => selectGroup(result)}
                          className={cn(
                            "flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                            isSelected
                              ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{result.displayName}</p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {result.id}
                            </p>
                            {result.mail && (
                              <p className="truncate text-[11px] text-muted-foreground">{result.mail}</p>
                            )}
                            {result.description && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {result.description}
                              </p>
                            )}
                          </div>
                          {isSelected ? (
                            <IconCheck className="mt-0.5 size-4 text-[var(--color-primary)]" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            <input type="hidden" name="entraGroupId" value={group?.entraGroupId ?? selectedGroupId ?? ""} />
            <input
              type="hidden"
              name="displayName"
              value={group?.displayName ?? selectedGroup?.displayName ?? searchQuery}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className={`flex-row items-center justify-end gap-2 border-t ${BORDER} bg-[var(--color-surface)] px-6 py-4`}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending || (!group && !selectedGroupId)}>{isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
