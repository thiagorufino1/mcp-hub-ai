"use client";

import { SendHorizontal, Square } from "@/components/ui/icons";
import { useCallback, useEffect, useRef, useState } from "react";

import { AudioRecorder } from "@/components/chat/audio-recorder";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Skill = { id: string; name: string; description: string | null };

type Props = {
  isSubmitting?: boolean;
  onStop?: () => void;
  onSubmit: (message: string) => Promise<boolean>;
  skills?: Skill[];
  onSkillSelect?: (skillId: string | null) => void;
  activeSkillId?: string | null;
};

export function MessageComposer({ isSubmitting, onStop, onSubmit, skills = [], onSkillSelect, activeSkillId }: Props) {
  const { t } = useAppPreferences();
  const [value, setValue] = useState("");
  const [query, setQuery] = useState<string | null>(null); // null = picker closed
  const [activeIdx, setActiveIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const shouldRefocusRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [value]);

  // Refocus after submit
  useEffect(() => {
    if (!isSubmitting && shouldRefocusRef.current) {
      textareaRef.current?.focus();
      shouldRefocusRef.current = false;
    }
  }, [isSubmitting]);

  const filtered = query !== null
    ? skills.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  const closePicker = useCallback(() => {
    setQuery(null);
    setActiveIdx(0);
  }, []);

  function selectSkill(skill: Skill) {
    // Remove the /query text from the textarea
    setValue((prev) => prev.replace(/\/\S*$/, ""));
    onSkillSelect?.(skill.id);
    closePicker();
    textareaRef.current?.focus();
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setValue(val);

    // Detect /query at end of input (or anywhere before cursor)
    const cursor = e.target.selectionStart ?? val.length;
    const textUpToCursor = val.slice(0, cursor);
    const slashMatch = /(?:^|\s)(\/(\S*))$/.exec(textUpToCursor);

    if (slashMatch && skills.length > 0) {
      setQuery(slashMatch[2] ?? "");
      setActiveIdx(0);
    } else {
      closePicker();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query !== null && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        const skill = filtered[activeIdx];
        if (skill && e.key === "Tab") {
          e.preventDefault();
          selectSkill(skill);
          return;
        }
        if (skill && e.key === "Enter") {
          e.preventDefault();
          selectSkill(skill);
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closePicker();
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) form.requestSubmit();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;
    shouldRefocusRef.current = true;
    closePicker();
    setValue("");
    const submitted = await onSubmit(trimmed);
    if (!submitted) setValue(trimmed);
  }

  return (
    <div className="relative mx-auto w-full max-w-[980px] lg:max-w-[min(100%,1000px)] xl:max-w-[min(100%,1040px)] 2xl:max-w-[1080px]">

      {/* Skill picker popup */}
      {query !== null && filtered.length > 0 && (
        <div
          ref={pickerRef}
          className="absolute bottom-full mb-2 left-0 right-0 z-50 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
        >
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b border-[var(--color-border)]">
            Skills
          </div>
          <ul>
            {filtered.map((skill, idx) => (
              <li key={skill.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors",
                    idx === activeIdx
                      ? "bg-[var(--color-primary)]/8 text-[var(--color-primary)]"
                      : "hover:bg-[var(--color-surface-muted)]",
                  )}
                  onMouseDown={(e) => { e.preventDefault(); selectSkill(skill); }}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <span className="text-sm font-semibold">/{skill.name}</span>
                  {skill.description && (
                    <span className="text-xs text-muted-foreground">{skill.description}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeSkillId && (() => {
        const activeSkill = skills.find(s => s.id === activeSkillId);
        return activeSkill ? (
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/8 px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]">
              <span className="size-1.5 rounded-full bg-[var(--color-primary)]" />
              /{activeSkill.name}
            </span>
            <button
              type="button"
              onClick={() => onSkillSelect?.(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ) : null;
      })()}

      <form
        className="flex w-full items-center gap-3 rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <AudioRecorder
          disabled={Boolean(isSubmitting)}
          onTranscriptReady={async (transcript) => {
            if (isSubmitting) return;
            shouldRefocusRef.current = true;
            const submitted = await onSubmit(transcript);
            if (!submitted) {
              setValue((current) => [current, transcript].filter(Boolean).join(" ").trim());
            }
          }}
        />

        <div className="flex min-w-0 flex-1 items-center">
          <label className="sr-only" htmlFor="chat-message">{t("composer.label")}</label>
          <textarea
            id="chat-message"
            name="message"
            ref={textareaRef}
            aria-describedby="chat-message-help"
            autoComplete="off"
            className="app-scroll font-sans min-h-[40px] max-h-[220px] w-full resize-none overflow-y-auto bg-transparent px-1 py-2 text-[13px] leading-6 text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
            style={{ fontSize: "13px" }}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={skills.length > 0 ? `${t("composer.placeholder")} · Type / to use a skill` : t("composer.placeholder")}
            rows={1}
            spellCheck={false}
            value={value}
          />
          <p className="sr-only" id="chat-message-help">
            {isSubmitting ? t("composer.streamingHelp") : t("composer.idleHelp")}
          </p>
        </div>

        {isSubmitting ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="size-10 shrink-0 rounded-full shadow-none"
            onClick={onStop}
            aria-label={t("composer.stop")}
          >
            <Square className="size-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="size-10 shrink-0 rounded-full border border-[var(--color-primary)]/12 text-white shadow-none hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--gradient-action)" }}
            disabled={!value.trim()}
            aria-label={t("composer.send")}
          >
            <SendHorizontal className="size-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
