"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteWorkspace,
  updateWorkspaceFlags,
  type WorkspaceRow,
} from "./actions";
import { WorkspaceForm } from "@/components/admin/workspace-form";
import { Button } from "@/components/ui/button";
import { Boxes, PencilLine, Search, Trash2 } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Option = { id: string; displayName: string };
type SkillOption = { id: string; name: string };
type LlmOption = { id: string; displayName: string; allowedModels: string[] };
type NsOption = { id: string; name: string };

export function WorkspacesAdminClient({
  groups,
  llms,
  namespaces,
  skills,
  users,
  workspaces,
}: {
  groups: Option[];
  llms: LlmOption[];
  namespaces: NsOption[];
  skills: SkillOption[];
  users: Array<{ id: string; name: string | null; email: string | null }>;
  workspaces: WorkspaceRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<WorkspaceRow | null | undefined>();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? workspaces.filter((w) =>
          [w.name, w.slug, w.description].some((v) => v?.toLowerCase().includes(q)),
        )
      : workspaces;
  }, [workspaces, search]);

  function toggleWorkspace(id: string, enabled: boolean, isDefault: boolean) {
    startTransition(async () => {
      await updateWorkspaceFlags(id, { enabled, isDefault });
      router.refresh();
    });
  }

  return (
    <div className="portal-page">
      <div className="portal-page-heading flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Chat agents with model, prompt, skills and access control.
          </p>
        </div>
        <Button onClick={() => setForm(null)}>+ Add workspace</Button>
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workspaces..."
          className="pl-9 text-[var(--color-text-secondary)]"
        />
      </div>

      <div className="portal-table-shell overflow-x-auto">
        <table className="w-full min-w-[1280px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
          <colgroup>
            <col className="w-[21%]" />
            <col className="w-[19%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">LLM</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">MCP Servers</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tools</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ws) => (
              <tr
                key={ws.id}
                className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
                      <Boxes className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/workspaces/${ws.id}`}
                        className="font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)] hover:underline"
                      >
                        {ws.name}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">/{ws.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center align-middle">
                  <div className="flex min-w-0 flex-col items-center">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {llms.find((l) => l.id === ws.llmConfigId)?.displayName ?? (
                        <span className="italic text-muted-foreground">Automatic</span>
                      )}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {ws.model || ws.llmConfig?.allowedModels[0] || "No model"}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4 text-center align-middle">
                  <span className="inline-flex min-w-12 justify-center font-semibold text-[var(--color-text-secondary)]">
                    {ws.namespace?._count.servers ?? 0}
                  </span>
                </td>
                <td className="px-4 py-4 text-center align-middle">
                  <span className="inline-flex min-w-12 justify-center font-semibold text-[var(--color-text-secondary)]">
                    {ws.namespace?._count.tools ?? 0}
                  </span>
                </td>
                <td className="px-4 py-4 text-center align-middle">
                  <span className="inline-flex min-w-12 justify-center font-semibold text-[var(--color-text-secondary)]">
                    {ws.skills.length}
                  </span>
                </td>
                <td className="px-4 py-4 text-center align-middle">
                  <Switch
                    checked={ws.enabled}
                    disabled={pending}
                    onCheckedChange={(checked) => toggleWorkspace(ws.id, checked, ws.isDefault)}
                    aria-label={`Toggle ${ws.name} enabled`}
                  />
                </td>
                <td className="px-4 py-4 text-center align-middle">
                  <Switch
                    checked={ws.isDefault}
                    disabled={pending || !ws.enabled}
                    onCheckedChange={(checked) => toggleWorkspace(ws.id, ws.enabled, checked)}
                    aria-label={`Toggle ${ws.name} default`}
                  />
                </td>
                <td className="px-4 py-4 text-center align-middle">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full text-muted-foreground"
                      title="Edit"
                    >
                      <Link href={`/admin/workspaces/${ws.id}`}>
                        <PencilLine />
                      </Link>
                    </Button>
                    <form action={async () => { await deleteWorkspace(ws.id); }}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] focus-visible:bg-[var(--color-error-soft)] focus-visible:text-[var(--color-error)]"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
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
            )}
          </tbody>
        </table>
      </div>

      <WorkspaceForm
        open={form !== undefined}
        workspace={form ?? undefined}
        groups={groups}
        llms={llms}
        namespaces={namespaces}
        skills={skills}
        users={users}
        onClose={() => setForm(undefined)}
      />
    </div>
  );
}
