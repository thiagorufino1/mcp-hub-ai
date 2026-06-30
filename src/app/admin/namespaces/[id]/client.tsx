"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";

import { NamespaceForm } from "@/components/admin/namespace-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Cable,
  Check,
  Copy,
  Globe,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Search,
  TerminalSquare,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  addNamespaceGroup,
  addNamespaceMcpServer,
  deleteNamespace,
  deleteNamespaceGroup,
  deleteNamespaceMcpServer,
  setNamespaceAllUsers,
  setNamespaceMcpEnabled,
  setNamespaceToolEnabled,
} from "./actions";
import { syncAllGroups } from "@/app/admin/groups/actions";
import { saveNamespace } from "@/app/admin/namespaces/actions";

type McpServerEntry = {
  id: string;
  mcpServerId: string;
  name: string;
  sourceName: string;
  sourceEnabled: boolean;
  transport: string;
  enabled: boolean;
  visibleToolCount: number;
  totalToolCount: number;
};

type ToolEntry = {
  id: string;
  namespaceToolId: string;
  mcpServerId: string;
  mcpServerName: string;
  name: string;
  sourceName: string;
  displayName: string | null;
  description: string | null;
  sourcePermissionMode: "allow" | "blocked";
  enabled: boolean;
  readOnly: boolean;
  destructive: boolean;
};

type NamespaceDetail = {
  id: string;
  name: string;
  alias: string;
  description: string | null;
  enabled: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  mcpServerIds: string[];
  toolsCount: number;
  groups: Array<{ id: string; displayName: string; entraGroupId: string }>;
  users: Array<{ id: string; name: string | null; email: string | null }>;
};

export function NamespaceDetailClient({
  namespace,
  groups,
  mcpServers,
  availableMcpServers,
  tools,
  users,
}: {
  namespace: NamespaceDetail;
  groups: Array<{ id: string; displayName: string; entraGroupId: string; memberCount: number }>;
  mcpServers: McpServerEntry[];
  availableMcpServers: Array<{ id: string; name: string; description: string | null; transport: string }>;
  tools: ToolEntry[];
  users: Array<{ id: string; name: string | null; email: string | null }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToRemove, setServerToRemove] = useState<McpServerEntry | null>(null);
  const [isRemovingServer, startRemoveServer] = useTransition();
  const [groupToRemove, setGroupToRemove] = useState<{ id: string; displayName: string } | null>(null);
  const [isRemovingGroup, startRemoveGroup] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverSearch, setServerSearch] = useState("");
  const [toolSearch, setToolSearch] = useState("");
  const [namespaceFormOpen, setNamespaceFormOpen] = useState(false);
  const [addServerOpen, setAddServerOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [allUsers, setAllUsers] = useState(namespace.groups.length === 0 && namespace.users.length === 0);
  const router = useRouter();

  function handleAllUsersChange(nextValue: boolean) {
    setAllUsers(nextValue);
    if (nextValue) {
      setSelectedGroupIds([]);
      setGroupSearch("");
      setAddGroupOpen(false);
      startTransition(async () => {
        try {
          await setNamespaceAllUsers(namespace.id, true);
          router.refresh();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o acesso ao namespace.");
        }
      });
    }
  }
  const endpointPath = `/api/mcp/namespaces/${namespace.alias}`;

  function copyEndpoint() {
    void navigator.clipboard
      .writeText(`${window.location.origin}${endpointPath}`)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setError("Não foi possível copiar a URL do endpoint."));
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteNamespace(namespace.id);
    });
  }

  function toggleMcp(mcpServerId: string, enabled: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await setNamespaceMcpEnabled(namespace.id, mcpServerId, enabled);
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Não foi possível atualizar o MCP Server.",
        );
      }
    });
  }

  function toggleTool(namespaceToolId: string, enabled: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await setNamespaceToolEnabled(namespace.id, namespaceToolId, enabled);
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Não foi possível atualizar a visibilidade da tool.",
        );
      }
    });
  }

  const accessCount = namespace.groups.length + namespace.users.length;
  const visibleServers = useMemo(
    () =>
      mcpServers.filter((server) =>
        [server.name, server.sourceName, server.transport].some((value) =>
          value.toLowerCase().includes(serverSearch.toLowerCase()),
        ),
      ),
    [mcpServers, serverSearch],
  );
  const visibleTools = useMemo(
    () =>
      tools.filter((tool) =>
        [
          tool.displayName ?? tool.name,
          tool.name,
          tool.sourceName,
          tool.mcpServerName,
          tool.description ?? "",
        ].some((value) =>
          value.toLowerCase().includes(toolSearch.toLowerCase()),
        ),
      ),
    [toolSearch, tools],
  );

  const totalVisibleTools = mcpServers.reduce(
    (sum, server) => sum + server.visibleToolCount,
    0,
  );
  const totalRegisteredTools = namespace.toolsCount;
  const activeServers = mcpServers.filter((server) => server.enabled).length;
  const namespaceForm = {
    id: namespace.id,
    name: namespace.name,
    alias: namespace.alias,
    description: namespace.description,
    enabled: namespace.enabled,
    published: namespace.published,
    allUsers: namespace.groups.length === 0 && namespace.users.length === 0,
    groups: namespace.groups,
    users: namespace.users,
    mcpServerIds: namespace.mcpServerIds,
    toolsCount: namespace.toolsCount,
  };
  const availableServers = availableMcpServers.filter(
    (server) => !namespace.mcpServerIds.includes(server.id),
  );
  const visibleGroups = useMemo(
    () =>
      groups.filter((group) =>
        [group.id, group.displayName].some((value) =>
          value.toLowerCase().includes(groupSearch.toLowerCase()),
        ),
      ),
    [groupSearch, groups],
  );
  const availableGroups = groups.filter(
    (group) => !namespace.groups.some((assigned) => assigned.id === group.id),
  );

  return (
    <div className="portal-page max-w-6xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Link
          href="/admin/namespaces"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-[var(--color-primary)]"
        >
          <ArrowRight aria-hidden="true" className="size-4 rotate-180" />
          Voltar para Namespaces
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={namespace.enabled ? "success" : "secondary"}>
            {namespace.enabled ? "Habilitado" : "Desabilitado"}
          </Badge>
          <Badge variant={namespace.published ? "info" : "secondary"}>
            {namespace.published ? "Publicado" : "Privado"}
          </Badge>
        </div>
      </div>

      <div className="portal-page-heading flex-row items-start justify-between gap-5">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{namespace.name}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">Alias: /{namespace.alias}</p>
          {namespace.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {namespace.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Sem descrição.</p>
          )}
        </div>

        <div className="flex max-w-full items-center gap-2">
          <code className="truncate rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 font-mono text-xs text-muted-foreground">
            {endpointPath}
          </code>
          <Button
            size="sm"
            variant="outline"
            className="size-9 rounded-full px-0"
            onClick={copyEndpoint}
            aria-label="Copiar URL do endpoint"
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="size-9 rounded-full px-0"
            onClick={() => setNamespaceFormOpen(true)}
            aria-label="Editar configurações do namespace"
          >
            <PencilLine aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            className="size-9 rounded-full border border-[var(--color-border)] bg-transparent px-0 text-[var(--color-error)] shadow-none hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
            onClick={() => setDeleteDialogOpen(true)}
            aria-label="Excluir namespace"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
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
        <KpiCard label="MCP Servers" value={String(mcpServers.length)} tone="info" />
        <KpiCard label="Active Servers" value={String(activeServers)} tone="success" />
        <KpiCard label="Visible Tools" value={String(totalVisibleTools)} tone="success" />
        <KpiCard label="Total Tools" value={String(totalRegisteredTools)} tone="neutral" />
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">MCP Servers</h2>
            <p className="text-sm text-muted-foreground">
              Enable or disable each server for this namespace.
            </p>
          </div>
          <div className="flex w-full max-w-sm items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={serverSearch}
                onChange={(event) => setServerSearch(event.target.value)}
                placeholder="Search servers..."
                aria-label="Search namespace servers"
                className="pl-9"
              />
            </div>
            <Button
              size="icon"
              variant="outline"
              className="size-10 rounded-full"
              onClick={() => {
                setSelectedServerIds([]);
                setAddServerOpen(true);
              }}
              aria-label="Add MCP server"
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
            <colgroup>
              <col className="w-[32%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 text-center font-medium">Type</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Tools</th>
                <th className="px-4 py-3 text-center font-medium">Visible</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleServers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No servers match this search.
                  </td>
                </tr>
              ) : (
                visibleServers.map((mcp) => {
                  const Icon =
                    mcp.transport === "stdio"
                      ? TerminalSquare
                      : mcp.transport === "sse"
                        ? Globe
                        : Cable;
                  return (
                    <tr
                      key={mcp.id}
                      className={`border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55 ${
                        mcp.enabled ? "" : "opacity-65"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
                            <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--color-text-secondary)]">
                              {mcp.name}
                            </p>
                            {mcp.name !== mcp.sourceName ? (
                              <p className="text-xs text-muted-foreground">
                                {mcp.sourceName}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge variant="outline" className="uppercase">
                          {transportLabel(mcp.transport)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge variant={mcp.enabled ? "success" : "secondary"}>
                          {mcp.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-center text-muted-foreground">
                        <span className="font-medium text-[var(--color-text-secondary)]">
                          {mcp.visibleToolCount}
                        </span>
                        <span className="mx-1 text-muted-foreground">/</span>
                        <span>{mcp.totalToolCount}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <Switch
                            checked={mcp.enabled}
                            disabled={isPending}
                            onCheckedChange={(enabled) =>
                              toggleMcp(mcp.mcpServerId, enabled)
                            }
                            aria-label={`${mcp.enabled ? "Disable" : "Enable"} ${mcp.name}`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            size="icon"
                            className="rounded-full bg-transparent text-[var(--color-error)] shadow-none hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
                            onClick={() => setServerToRemove(mcp)}
                            aria-label={`Remove ${mcp.name}`}
                            disabled={isPending}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {visibleServers.length} server{visibleServers.length === 1 ? "" : "s"} total
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Tools Management</h2>
            <p className="text-sm text-muted-foreground">
              Visibility here is local to this namespace. Global allow/blocked stays on the MCP Server page.
            </p>
            <p className="text-sm text-muted-foreground">
              This toggle only affects this namespace.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={toolSearch}
              onChange={(event) => setToolSearch(event.target.value)}
              placeholder="Search tools..."
              aria-label="Search namespace tools"
              className="pl-9"
            />
          </div>
        </div>

        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full min-w-[1024px] text-left text-sm text-[var(--color-text-secondary)]">
            <thead>
              <tr>
                <th className="px-4 py-3">Tool</th>
                <th className="px-4 py-3">Server</th>
                <th className="px-4 py-3">Source permission</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3 text-right">Visible</th>
              </tr>
            </thead>
            <tbody>
              {visibleTools.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No tools match this search.
                  </td>
                </tr>
              ) : (
                visibleTools.map((tool) => (
                  <tr key={tool.id} className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/50">
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs font-semibold text-[var(--color-text-secondary)]">
                        {tool.displayName ?? tool.name}
                      </p>
                      {tool.displayName && tool.displayName !== tool.name ? (
                        <p className="text-xs text-muted-foreground">{tool.name}</p>
                      ) : null}
                      {tool.description ? (
                        <p
                          className="mt-1 max-w-sm truncate text-xs text-muted-foreground"
                          title={tool.description}
                        >
                          {tool.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {tool.mcpServerName}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={tool.sourcePermissionMode === "blocked" ? "destructive" : "success"}>
                        {tool.sourcePermissionMode}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {tool.readOnly ? (
                          <Badge variant="secondary">Read-only</Badge>
                        ) : null}
                        {tool.destructive ? (
                          <Badge variant="warning">Destructive</Badge>
                        ) : null}
                        {!tool.readOnly && !tool.destructive ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <Switch
                          checked={tool.enabled}
                          disabled={isPending}
                          onCheckedChange={(enabled) =>
                            toggleTool(tool.namespaceToolId, enabled)
                          }
                          aria-label={`${tool.enabled ? "Hide" : "Show"} ${tool.displayName ?? tool.name}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {visibleTools.length} tool{visibleTools.length === 1 ? "" : "s"} visible
        </p>
      </section>

      <NamespaceForm
        open={namespaceFormOpen}
        namespace={namespaceForm}
        groups={groups}
        mcpServers={availableMcpServers}
        showAccessControl={false}
        showMcpServers={false}
        showSettings={false}
        onClose={() => setNamespaceFormOpen(false)}
      />

      <Dialog open={addServerOpen} onOpenChange={(nextOpen) => { if (!nextOpen) setAddServerOpen(false); }}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add MCP servers</DialogTitle>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto space-y-3">
            {availableServers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                There are no additional enabled MCP servers available to attach to this namespace.
              </p>
            ) : (
              availableServers.map((server) => (
                <label key={server.id} className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedServerIds.includes(server.id)}
                    onChange={(event) => {
                      setSelectedServerIds((current) =>
                        event.target.checked
                          ? [...current, server.id]
                          : current.filter((id) => id !== server.id),
                      );
                    }}
                    className="mt-1 h-4 w-4 rounded accent-[var(--color-primary)]"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-[var(--color-text-secondary)]">{server.name}</span>
                    <span className="block text-xs text-muted-foreground">{server.transport}{server.description ? ` • ${server.description}` : ""}</span>
                  </span>
                </label>
              ))
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAddServerOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selectedServerIds.length === 0}
              onClick={() => {
                startTransition(async () => {
                  try {
                    for (const serverId of selectedServerIds) {
                      await addNamespaceMcpServer(namespace.id, serverId);
                    }
                    router.refresh();
                    setAddServerOpen(false);
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Não foi possível adicionar o MCP Server.",
                    );
                  }
                });
              }}
            >
              Add selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NamespaceAccessControlSection
        namespace={namespace}
        groups={groups}
        visibleGroups={visibleGroups}
        availableGroups={availableGroups}
        allUsers={allUsers}
        setAllUsers={handleAllUsersChange}
        groupSearch={groupSearch}
        setGroupSearch={setGroupSearch}
        addGroupOpen={addGroupOpen}
        setAddGroupOpen={setAddGroupOpen}
        selectedGroupIds={selectedGroupIds}
        setSelectedGroupIds={setSelectedGroupIds}
        isPending={isPending}
        setError={setError}
        onAddGroup={async (groupId) => {
          await addNamespaceGroup(namespace.id, groupId);
          router.refresh();
        }}
      onDeleteGroup={async (groupId) => {
          await deleteNamespaceGroup(namespace.id, groupId);
          router.refresh();
        }}
        onRequestDeleteGroup={setGroupToRemove}
      />

      <NamespaceSettingsSection
        namespace={namespace}
        allUsers={allUsers}
        onSaved={() => router.refresh()}
        setError={setError}
      />

      <Dialog open={serverToRemove !== null} onOpenChange={(open) => { if (!open) setServerToRemove(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover servidor MCP</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{serverToRemove?.name}</strong> deste namespace? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServerToRemove(null)} disabled={isRemovingServer}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={isRemovingServer}
              onClick={() => {
                if (!serverToRemove) return;
                startRemoveServer(async () => {
                  try {
                    await deleteNamespaceMcpServer(namespace.id, serverToRemove.mcpServerId);
                    setServerToRemove(null);
                    router.refresh();
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : "Não foi possível remover o MCP Server.");
                  }
                });
              }}
            >
              {isRemovingServer ? "Removendo..." : "Remover servidor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={groupToRemove !== null} onOpenChange={(open) => { if (!open) setGroupToRemove(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover grupo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o grupo <strong>{groupToRemove?.displayName}</strong> deste namespace?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupToRemove(null)} disabled={isRemovingGroup}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={isRemovingGroup}
              onClick={() => {
                if (!groupToRemove) return;
                startRemoveGroup(async () => {
                  try {
                    await deleteNamespaceGroup(namespace.id, groupToRemove.id);
                    router.refresh();
                    setGroupToRemove(null);
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : "Não foi possível remover o grupo.");
                  }
                });
              }}
            >
              {isRemovingGroup ? "Removendo..." : "Remover grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir namespace</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o namespace <strong>{namespace.name}</strong>?
              Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {namespace.toolsCount > 0 && (
            <div className="rounded-lg border border-[var(--color-warning)] bg-[var(--color-warning-soft)] p-3 text-sm text-[var(--color-warning)]">
              ⚠ Este namespace possui {namespace.toolsCount} tool(s) vinculada(s).
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Excluir namespace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-4 border-b border-[var(--color-border)] pb-3 last:border-b-0 last:pb-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn("flex items-start justify-end gap-2 text-sm text-[var(--color-text-secondary)]", mono && "font-mono text-xs")}>
        {icon ? <span className="mt-0.5 text-muted-foreground">{icon}</span> : null}
        <span className="text-right">{value}</span>
      </div>
    </div>
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
  const accent =
    tone === "info"
      ? "text-[var(--color-primary)]"
      : tone === "success"
        ? "text-[var(--color-success)]"
        : "text-[var(--color-text-secondary)]";

  return (
    <div className="group flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(17,63,124,0.04)] transition-all">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className={cn("text-[1.65rem] font-bold leading-none", accent)}>{value}</div>
    </div>
  );
}

function NamespaceAccessSettingsForm({
  namespace,
  groups,
  users,
}: {
  namespace: NamespaceDetail;
  groups: Array<{ id: string; displayName: string; entraGroupId: string }>;
  users: Array<{ id: string; name: string | null; email: string | null }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [allUsers, setAllUsers] = useState(namespace.groups.length === 0 && namespace.users.length === 0);
  const [enabled, setEnabled] = useState(namespace.enabled);
  const [published, setPublished] = useState(namespace.published);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(namespace.groups.map((group) => group.id));
  const [selectedUsers, setSelectedUsers] = useState<string[]>(namespace.users.map((user) => user.id));
  const router = useRouter();

  function submit() {
    const formData = new FormData();
    formData.set("id", namespace.id);
    formData.set("name", namespace.name);
    formData.set("alias", namespace.alias);
    formData.set("description", namespace.description ?? "");
    formData.set("enabled", String(enabled));
    formData.set("published", String(published));
    formData.set("allUsers", String(allUsers));
    namespace.mcpServerIds.forEach((mcpServerId) => formData.append("mcpServerIds", mcpServerId));
    if (!allUsers) {
      selectedGroups.forEach((groupId) => formData.append("groupIds", groupId));
      selectedUsers.forEach((userId) => formData.append("userIds", userId));
    }

    startTransition(async () => {
      try {
        await saveNamespace(formData);
        router.refresh();
      } catch (cause) {
        console.error(cause);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
      <div>
        <h2 className="text-base font-semibold">Access control and settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage who can use this namespace and whether it is enabled/published.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/35 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Access control</p>
          <div className="mt-3 space-y-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] px-4 py-3">
              <Switch
                id="ns-allusers-inline"
                checked={allUsers}
                onCheckedChange={setAllUsers}
                aria-label="Available to all users"
              />
              <Label htmlFor="ns-allusers-inline" className="cursor-pointer text-sm font-medium normal-case tracking-normal text-muted-foreground">
                Available to all authenticated users
              </Label>
            </div>

            {!allUsers && (
              <>
                {groups.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Groups</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {groups.map((group) => (
                        <label key={group.id} className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text-primary)]">
                          <input
                            type="checkbox"
                            checked={selectedGroups.includes(group.id)}
                            onChange={(event) => {
                              setSelectedGroups((current) =>
                                event.target.checked
                                  ? [...current, group.id]
                                  : current.filter((id) => id !== group.id),
                              );
                            }}
                            className="h-4 w-4 rounded accent-[var(--color-primary)]"
                          />
                          {group.displayName}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {users.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Individual users</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {users.map((user) => (
                        <label key={user.id} className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text-primary)]">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(event) => {
                              setSelectedUsers((current) =>
                                event.target.checked
                                  ? [...current, user.id]
                                  : current.filter((id) => id !== user.id),
                              );
                            }}
                            className="h-4 w-4 rounded accent-[var(--color-primary)]"
                          />
                          {user.name ?? user.email ?? user.id}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/35 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Settings</p>
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] px-4 py-3">
              <Switch id="ns-enabled-inline" checked={enabled} onCheckedChange={setEnabled} aria-label="Enabled" />
              <Label htmlFor="ns-enabled-inline" className="cursor-pointer text-sm font-medium normal-case tracking-normal text-muted-foreground">
                Enabled
              </Label>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] px-4 py-3">
              <Switch id="ns-published-inline" checked={published} onCheckedChange={setPublished} aria-label="Published endpoint" />
              <Label htmlFor="ns-published-inline" className="cursor-pointer text-sm font-medium normal-case tracking-normal text-muted-foreground">
                Published endpoint
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" disabled={isPending} onClick={submit}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </section>
  );
}

function NamespaceAccessControlSection({
  namespace,
  groups,
  visibleGroups,
  availableGroups,
  allUsers,
  setAllUsers,
  groupSearch,
  setGroupSearch,
  addGroupOpen,
  setAddGroupOpen,
  selectedGroupIds,
  setSelectedGroupIds,
  isPending,
  setError,
  onAddGroup,
  onDeleteGroup,
  onRequestDeleteGroup,
}: {
  namespace: NamespaceDetail;
  groups: Array<{ id: string; displayName: string; entraGroupId: string; memberCount: number }>;
  visibleGroups: Array<{ id: string; displayName: string; entraGroupId: string; memberCount: number }>;
  availableGroups: Array<{ id: string; displayName: string; entraGroupId: string; memberCount: number }>;
  allUsers: boolean;
  setAllUsers: (value: boolean) => void;
  groupSearch: string;
  setGroupSearch: (value: string) => void;
  addGroupOpen: boolean;
  setAddGroupOpen: (value: boolean) => void;
  selectedGroupIds: string[];
  setSelectedGroupIds: (value: string[] | ((current: string[]) => string[])) => void;
  isPending: boolean;
  setError: (value: string | null) => void;
  onAddGroup: (groupId: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onRequestDeleteGroup: (value: { id: string; displayName: string } | null) => void;
}) {
  const [isProcessing, startTransition] = useTransition();
  const router = useRouter();
  const assignedNamespaceGroups = useMemo(
    () =>
      groups.filter((group) =>
        namespace.groups.some((assigned) => assigned.id === group.id),
      ),
    [groups, namespace.groups],
  );
  const availableNamespaceGroups = useMemo(
    () =>
      groups.filter(
        (group) => !namespace.groups.some((assigned) => assigned.id === group.id),
      ),
    [groups, namespace.groups],
  );
  const visibleNamespaceGroups = useMemo(
    () =>
      assignedNamespaceGroups.filter((group) =>
        [group.entraGroupId, group.displayName].some((value) =>
          value.toLowerCase().includes(groupSearch.toLowerCase()),
        ),
      ),
    [assignedNamespaceGroups, groupSearch],
  );

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Access control</h2>
          <p className="text-sm text-muted-foreground">
            Manage which groups can use this namespace.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/35 px-4 py-3">
        <Switch
          id="ns-allusers-inline"
          checked={allUsers}
          onCheckedChange={setAllUsers}
          aria-label="Available to all authenticated users"
        />
        <div className="min-w-0">
          <Label
            htmlFor="ns-allusers-inline"
            className="cursor-pointer text-sm font-medium normal-case tracking-normal text-muted-foreground"
          >
            Available to all authenticated users
          </Label>
          <p className="text-xs text-muted-foreground">
            When enabled, the namespace ignores group-based access.
          </p>
        </div>
      </div>

      {!allUsers ? (
        <>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/25 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Groups</h3>
                <p className="text-xs text-muted-foreground">Manage which Entra groups can use this namespace.</p>
              </div>
              <div className="flex w-full max-w-sm items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    type="search"
                    value={groupSearch}
                    onChange={(event) => setGroupSearch(event.target.value)}
                    placeholder="Search groups..."
                    aria-label="Search namespace groups"
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => {
                    startTransition(async () => {
                      await syncAllGroups();
                      router.refresh();
                    });
                  }}
                  disabled={isPending || isProcessing}
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Sync groups
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-10 rounded-full"
                  onClick={() => {
                    setSelectedGroupIds([]);
                    setAddGroupOpen(true);
                  }}
                  aria-label="Add group"
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="portal-table-shell overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm text-[var(--color-text-secondary)]">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Entra Object ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3 text-center">Members</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleNamespaceGroups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                        No groups match this search.
                      </td>
                    </tr>
                  ) : (
                    visibleNamespaceGroups.map((group) => (
                      <tr
                        key={group.id}
                        className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/50"
                      >
                        <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                          {group.entraGroupId}
                        </td>
                        <td className="px-4 py-4 font-medium text-[var(--color-text-secondary)]">
                          {group.displayName}
                        </td>
                        <td className="px-4 py-4 text-center text-[var(--color-text-secondary)]">
                          {group.memberCount}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent p-0 leading-none text-[var(--color-error)] transition-[background-color,color] duration-150 hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] focus-visible:bg-[var(--color-error-soft)] focus-visible:text-[var(--color-error)]"
                            onClick={() => onRequestDeleteGroup({ id: group.id, displayName: group.displayName })}
                            aria-label={`Remove ${group.displayName}`}
                            disabled={isPending || isProcessing}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-right text-xs text-muted-foreground">
              {assignedNamespaceGroups.length} group{assignedNamespaceGroups.length === 1 ? "" : "s"} assigned
            </p>
          </div>
        </>
      ) : null}

      <Dialog
        open={addGroupOpen && !allUsers}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setAddGroupOpen(false);
        }}
      >
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add groups</DialogTitle>
          </DialogHeader>

          <div className="max-h-[55vh] space-y-3 overflow-y-auto">
            {availableNamespaceGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                There are no additional groups available to attach to this namespace.
              </p>
            ) : (
              availableNamespaceGroups.map((group) => (
                <label
                  key={group.id}
                  className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(group.id)}
                    onChange={(event) => {
                      setSelectedGroupIds((current) =>
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
                      {group.entraGroupId}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAddGroupOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selectedGroupIds.length === 0}
              onClick={() => {
                startTransition(async () => {
                  try {
                    for (const groupId of selectedGroupIds) {
                      await onAddGroup(groupId);
                    }
                    setSelectedGroupIds([]);
                    setAddGroupOpen(false);
                  } catch (cause) {
                    setError(
                      cause instanceof Error ? cause.message : "Não foi possível adicionar o grupo.",
                    );
                  }
                });
              }}
            >
              Add selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function NamespaceSettingsSection({
  namespace,
  allUsers,
  setError,
  onSaved,
}: {
  namespace: NamespaceDetail;
  allUsers: boolean;
  setError: (value: string | null) => void;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(namespace.enabled);
  const [published, setPublished] = useState(namespace.published);
  const [isPending, startTransition] = useTransition();

  function submit(nextEnabled = enabled, nextPublished = published) {
    const formData = new FormData();
    formData.set("id", namespace.id);
    formData.set("name", namespace.name);
    formData.set("alias", namespace.alias);
    formData.set("description", namespace.description ?? "");
    formData.set("enabled", String(nextEnabled));
    formData.set("published", String(nextPublished));
    formData.set("allUsers", String(allUsers));
    namespace.mcpServerIds.forEach((mcpServerId) => formData.append("mcpServerIds", mcpServerId));
    namespace.groups.forEach((group) => formData.append("groupIds", group.id));
    namespace.users.forEach((user) => formData.append("userIds", user.id));

    startTransition(async () => {
      try {
        await saveNamespace(formData);
        onSaved();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível salvar as configurações do namespace.");
      }
    });
  }

  function handleEnabledChange(nextEnabled: boolean) {
    setEnabled(nextEnabled);
    if (!nextEnabled) {
      setPublished(false);
    }
    submit(nextEnabled, nextEnabled ? published : false);
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Settings</h2>
            <p className="text-sm text-muted-foreground">Namespace status controls.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] px-4 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[var(--color-text-secondary)]">Enabled</span>
              <span className="block text-xs text-muted-foreground">Turn this namespace on or off.</span>
            </span>
            <Switch checked={enabled} onCheckedChange={handleEnabledChange} aria-label="Enabled" />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] px-4 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[var(--color-text-secondary)]">Published</span>
              <span className="block text-xs text-muted-foreground">Expose the namespace endpoint publicly.</span>
            </span>
            <Switch
              checked={published}
              disabled={!enabled}
              onCheckedChange={(nextPublished) => {
                setPublished(nextPublished);
                submit(enabled, nextPublished);
              }}
              aria-label="Published endpoint"
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function transportLabel(transport: string) {
  if (transport === "streamable-http") return "HTTP";
  return transport.toUpperCase();
}
