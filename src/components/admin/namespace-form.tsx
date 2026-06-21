"use client";

import { useState, useTransition } from "react";

import { saveNamespace, type NamespaceRow } from "@/app/admin/workspaces/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ToolOption = {
  id: string;
  name: string;
  displayName: string | null;
  description: string | null;
  serverName: string;
};

export function NamespaceForm({
  groups,
  namespace,
  onClose,
  open,
  registryTools,
  users,
}: {
  groups: Array<{ id: string; displayName: string }>;
  namespace?: NamespaceRow;
  onClose: () => void;
  open: boolean;
  registryTools: ToolOption[];
  users: Array<{ id: string; name: string | null; email: string | null }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selectedGroups = new Set(namespace?.groups.map((group) => group.id) ?? []);
  const selectedTools = new Map(
    namespace?.tools.map((tool) => [tool.registryToolId, tool]) ?? [],
  );
  const selectedUsers = new Set(namespace?.users.map((user) => user.id) ?? []);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await saveNamespace(formData);
        onClose();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to save namespace.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="admin-dialog max-w-3xl">
        <DialogHeader>
          <DialogTitle>{namespace ? "Edit namespace" : "Add namespace"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={namespace?.id ?? ""} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1"><Label htmlFor="namespace-name">Name</Label><Input id="namespace-name" name="name" defaultValue={namespace?.name ?? ""} required /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="namespace-slug">Slug</Label><Input id="namespace-slug" name="slug" defaultValue={namespace?.slug ?? ""} required /></div>
          </div>
          <div className="flex flex-col gap-1"><Label htmlFor="namespace-description">Description</Label><Textarea id="namespace-description" name="description" defaultValue={namespace?.description ?? ""} rows={2} /></div>
          <fieldset className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Published tools</legend>
            {registryTools.map((tool) => {
              const selected = selectedTools.get(tool.id);
              const defaultAlias = `${tool.serverName}_${tool.name}`.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
              return (
                <div key={tool.id} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[auto_1fr_1fr]">
                  <input type="checkbox" name="toolIds" value={tool.id} defaultChecked={Boolean(selected)} aria-label={`Enable ${tool.name}`} />
                  <div>
                    <p className="text-sm font-medium">{tool.serverName} / {tool.displayName ?? tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.description || "No description."}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`alias-${tool.id}`}>Public alias</Label>
                    <Input id={`alias-${tool.id}`} name={`toolAlias:${tool.id}`} defaultValue={selected?.alias ?? defaultAlias} />
                  </div>
                </div>
              );
            })}
            {registryTools.length === 0 ? <p className="text-sm text-muted-foreground">Inspect an MCP server first to populate the tool registry.</p> : null}
          </fieldset>
          <fieldset className="flex flex-col gap-2 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Allowed groups</legend>
            {groups.map((group) => <label key={group.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="groupIds" value={group.id} defaultChecked={selectedGroups.has(group.id)} />{group.displayName}</label>)}
            {groups.length === 0 ? <p className="text-sm text-muted-foreground">No groups means any authenticated token can access it.</p> : null}
          </fieldset>
          <fieldset className="flex flex-col gap-2 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Allowed users</legend>
            {users.map((user) => <label key={user.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="userIds" value={user.id} defaultChecked={selectedUsers.has(user.id)} />{user.name || user.email || user.id}</label>)}
            {users.length === 0 ? <p className="text-sm text-muted-foreground">No users registered yet.</p> : null}
          </fieldset>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" value="true" defaultChecked={namespace?.enabled ?? true} />Enabled</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" value="true" defaultChecked={namespace?.published ?? false} />Published endpoint</label>
          </div>
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
