"use client";

import { useState, useTransition } from "react";

import { saveWorkspace, type WorkspaceRow } from "@/app/admin/workspaces/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Option = { id: string; name: string };

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
  const selectedGroups = new Set(workspace?.groups.map((group) => group.id) ?? []);
  const selectedSkills = new Set(workspace?.skills.map((skill) => skill.id) ?? []);
  const selectedUsers = new Set(workspace?.users.map((user) => user.id) ?? []);

  function submit(formData: FormData) {
    setError(null);
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
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="admin-dialog max-w-2xl">
        <DialogHeader>
          <DialogTitle>{workspace ? "Edit workspace" : "Add workspace"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={workspace?.id ?? ""} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" name="name" value={workspace?.name} required />
            <Field label="Slug" name="slug" value={workspace?.slug} required />
          </div>
          <TextField label="Description" name="description" value={workspace?.description} rows={2} />
          <TextField label="System prompt" name="systemPrompt" value={workspace?.systemPrompt} rows={5} />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Namespace" name="namespaceId" value={workspace?.namespaceId} options={namespaces} />
            <SelectField
              label="LLM configuration"
              name="llmConfigId"
              value={workspace?.llmConfigId}
              options={llms.map((llm) => ({ id: llm.id, name: llm.displayName }))}
            />
            <Field label="Preferred model" name="model" value={workspace?.model} />
            <Field label="Maximum agent steps" name="maxSteps" value={String(workspace?.maxSteps ?? 6)} type="number" required />
          </div>
          <TextField
            label="Conversation starters (one per line)"
            name="conversationStarters"
            value={workspace?.conversationStarters.join("\n")}
            rows={4}
          />
          <CheckList label="Skills" name="skillIds" options={skills} selected={selectedSkills} />
          <CheckList
            label="Allowed groups"
            name="groupIds"
            options={groups.map((group) => ({ id: group.id, name: group.displayName }))}
            selected={selectedGroups}
          />
          <CheckList
            label="Allowed users"
            name="userIds"
            options={users.map((user) => ({
              id: user.id,
              name: user.name || user.email || user.id,
            }))}
            selected={selectedUsers}
          />
          <div className="flex flex-wrap gap-4">
            <Check name="enabled" label="Enabled" checked={workspace?.enabled ?? true} />
            <Check name="isDefault" label="Default workspace" checked={workspace?.isDefault ?? false} />
          </div>
          <input type="hidden" name="approvalMode" value="risk_based" />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="admin-form-footer">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, name, required, type = "text", value }: { label: string; name: string; required?: boolean; type?: string; value?: string | null }) {
  return <div className="flex flex-col gap-1"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} defaultValue={value ?? ""} required={required} /></div>;
}
function TextField({ label, name, rows, value }: { label: string; name: string; rows: number; value?: string | null }) {
  return <div className="flex flex-col gap-1"><Label htmlFor={name}>{label}</Label><Textarea id={name} name={name} rows={rows} defaultValue={value ?? ""} /></div>;
}
function SelectField({ label, name, options, value }: { label: string; name: string; options: Option[]; value?: string | null }) {
  return <div className="flex flex-col gap-1"><Label htmlFor={name}>{label}</Label><select id={name} name={name} defaultValue={value ?? ""} className="rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Automatic / none</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>;
}
function CheckList({ label, name, options, selected }: { label: string; name: string; options: Option[]; selected: Set<string> }) {
  return <fieldset className="flex flex-col gap-2 rounded-md border p-3"><legend className="px-1 text-sm font-medium">{label}</legend>{options.map((option) => <label key={option.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} value={option.id} defaultChecked={selected.has(option.id)} />{option.name}</label>)}{options.length === 0 ? <p className="text-sm text-muted-foreground">No options available.</p> : null}</fieldset>;
}
function Check({ checked, label, name }: { checked: boolean; label: string; name: string }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} value="true" defaultChecked={checked} />{label}</label>;
}
