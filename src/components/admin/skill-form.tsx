"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SkillRow } from "@/app/admin/skills/actions";
import { createSkill, updateSkill } from "@/app/admin/skills/actions";

type Props = { open: boolean; onClose: () => void; skill?: SkillRow };

export function SkillForm({ open, onClose, skill }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (skill) {
          await updateSkill(skill.id, formData);
        } else {
          await createSkill(formData);
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{skill ? "Edit Skill" : "Add Skill"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={skill?.name} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={skill?.description ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="content">Content (Markdown) *</Label>
            <textarea
              id="content"
              name="content"
              defaultValue={skill?.content ?? ""}
              rows={14}
              required
              placeholder={"# Skill Name\n\nYou are a helpful assistant that...\n\n## Instructions\n\n- ..."}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y"
            />
          </div>
          <div className="flex items-center gap-2">
            <input id="enabled" name="enabled" type="checkbox" value="true" defaultChecked={skill?.enabled ?? true} className="h-4 w-4 rounded" />
            <Label htmlFor="enabled">Enabled</Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
