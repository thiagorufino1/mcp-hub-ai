"use client";

import { AlertCircle, CheckCircle2, ChevronDown, LoaderCircle, Wrench } from "@/components/ui/icons";
import { type ReactNode, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { cn } from "@/lib/utils";
import type { ToolEvent } from "@/types/chat";

export function ToolActivityCard({ event }: { event: ToolEvent }) {
  const { t } = useAppPreferences();
  const [isExpanded, setIsExpanded] = useState(event.status === "error");
  const statusConfig = {
    running: {
      icon: LoaderCircle,
      iconClass: "animate-spin text-[var(--color-warning)]",
      label: t("tool.running"),
      badge: "warning" as const,
    },
    success: {
      icon: CheckCircle2,
      iconClass: "text-[var(--color-success)]",
      label: t("tool.completed"),
      badge: "success" as const,
    },
    error: {
      icon: AlertCircle,
      iconClass: "text-[var(--color-error)]",
      label: t("tool.failed"),
      badge: "error" as const,
    },
  } as const;
  const status = statusConfig[event.status];
  const StatusIcon = status.icon;
  const toolLabel = event.detailKind === "context" ? t("tool.attachedMcp") : event.tool;

  const formattedSummary = useMemo(() => {
    if (!event.summary) return null;
    try {
      const parsed = JSON.parse(event.summary);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return event.summary;
    }
  }, [event.summary]);

  const imageUrls = useMemo(() => extractImageUrlsFromText(event.summary), [event.summary]);

  return (
    <div className="w-full py-0.5">
      {/* Collapsible header */}
      <button
        className="group flex w-full items-center gap-1.5 text-left"
        onClick={() => setIsExpanded((c) => !c)}
        type="button"
      >
        <StatusIcon className={cn("size-3.5 shrink-0", status.iconClass)} />
        <Wrench className="size-3 shrink-0 text-muted-foreground/50" />
        <span className="text-[12px] text-muted-foreground group-hover:text-foreground transition-colors">
          {toolLabel}
        </span>
        <ChevronDown className={cn("size-3 text-muted-foreground/60 transition-transform", isExpanded && "rotate-180")} />
        {event.status === "running" && (
          <span className="ml-1 text-[11px] text-muted-foreground/60 italic">{t("tool.running")}…</span>
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="ml-5 mt-2 space-y-2">
          {imageUrls.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {imageUrls.map((url) => <ToolImagePreview key={url} url={url} />)}
            </div>
          )}

          {event.argsText && (
            <ExpandPanel label={t("tool.arguments")}>
              <JsonBlock value={event.argsText} maxH="max-h-[140px]" />
            </ExpandPanel>
          )}

          {event.summary && (
            <ExpandPanel label={t("tool.result")}>
              <div className="app-scroll max-h-[320px] overflow-y-auto px-3 py-2.5">
                {looksLikeMarkdown(event.summary) ? (
                  <div className="tool-result-md prose prose-sm max-w-none text-[12px] leading-relaxed text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.summary}</ReactMarkdown>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-foreground/80">
                    {formattedSummary}
                  </pre>
                )}
              </div>
            </ExpandPanel>
          )}
        </div>
      )}
    </div>
  );
}

function ExpandPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--color-border)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/80 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">{label}</span>
      </div>
      <div className="bg-[var(--color-surface-muted)]/40">{children}</div>
    </div>
  );
}

function JsonBlock({ value, maxH = "max-h-[140px]" }: { value: string; maxH?: string }) {
  const formatted = useMemo(() => {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // Try wrapping in braces if it looks like key:value pairs
      try { return JSON.stringify(JSON.parse(`{${value}}`), null, 2); }
      catch { return value; }
    }
  }, [value]);

  const tokens = useMemo(() => tokenizeJson(formatted), [formatted]);

  return (
    <div className={cn("app-scroll overflow-x-auto overflow-y-auto px-3 py-2.5", maxH)}>
      <pre className="whitespace-pre font-mono text-[11px] leading-[1.65]">
        {tokens.map((tok, i) => (
          <span key={i} className={tok.cls}>{tok.text}</span>
        ))}
      </pre>
    </div>
  );
}

function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s|```|\*\*|__|\n- |\n\d+\. |^\- /m.test(text);
}

function tokenizeJson(src: string): { text: string; cls: string }[] {
  const out: { text: string; cls: string }[] = [];
  const re = /("(?:[^"\\]|\\.)*")(:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out.push({ text: src.slice(last, m.index), cls: "text-muted-foreground/50" });
    if (m[1]) {
      // string — key or value
      out.push({ text: m[1], cls: m[2] ? "text-[#2563eb]" : "text-[#16a34a]" });
      if (m[2]) out.push({ text: m[2], cls: "text-slate-500" });
    } else if (m[3]) {
      out.push({ text: m[3], cls: "text-[#d97706]" });
    } else if (m[4]) {
      out.push({ text: m[4], cls: "text-[#7c3aed]" });
    } else if (m[5]) {
      out.push({ text: m[5], cls: "text-muted-foreground/50" });
    }
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ text: src.slice(last), cls: "text-muted-foreground/50" });
  return out;
}

function ToolImagePreview({ url }: { url: string }) {
  const { t } = useAppPreferences();
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <p className="text-[12px] font-medium text-foreground">{t("tool.remoteImage")}</p>
        <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{t("tool.previewFailed")}</p>
        <a className="mt-2 inline-block text-[12px] text-[var(--color-primary)] underline" href={url} rel="noopener noreferrer" target="_blank">
          {t("tool.openImage")}
        </a>
      </div>
    );
  }

  return (
    <a
      className="overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={t("tool.imageAlt")}
        className="block h-44 w-full object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
        src={url}
        onError={() => setFailed(true)}
      />
      <div className="truncate border-t border-[var(--color-border)] px-3 py-2 text-[11px] text-muted-foreground">{url}</div>
    </a>
  );
}

function extractImageUrlsFromText(input?: string) {
  if (!input) return [];

  const urls = new Set<string>();

  try {
    const parsed = JSON.parse(input) as unknown;
    collectImageUrls(parsed, urls);
  } catch {
    // Fall through to regex extraction.
  }

  const regex = /https?:\/\/[^\s"'`)\]}]+/g;
  for (const match of input.match(regex) ?? []) {
    if (looksLikeImageUrl(match)) {
      urls.add(cleanUrl(match));
    }
  }

  return Array.from(urls).slice(0, 8);
}

function collectImageUrls(value: unknown, urls: Set<string>) {
  if (!value) return;

  if (typeof value === "string") {
    if (looksLikeImageUrl(value)) {
      urls.add(cleanUrl(value));
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectImageUrls(item, urls);
    }
    return;
  }

  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (typeof nested === "string" && isImageKey(key) && looksLikeImageUrl(nested)) {
        urls.add(cleanUrl(nested));
      }
      collectImageUrls(nested, urls);
    }
  }
}

function isImageKey(key: string) {
  return ["image", "image_url", "imageUrl", "src", "thumbnail", "thumbnail_url", "url"].includes(key);
}

function looksLikeImageUrl(url: string) {
  const clean = cleanUrl(url);
  if (!/^https?:\/\//i.test(clean)) return false;
  if (/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(clean)) return true;
  try {
    return new URL(clean).hostname.endsWith("cdn.shopify.com");
  } catch {
    return false;
  }
}

function cleanUrl(url: string) {
  return url.replace(/[),\]}>'"]+$/g, "").trim();
}
