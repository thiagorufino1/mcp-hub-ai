"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveNamespace, type NamespaceRow } from "@/app/admin/namespaces/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "@/components/ui/icons";

type McpOption = { id: string; name: string; description: string | null; transport: string };

const BORDER = "border-[var(--color-border)]";
const CARD = `rounded-2xl border ${BORDER} bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(17,63,124,0.04)]`;
const SECTION_LABEL = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";
const SECTION_HELPER = "text-sm text-muted-foreground";

export function NamespaceForm({
  groups,
  mcpServers,
  namespace,
  onClose,
  open,
  showAccessControl = true,
  showMcpServers = true,
  showSettings = true,
}: {
  groups: Array<{ id: string; displayName: string }>;
  mcpServers: McpOption[];
  namespace?: NamespaceRow;
  onClose: () => void;
  open: boolean;
  showAccessControl?: boolean;
  showMcpServers?: boolean;
  showSettings?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState(namespace?.allUsers ?? false);
  const [enabled, setEnabled] = useState(namespace?.enabled ?? true);
  const [published, setPublished] = useState(namespace?.published ?? false);
  const [addMcpOpen, setAddMcpOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [selectedMcpIds, setSelectedMcpIds] = useState<string[]>(namespace?.mcpServerIds ?? []);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(namespace?.groups.map((g) => g.id) ?? []);
  const [draftMcpIds, setDraftMcpIds] = useState<string[]>(namespace?.mcpServerIds ?? []);
  const [draftGroupIds, setDraftGroupIds] = useState<string[]>(namespace?.groups.map((g) => g.id) ?? []);
  const router = useRouter();

  const selectedGroups = new Set(selectedGroupIds);
  const selectedMcps = new Set(selectedMcpIds);
  const availableGroups = groups.filter((group) => !selectedGroups.has(group.id));
  const availableMcps = mcpServers.filter((mcp) => !selectedMcps.has(mcp.id));

  function openGroupPicker() {
    setDraftGroupIds(selectedGroupIds);
    setAddGroupOpen(true);
  }

  function openMcpPicker() {
    setDraftMcpIds(selectedMcpIds);
    setAddMcpOpen(true);
  }

  function submit(formData: FormData) {
    setError(null);
    const description = String(formData.get("description") ?? "").trim();
    if (!description) {
      setError("A descrição é obrigatória.");
      return;
    }
    if (selectedMcpIds.length === 0) {
      setError("Selecione pelo menos um MCP Server.");
      return;
    }
    if (!allUsers && selectedGroupIds.length === 0) {
      setError("Selecione pelo menos um grupo de acesso ou habilite acesso para todos os usuários autenticados.");
      return;
    }
    formData.set("allUsers", String(allUsers));
    formData.set("enabled", String(enabled));
    formData.set("published", String(published));
    selectedMcpIds.forEach((mcpId) => formData.append("mcpServerIds", mcpId));
    if (!allUsers) {
      selectedGroupIds.forEach((groupId) => formData.append("groupIds", groupId));
    }
    startTransition(async () => {
      try {
        await saveNamespace(formData);
        router.refresh();
        onClose();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível salvar o namespace.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className={`max-w-3xl gap-0 overflow-hidden rounded-2xl border ${BORDER} bg-[var(--color-surface)] p-0 shadow-[0_20px_48px_rgba(15,23,42,0.10)]`}
      >
        <DialogHeader className={`border-b ${BORDER} bg-[var(--color-surface)] px-6 py-4`}>
          <DialogTitle className="text-base font-semibold">
            {namespace ? "Editar namespace" : "Adicionar namespace"}
          </DialogTitle>
        </DialogHeader>

        <form action={submit}>
          <input type="hidden" name="id" value={namespace?.id ?? ""} />

          <div className="app-scroll flex max-h-[calc(90vh-160px)] flex-col gap-5 overflow-y-auto bg-[var(--color-bg)] px-6 py-5">

            {/* Basics */}
            <div className={CARD}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className={SECTION_LABEL}>Dados básicos</p>
                  <p className={cn(SECTION_HELPER, "mt-1")}>Identidade principal do namespace e do seu endpoint.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ns-name">Nome</Label>
                    <Input
                      id="ns-name"
                      name="name"
                      defaultValue={namespace?.name ?? ""}
                      required
                      placeholder="Telecom"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ns-alias">Alias *</Label>
                    <Input
                      id="ns-alias"
                      name="alias"
                      defaultValue={namespace?.alias ?? ""}
                      required
                      placeholder="telecom"
                      autoCapitalize="none"
                      spellCheck={false}
                      pattern="[a-z0-9-]+"
                      title="Use apenas letras minúsculas, números e hífen. Sem espaços."
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ns-desc">Descrição *</Label>
                  <Textarea
                    id="ns-desc"
                    name="description"
                    defaultValue={namespace?.description ?? ""}
                    rows={3}
                    required
                    placeholder="Ex.: reúne os MCP Servers do time de telecom."
                  />
                </div>
              </div>
            </div>

            {showMcpServers ? (
              <div className={CARD}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className={SECTION_LABEL}>MCP Servers</p>
                    <p className={cn(SECTION_HELPER, "mt-1")}>Escolha quais servidores pertencem a este namespace.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-muted-foreground">Servidores selecionados</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                    onClick={openMcpPicker}
                    aria-label="Adicionar MCP Server"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {selectedMcpIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum MCP Server selecionado.</p>
                  ) : (
                    selectedMcpIds.map((mcpId) => {
                      const mcp = mcpServers.find((item) => item.id === mcpId);
                      if (!mcp) return null;
                      return (
                        <div
                          key={mcp.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--color-text-secondary)]">
                              {mcp.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {mcp.description ?? "Sem descrição."}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-full border-0 bg-transparent p-0 leading-none text-[var(--color-error)] transition-[background-color,color] duration-150 hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
                            aria-label={`Remove ${mcp.name}`}
                            onClick={() => {
                              setSelectedMcpIds((current) => current.filter((id) => id !== mcp.id));
                            }}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            ) : null}

            {showAccessControl ? (
              <div className={CARD}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className={SECTION_LABEL}>Controle de acesso</p>
                    <p className={cn(SECTION_HELPER, "mt-1")}>Restrinja o namespace a grupos ou usuários específicos.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className={`flex items-center gap-2.5 rounded-xl border ${BORDER} bg-[var(--color-surface-muted)]/40 px-4 py-3`}>
                    <Switch
                      id="ns-allusers"
                      checked={allUsers}
                      onCheckedChange={setAllUsers}
                      aria-label="Disponível para todos os usuários"
                    />
                    <Label htmlFor="ns-allusers" className="cursor-pointer text-sm font-medium normal-case tracking-normal text-muted-foreground">
                      Disponível para todos os usuários autenticados
                    </Label>
                  </div>

                  {!allUsers && (
                    <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">Grupos</p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 rounded-full"
              onClick={openGroupPicker}
              aria-label="Adicionar grupo"
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </div>

                      <div className="flex flex-col gap-2">
                        {selectedGroupIds.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhum grupo selecionado.
                          </p>
                        ) : (
                          selectedGroupIds.map((groupId) => {
                            const group = groups.find((item) => item.id === groupId);
                            if (!group) return null;
                            return (
                              <div
                                key={group.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[var(--color-text-secondary)]">
                                    {group.displayName}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    Grupo do Entra
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="inline-flex size-8 items-center justify-center rounded-full border-0 bg-transparent p-0 leading-none text-[var(--color-error)] transition-[background-color,color] duration-150 hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
                                  aria-label={`Remove ${group.displayName}`}
                            onClick={() => {
                              setSelectedGroupIds((current) =>
                                current.filter((id) => id !== group.id),
                              );
                            }}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      );
                          })
                        )}
                      </div>

                      {allUsers && <input type="hidden" name="allUsers" value="true" />}
                      {!allUsers && groups.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Nenhum grupo configurado. O namespace ficará disponível para todos os usuários autenticados.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                <input type="hidden" name="allUsers" value={String(allUsers)} />
              </>
            )}

            {showSettings ? (
              <div className={CARD}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className={SECTION_LABEL}>Configurações</p>
                    <p className={cn(SECTION_HELPER, "mt-1")}>Controles de status do namespace.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className={`flex items-center gap-2.5 rounded-xl border ${BORDER} bg-[var(--color-surface-muted)]/40 px-4 py-3`}>
                    <Switch id="ns-enabled" checked={enabled} onCheckedChange={setEnabled} aria-label="Habilitar" />
                    <Label htmlFor="ns-enabled" className="cursor-pointer text-sm font-medium normal-case tracking-normal text-muted-foreground">
                      Habilitar
                    </Label>
                  </div>
                  <div className={`flex items-center gap-2.5 rounded-xl border ${BORDER} bg-[var(--color-surface-muted)]/40 px-4 py-3`}>
                    <Switch id="ns-published" checked={published} onCheckedChange={setPublished} aria-label="Publicar Endpoint" />
                    <Label htmlFor="ns-published" className="cursor-pointer text-sm font-medium normal-case tracking-normal text-muted-foreground">
                      Publicar Endpoint
                    </Label>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <input type="hidden" name="enabled" value={String(enabled)} />
                <input type="hidden" name="published" value={String(published)} />
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className={`flex-row items-center justify-end gap-2 border-t ${BORDER} bg-[var(--color-surface)] px-6 py-4`}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending || selectedMcpIds.length === 0 || (!allUsers && selectedGroupIds.length === 0)}>{pending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>

        <Dialog
          open={addGroupOpen && !allUsers}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAddGroupOpen(false);
          }}
        >
          <DialogContent className="max-w-xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar grupos</DialogTitle>
            </DialogHeader>

            <div className="max-h-[55vh] space-y-3 overflow-y-auto">
              {availableGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Não há grupos adicionais disponíveis para vincular a este namespace.
                </p>
              ) : (
                  availableGroups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={draftGroupIds.includes(group.id)}
                        onChange={(event) => {
                          setDraftGroupIds((current) =>
                            event.target.checked
                              ? [...current, group.id]
                              : current.filter((id) => id !== group.id),
                          );
                        }}
                      className="mt-1 h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-[var(--color-text-secondary)]">
                        {group.displayName}
                      </span>
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {group.id}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAddGroupOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setSelectedGroupIds(draftGroupIds);
                  setAddGroupOpen(false);
                }}
                disabled={availableGroups.length === 0}
              >
                Adicionar selecionados
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={addMcpOpen && showMcpServers}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAddMcpOpen(false);
          }}
        >
          <DialogContent className="max-w-xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar MCP Servers</DialogTitle>
            </DialogHeader>

            <div className="max-h-[55vh] space-y-3 overflow-y-auto">
              {availableMcps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Não há MCP Servers adicionais disponíveis para vincular a este namespace.
                </p>
              ) : (
                availableMcps.map((mcp) => (
                  <label
                    key={mcp.id}
                    className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={draftMcpIds.includes(mcp.id)}
                      onChange={(event) => {
                        setDraftMcpIds((current) =>
                          event.target.checked
                            ? [...current, mcp.id]
                            : current.filter((id) => id !== mcp.id),
                        );
                      }}
                      className="mt-1 h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-[var(--color-text-secondary)]">
                        {mcp.name}
                      </span>
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {mcp.transport}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAddMcpOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setSelectedMcpIds(draftMcpIds);
                  setAddMcpOpen(false);
                }}
                disabled={availableMcps.length === 0}
              >
                Adicionar selecionados
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
