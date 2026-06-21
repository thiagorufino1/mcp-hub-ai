"use client";

import { useEffect, useState, useTransition } from "react";

import { saveWorkspace, type WorkspaceRow } from "@/app/admin/workspaces/actions";
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

type Option = { id: string; name: string };

const BORDER = "border-[var(--color-border)]";
const CARD = `rounded-2xl border ${BORDER} bg-[var(--color-surface)] p-4`;
const SECTION_LABEL = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3";
const SELECT_CLS = `h-10 w-full rounded-xl border ${BORDER} bg-white dark:bg-[var(--color-surface-muted)] px-3 py-2 text-sm shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus:border-[var(--color-primary)] focus:outline-none`;

export function WorkspaceForm({
  groups,
  llms,
  namespaces,
  onClose,
  open,
  skills,
  workspace,
  users,
}: {
  groups: Array<{ id: string; displayName: string }>;
  llms: Array<{ id: string; displayName: string; allowedModels: string[] }>;
  namespaces: Option[];
  onClose: () => void;
  open: boolean;
  skills: Option[];
  workspace?: WorkspaceRow;
  users: Array<{ id: string; name: string | null; email: string | null }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(workspace?.enabled ?? true);
  const [isDefault, setIsDefault] = useState(workspace?.isDefault ?? false);

  useEffect(() => {
    setEnabled(workspace?.enabled ?? true);
    setIsDefault(workspace?.isDefault ?? false);
    setError(null);
  }, [workspace, open]);

  const selectedGroups = new Set(workspace?.groups.map((g) => g.id) ?? []);
  const selectedSkills = new Set(workspace?.skills.map((s) => s.id) ?? []);
  const selectedUsers = new Set(workspace?.users.map((u) => u.id) ?? []);

  function submit(formData: FormData) {
    setError(null);
    formData.set("enabled", String(enabled));
    formData.set("isDefault", String(isDefault));
    startTransition(async () => {
      try {
        await saveWorkspace(formData);
        onClose();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to save workspace.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className={`max-w-2xl gap-0 overflow-hidden rounded-2xl border ${BORDER} bg-[var(--color-surface)] p-0 shadow-[0_20px_48px_rgba(15,23,42,0.10)]`}
      >
        <DialogHeader className={`border-b ${BORDER} bg-[var(--color-surface)] px-6 py-4`}>
          <DialogTitle className="text-base font-semibold">
            {workspace ? "Edit workspace" : "Add workspace"}
          </DialogTitle>
        </DialogHeader>

        <form action={submit}>
          <input type="hidden" name="id" value={workspace?.id ?? ""} />
          <input type="hidden" name="approvalMode" value="risk_based" />

          <div className="app-scroll flex max-h-[calc(90vh-160px)] flex-col gap-5 overflow-y-auto bg-[var(--color-bg)] px-6 py-5">

            {/* Basics */}
            <div className={CARD}>
              <p className={SECTION_LABEL}>Basics</p>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ws-name">Name *</Label>
                    <Input id="ws-name" name="name" defaultValue={workspace?.name ?? ""} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ws-slug">Slug *</Label>
                    <Input id="ws-slug" name="slug" defaultValue={workspace?.slug ?? ""} required />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ws-desc">Description</Label>
                  <Input id="ws-desc" name="description" defaultValue={workspace?.description ?? ""} />
                </div>
              </div>
            </div>

            {/* AI Config */}
            <div className={CARD}>
              <p className={SECTION_LABEL}>AI Configuration</p>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ws-llm">LLM configuration</Label>
                    <select id="ws-llm" name="llmConfigId" defaultValue={workspace?.llmConfigId ?? ""} className={SELECT_CLS}>
                      <option value="">Automatic / none</option>
                      {llms.map((l) => <option key={l.id} value={l.id}>{l.displayName}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ws-ns">Namespace</Label>
                    <select id="ws-ns" name="namespaceId" defaultValue={workspace?.namespaceId ?? ""} className={SELECT_CLS}>
                      <option value="">Automatic / none</option>
                      {namespaces.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ws-model">Preferred model</Label>
                    <Input id="ws-model" name="model" defaultValue={workspace?.model ?? ""} placeholder="e.g. gpt-4o" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ws-steps">Max agent steps</Label>
                    <Input id="ws-steps" name="maxSteps" type="number" defaultValue={String(workspace?.maxSteps ?? 6)} required min={1} max={12} />
                  </div>
                </div>
              </div>
            </div>

            {/* Behavior */}
            <div className={CARD}>
              <p className={SECTION_LABEL}>Behavior</p>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ws-prompt">System prompt</Label>
                  <Textarea id="ws-prompt" name="systemPrompt" defaultValue={workspace?.systemPrompt ?? ""} rows={5} placeholder="You are a helpful assistant..." />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ws-starters">Conversation starters (one per line)</Label>
                  <Textarea id="ws-starters" name="conversationStarters" defaultValue={workspace?.conversationStarters.join("\n") ?? ""} rows={3} placeholder={"Summarize recent PRs\nCreate a status report"} />
                </div>
              </div>
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div className={CARD}>
                <p className={SECTION_LABEL}>Skills</p>
                <div className="flex max-h-44 flex-col gap-2 overflow-y-auto">
                  {skills.map((s) => (
                    <label key={s.id} className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text-primary)]">
                      <input type="checkbox" name="skillIds" value={s.id} defaultChecked={selectedSkills.has(s.id)} className="h-4 w-4 rounded accent-[var(--color-primary)]" />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Access */}
            <div className={CARD}>
              <p className={SECTION_LABEL}>Access control</p>
              <div className="space-y-4">
                {groups.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Groups</p>
                    <div className="flex max-h-36 flex-col gap-2 overflow-y-auto">
                      {groups.map((g) => (
                        <label key={g.id} className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text-primary)]">
                          <input type="checkbox" name="groupIds" value={g.id} defaultChecked={selectedGroups.has(g.id)} className="h-4 w-4 rounded accent-[var(--color-primary)]" />
                          {g.displayName}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {users.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Individual users</p>
                    <div className="flex max-h-36 flex-col gap-2 overflow-y-auto">
                      {users.map((u) => (
                        <label key={u.id} className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text-primary)]">
                          <input type="checkbox" name="userIds" value={u.id} defaultChecked={selectedUsers.has(u.id)} className="h-4 w-4 rounded accent-[var(--color-primary)]" />
                          {u.name ?? u.email ?? u.id}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {groups.length === 0 && users.length === 0 && (
                  <p className="text-sm text-muted-foreground">No groups or users configured. Workspace will be available to all authenticated users.</p>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className={CARD}>
              <p className={SECTION_LABEL}>Settings</p>
              <div className="space-y-3">
                <div className={`flex items-center gap-2.5 rounded-xl border ${BORDER} px-4 py-3`}>
                  <Switch id="ws-enabled" checked={enabled} onCheckedChange={setEnabled} aria-label="Enabled" />
                  <Label htmlFor="ws-enabled" className="cursor-pointer text-sm font-medium normal-case tracking-normal text-muted-foreground">Enabled</Label>
                </div>
                <div className={`flex items-center gap-2.5 rounded-xl border ${BORDER} px-4 py-3`}>
                  <Switch id="ws-default" checked={isDefault} onCheckedChange={setIsDefault} aria-label="Default workspace" />
                  <Label htmlFor="ws-default" className="cursor-pointer text-sm font-medium normal-case tracking-normal text-muted-foreground">Default workspace</Label>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className={`flex-row items-center justify-end gap-2 border-t ${BORDER} bg-[var(--color-surface)] px-6 py-4`}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
