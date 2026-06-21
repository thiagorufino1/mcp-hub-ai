"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { upsertGroup } from "@/app/admin/groups/actions";
import type { GroupRow } from "@/app/admin/groups/actions";

type McpOption = { id: string; name: string };
type SkillOption = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  group?: GroupRow;
  mcpOptions: McpOption[];
  skillOptions: SkillOption[];
};

export function GroupForm({ open, onClose, group, mcpOptions, skillOptions }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedMcps = new Set(group?.policy?.mcpServers.map((m) => m.id) ?? []);
  const selectedSkills = new Set(group?.policy?.skills.map((s) => s.id) ?? []);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await upsertGroup(formData);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="admin-dialog max-w-xl">
        <DialogHeader>
          <DialogTitle>{group ? "Edit Group Policy" : "Add Group"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="entraGroupId">Entra Group Object ID *</Label>
            <Input
              id="entraGroupId"
              name="entraGroupId"
              defaultValue={group?.entraGroupId}
              required
              readOnly={!!group}
              className={group ? "opacity-60" : ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input id="displayName" name="displayName" defaultValue={group?.displayName} required />
          </div>

          <div className="space-y-2">
            <Label>MCP Servers</Label>
            <div className="admin-form-card max-h-40 overflow-y-auto">
              {mcpOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">No MCP servers configured.</p>
              )}
              {mcpOptions.map((mcp) => (
                <label key={mcp.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="mcpServerIds"
                    value={mcp.id}
                    defaultChecked={selectedMcps.has(mcp.id)}
                    className="h-4 w-4 rounded"
                  />
                  {mcp.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="admin-form-card max-h-40 overflow-y-auto">
              {skillOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">No skills configured.</p>
              )}
              {skillOptions.map((skill) => (
                <label key={skill.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="skillIds"
                    value={skill.id}
                    defaultChecked={selectedSkills.has(skill.id)}
                    className="h-4 w-4 rounded"
                  />
                  {skill.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="allowedModels">Allowed Models (one per line)</Label>
            <textarea
              id="allowedModels"
              name="allowedModels"
              defaultValue={group?.policy?.allowedModels.join("\n") ?? ""}
              rows={3}
              placeholder={"gpt-4o\nclaude-sonnet-4-6"}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-mono resize-y shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="admin-form-footer">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
