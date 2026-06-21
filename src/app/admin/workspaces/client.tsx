"use client";

import { useMemo, useState } from "react";

import {
  deleteNamespace,
  deleteWorkspace,
  type NamespaceRow,
  type WorkspaceRow,
} from "./actions";
import { NamespaceForm } from "@/components/admin/namespace-form";
import { WorkspaceForm } from "@/components/admin/workspace-form";
import { Button } from "@/components/ui/button";
import { Bot, Layers3, PencilLine, Search, Trash2 } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Option = { id: string; displayName: string };
type SkillOption = { id: string; name: string };
type LlmOption = { id: string; displayName: string; allowedModels: string[] };
type McpOption = { id: string; name: string; description: string | null; transport: string };

export function WorkspacesAdminClient({
  groups,
  llms,
  mcpServers,
  namespaces,
  skills,
  users,
  workspaces,
}: {
  groups: Option[];
  llms: LlmOption[];
  mcpServers: McpOption[];
  namespaces: NamespaceRow[];
  skills: SkillOption[];
  users: Array<{ id: string; name: string | null; email: string | null }>;
  workspaces: WorkspaceRow[];
}) {
  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceRow | null | undefined>();
  const [namespaceForm, setNamespaceForm] = useState<NamespaceRow | null | undefined>();
  const [wsSearch, setWsSearch] = useState("");
  const [nsSearch, setNsSearch] = useState("");

  const filteredWorkspaces = useMemo(() => {
    const q = wsSearch.trim().toLowerCase();
    return q
      ? workspaces.filter((w) =>
          [w.name, w.slug, w.description].some((v) => v?.toLowerCase().includes(q)),
        )
      : workspaces;
  }, [workspaces, wsSearch]);

  const filteredNamespaces = useMemo(() => {
    const q = nsSearch.trim().toLowerCase();
    return q
      ? namespaces.filter((n) =>
          [n.name, n.slug, n.description].some((v) => v?.toLowerCase().includes(q)),
        )
      : namespaces;
  }, [namespaces, nsSearch]);

  return (
    <div className="portal-page">
      <div className="portal-page-heading flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workspaces & Namespaces</h1>
          <p className="text-sm text-muted-foreground">Governed chat agents and curated MCP endpoints.</p>
        </div>
      </div>

      {/* Workspaces */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Workspaces</h2>
            <p className="text-sm text-muted-foreground">Chat agents with model, prompt, skills and access control.</p>
          </div>
          <Button onClick={() => setWorkspaceForm(null)}>+ Add workspace</Button>
        </div>

        <div className="relative max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={wsSearch}
            onChange={(e) => setWsSearch(e.target.value)}
            placeholder="Search workspaces..."
            className="pl-9 text-[var(--color-text-secondary)]"
          />
        </div>

        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm text-[var(--color-text-secondary)]">
            <thead>
              <tr>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">LLM</th>
                <th className="px-4 py-3">Skills</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkspaces.map((ws) => (
                <tr
                  key={ws.id}
                  className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
                        <Bot className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--color-text-secondary)]">{ws.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">/{ws.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {llms.find((l) => l.id === ws.llmConfigId)?.displayName ?? (
                      <span className="italic">Automatic</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {ws.skills.length > 0 ? ws.skills.map((s) => s.name).join(", ") : (
                      <span className="italic">None</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {ws.isDefault ? (
                        <span className="inline-flex items-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                          default
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          ws.enabled
                            ? "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-muted-foreground",
                        )}
                      >
                        {ws.enabled ? "enabled" : "disabled"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-muted-foreground"
                        onClick={() => setWorkspaceForm(ws)}
                        title="Edit"
                      >
                        <PencilLine />
                      </Button>
                      <form action={async () => { await deleteWorkspace(ws.id); }}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)]"
                          title="Delete"
                        >
                          <Trash2 />
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredWorkspaces.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <p className="font-semibold">
                      {workspaces.length === 0 ? "No workspaces configured" : "No workspaces found"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {workspaces.length === 0
                        ? "Create the first agent workspace."
                        : "Try a different search term."}
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Namespaces */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">MCP Namespaces</h2>
            <p className="text-sm text-muted-foreground">Curated MCP server collections exposed as a single endpoint.</p>
          </div>
          <Button onClick={() => setNamespaceForm(null)}>+ Add namespace</Button>
        </div>

        <div className="relative max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={nsSearch}
            onChange={(e) => setNsSearch(e.target.value)}
            placeholder="Search namespaces..."
            className="pl-9 text-[var(--color-text-secondary)]"
          />
        </div>

        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm text-[var(--color-text-secondary)]">
            <thead>
              <tr>
                <th className="px-4 py-3">Namespace</th>
                <th className="px-4 py-3">MCP Servers</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNamespaces.map((ns) => (
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
                        <p className="font-semibold text-[var(--color-text-secondary)]">{ns.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">/{ns.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {ns.mcpServerIds.length} server{ns.mcpServerIds.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        ns.allUsers
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-muted-foreground",
                      )}
                    >
                      {ns.allUsers
                        ? "All users"
                        : `${ns.groups.length} group${ns.groups.length !== 1 ? "s" : ""}`}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          ns.published
                            ? "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-muted-foreground",
                        )}
                      >
                        {ns.published ? "published" : "private"}
                      </span>
                      {!ns.enabled ? (
                        <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          disabled
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      /api/mcp/namespaces/{ns.slug}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-muted-foreground"
                        onClick={() => setNamespaceForm(ns)}
                        title="Edit"
                      >
                        <PencilLine />
                      </Button>
                      <form action={async () => { await deleteNamespace(ns.id); }}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)]"
                          title="Delete"
                        >
                          <Trash2 />
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredNamespaces.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
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
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <WorkspaceForm
        open={workspaceForm !== undefined}
        workspace={workspaceForm ?? undefined}
        groups={groups}
        llms={llms}
        namespaces={namespaces.map(({ id, name }) => ({ id, name }))}
        skills={skills}
        users={users}
        onClose={() => setWorkspaceForm(undefined)}
      />
      <NamespaceForm
        open={namespaceForm !== undefined}
        namespace={namespaceForm ?? undefined}
        groups={groups}
        mcpServers={mcpServers}
        users={users}
        onClose={() => setNamespaceForm(undefined)}
      />
    </div>
  );
}
