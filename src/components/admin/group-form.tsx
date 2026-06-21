"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { upsertGroup } from "@/app/admin/groups/actions";
import type { GroupRow } from "@/app/admin/groups/actions";

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
      <DialogContent
        className={`max-w-md gap-0 overflow-hidden rounded-2xl border ${BORDER} bg-[var(--color-surface)] p-0 shadow-[0_20px_48px_rgba(15,23,42,0.10)]`}
      >
        <DialogHeader className={`border-b ${BORDER} bg-[var(--color-surface)] px-6 py-4`}>
          <DialogTitle className="text-base font-semibold">
            {group ? "Edit Group" : "Add Entra Group"}
          </DialogTitle>
        </DialogHeader>

        <form action={handleSubmit}>
          <input type="hidden" name="id" value={group?.id ?? ""} />

          <div className="flex flex-col gap-4 bg-[var(--color-bg)] px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entraGroupId">Entra Group Object ID *</Label>
              <Input
                id="entraGroupId"
                name="entraGroupId"
                defaultValue={group?.entraGroupId ?? ""}
                required
                readOnly={!!group}
                className={group ? "opacity-60" : ""}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={group?.displayName ?? ""}
                required
                placeholder="e.g. Engineering Team"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className={`flex-row items-center justify-end gap-2 border-t ${BORDER} bg-[var(--color-surface)] px-6 py-4`}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
