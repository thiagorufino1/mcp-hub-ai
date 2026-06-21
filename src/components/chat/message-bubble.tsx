"use client";

import { Bot, Check, Copy, ThumbsDown, ThumbsUp, User } from "@/components/ui/icons";
import { useState } from "react";

import { MarkdownContent } from "@/components/chat/markdown-content";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatTime, formatTokenCount } from "@/lib/utils";
import type { Message } from "@/types/chat";

type Props = {
  message: Message;
  onFeedback: (messageId: string, value: "up" | "down") => void;
};

export function MessageBubble({ message, onFeedback }: Props) {
  const { t } = useAppPreferences();
  const isAssistant = message.role === "assistant";
  const [copied, setCopied] = useState(false);
  const isThinking = isAssistant && message.status === "streaming" && message.content.trim() === "";
  const usageLabel =
    isAssistant && message.usage
      ? [
          `${t("sidebar.input")} ${formatTokenCount(message.usage.inputTokens)}`,
          `${t("sidebar.output")} ${formatTokenCount(message.usage.outputTokens)}`,
          `${t("sidebar.total")} ${formatTokenCount(message.usage.totalTokens)}`,
        ]
      : null;

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  if (!isAssistant) {
    return (
      <div className="flex w-full justify-end">
        <div
          className="max-w-[85%] rounded-[24px] rounded-br-[10px] px-4 py-4 text-white shadow-[0_16px_34px_rgba(9,105,218,0.24)] dark:shadow-none sm:max-w-[500px]"
          style={{ background: "var(--gradient-action)" }}
        >
          <div className="mb-3 flex items-center gap-3">
            <Avatar className="size-8 border-0">
              <AvatarFallback className="text-white" style={{ background: "var(--gradient-action)" }}>
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-white">{t("message.you")}</p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/70">
                <span>{formatTime(message.createdAt)}</span>
              </div>
            </div>
          </div>
          <p className="break-words whitespace-pre-wrap text-[12px] leading-[1.65] text-white">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex justify-start">
      <div
        className={cn(
          "workspace-panel w-full rounded-[24px] rounded-tl-[10px] px-4 py-4 sm:px-5",
          message.status === "error" && "border-[var(--color-error)]/25",
          message.status === "stopped" && "border-[var(--color-warning)]/25",
        )}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-8 border-0">
              <AvatarFallback className="text-white" style={{ background: "var(--gradient-action)" }}>
                <Bot className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[12px] font-semibold text-foreground">{t("message.assistant")}</p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>{formatTime(message.createdAt)}</span>
                {message.status === "stopped" ? <Badge variant="warning">{t("message.stopped")}</Badge> : null}
                {message.status === "error" ? <Badge variant="error">{t("message.error")}</Badge> : null}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-full px-2.5 !text-[12px] font-normal leading-6 text-muted-foreground opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [&_svg]:size-3.5"
            onClick={() => void handleCopy()}
            aria-label={t("message.copyResponse")}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? t("message.copied") : t("message.copy")}
          </Button>
        </div>

        {isThinking ? (
          <div
            aria-live="polite"
            className="inline-flex items-center gap-2.5 rounded-full border border-[var(--color-primary)]/14 bg-[var(--color-primary-soft)] px-4 py-2.5 text-[12px] font-semibold text-[var(--color-primary-strong)]"
          >
            <span className="flex items-center gap-1">
              <span className="thinking-dot size-1.5 rounded-full bg-current [animation-delay:0ms]" />
              <span className="thinking-dot size-1.5 rounded-full bg-current [animation-delay:200ms]" />
              <span className="thinking-dot size-1.5 rounded-full bg-current [animation-delay:400ms]" />
            </span>
            <span className="tracking-wide">{t("message.thinking")}</span>
          </div>
        ) : (
          <MarkdownContent content={message.content} />
        )}

        {usageLabel ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {usageLabel.map((item) => (
              <span key={item} className="metric-chip inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium">
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <div aria-atomic="true" aria-live="polite" className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "!h-6 rounded-full px-2 !text-[12px] [&_svg]:!size-3",
              message.feedback === "up"
                ? "bg-[var(--color-success-soft)] text-[var(--color-success)] hover:bg-[var(--color-success-soft)]"
                : "text-muted-foreground",
            )}
            onClick={() => onFeedback(message.id, "up")}
          >
            <ThumbsUp />
            {t("message.helpful")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "!h-6 rounded-full px-2 !text-[12px] [&_svg]:!size-3",
              message.feedback === "down"
                ? "bg-[var(--color-error-soft)] text-[var(--color-error)] hover:bg-[var(--color-error-soft)]"
                : "text-muted-foreground",
            )}
            onClick={() => onFeedback(message.id, "down")}
          >
            <ThumbsDown />
            {t("message.notHelpful")}
          </Button>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {copied ? t("message.responseCopied") : ""}
      </p>
    </div>
  );
}
