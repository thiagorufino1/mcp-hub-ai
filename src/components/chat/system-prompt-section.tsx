"use client";

import { BookText, CheckCircle2, PencilLine, Plus, Trash2 } from "@/components/ui/icons";
import { useState } from "react";

import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type SystemPrompt = {
  id: string;
  name: string;
  content: string;
};

type Props = {
  prompts: SystemPrompt[];
  activePromptId: string | null;
  onAdd: (prompt: SystemPrompt) => void;
  onEdit: (prompt: SystemPrompt) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string | null) => void;
};

type DialogState = { mode: "closed" } | { mode: "add" } | { mode: "edit"; prompt: SystemPrompt };

function PromptDialog({
  state,
  onClose,
  onSave,
}: {
  state: DialogState;
  onClose: () => void;
  onSave: (payload: { name: string; content: string }) => void;
}) {
  const { t } = useAppPreferences();
  const isOpen = state.mode !== "closed";
  const initial = state.mode === "edit" ? state.prompt : null;
  const [content, setContent] = useState(initial?.content ?? "");

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function handleSave() {
    const trimmed = content.trim();
    if (!trimmed) return;
    const autoName = trimmed.slice(0, 48).replace(/\n[\s\S]*/, "").trim() || t("sidebar.promptTitle");
    onSave({ name: autoName, content: trimmed });
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0 shadow-[0_20px_48px_rgba(15,23,42,0.10)]">
        <DialogHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
          <DialogTitle className="text-base font-semibold text-foreground">{t("sidebar.promptDialogTitle")}</DialogTitle>
          <DialogDescription className="text-[13px] text-[var(--color-primary)]">
            {t("sidebar.promptDialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-[var(--color-bg)] px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="prompt-content" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("sidebar.promptField")}
            </Label>
            <Textarea
              id="prompt-content"
              className="min-h-[200px] resize-none rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] leading-5 shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0"
              placeholder={t("sidebar.promptPlaceholder")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-4">
          <Button
            variant="ghost"
            className="rounded-lg text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            {t("sidebar.cancel")}
          </Button>
          <Button
            disabled={!content.trim()}
            className="rounded-lg text-white shadow-[0_4px_14px_rgba(9,105,218,0.30)] hover:opacity-90 hover:shadow-[0_4px_18px_rgba(9,105,218,0.40)] dark:shadow-none dark:hover:shadow-none"
            style={{ background: "var(--gradient-action)" }}
            onClick={handleSave}
          >
            {state.mode === "edit" ? <PencilLine className="size-4" /> : <CheckCircle2 className="size-4" />}
            {state.mode === "edit" ? t("sidebar.save") : t("sidebar.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SystemPromptSection({
  prompts,
  activePromptId,
  onAdd,
  onEdit,
  onDelete,
  onSelect,
}: Props) {
  const { t } = useAppPreferences();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });

  const prompt = prompts.find((item) => item.id === activePromptId) ?? prompts[0] ?? null;

  function handleSave(payload: { name: string; content: string }) {
    if (dialog.mode === "edit" && prompt) {
      onEdit({ ...prompt, name: payload.name, content: payload.content });
    } else {
      onAdd({ id: `sp-${crypto.randomUUID()}`, name: payload.name, content: payload.content });
    }
  }

  return (
    <>
      <PromptDialog
        key={dialog.mode === "edit" ? dialog.prompt.id : dialog.mode}
        state={dialog}
        onClose={() => setDialog({ mode: "closed" })}
        onSave={handleSave}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--gradient-action)" }}
          >
            <BookText className="size-3.5 text-white" />
          </div>
          <h2 className="flex-1 text-[15px] font-semibold leading-5 text-foreground">
            {t("sidebar.promptTitle")}
          </h2>
          {prompt ? (
            <div className="flex items-center gap-0">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-muted-foreground/45 hover:text-foreground"
                onClick={() => setDialog({ mode: "edit", prompt })}
                aria-label={t("sidebar.editPrompt")}
              >
                <PencilLine className="size-[14px]" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
                onClick={() => onDelete(prompt.id)}
                aria-label={t("sidebar.removePrompt")}
              >
                <Trash2 className="size-[14px]" />
              </Button>
            </div>
          ) : null}
        </div>

        {!prompt ? (
          <button
            type="button"
            onClick={() => setDialog({ mode: "add" })}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[13px] font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
            style={{ background: "var(--gradient-action)" }}
          >
            <Plus className="size-3.5" />
            {t("sidebar.addPrompt")}
          </button>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onSelect(prompt.id)}
              className="w-full rounded-xl border border-border bg-card px-3 py-3 text-left transition hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-6 text-[12px] leading-5 text-foreground/78">
                  {prompt.content}
                </p>
                <span className="shrink-0 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] text-[var(--color-primary)]">
                  {t("sidebar.promptActive")}
                </span>
              </div>
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              {t("sidebar.promptHint")}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
