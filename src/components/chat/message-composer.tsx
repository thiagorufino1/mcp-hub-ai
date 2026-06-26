"use client";

import { SendHorizontal, Square } from "@/components/ui/icons";
import { useEffect, useRef, useState } from "react";

import { AudioRecorder } from "@/components/chat/audio-recorder";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";

type Props = {
  isSubmitting?: boolean;
  onStop?: () => void;
  onSubmit: (message: string) => Promise<boolean>;
};

export function MessageComposer({ isSubmitting, onStop, onSubmit }: Props) {
  const { t } = useAppPreferences();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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
    setValue("");
    const submitted = await onSubmit(trimmed);
    if (!submitted) setValue(trimmed);
  }

  return (
    <div className="relative mx-auto w-full max-w-[980px] lg:max-w-[min(100%,1000px)] xl:max-w-[min(100%,1040px)] 2xl:max-w-[1080px]">

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
            placeholder={t("composer.placeholder")}
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
