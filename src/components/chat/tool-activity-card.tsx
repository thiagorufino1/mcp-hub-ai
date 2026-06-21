"use client";

import { AlertCircle, CheckCircle2, ChevronDown, LoaderCircle, Wrench } from "@/components/ui/icons";
import { useMemo, useState } from "react";

import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Badge } from "@/components/ui/badge";
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
    <div className="w-full">
      <div className="workspace-panel rounded-[20px] px-3 py-2.5 sm:px-4">
        <button className="flex w-full items-center gap-3 text-left" onClick={() => setIsExpanded((current) => !current)} type="button">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full text-white" style={{ background: "var(--gradient-action)" }}>
              <Wrench className="size-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="min-w-0 break-all text-[13px] font-semibold text-foreground">{toolLabel}</p>
              </div>
              <p className="truncate pt-0.5 text-[12px] leading-5 text-muted-foreground">
                {event.summary ?? event.reason ?? t("tool.doneClickDetails")}
              </p>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 self-center">
            <Badge variant={status.badge} className="rounded-full px-2.5 py-0.5 text-[11px]">
              <StatusIcon className={cn("size-3", status.iconClass)} />
              {status.label}
            </Badge>
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
          </div>
        </button>

        {isExpanded ? (
          <div className="mt-2.5 space-y-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2.5 sm:px-4">
            {imageUrls.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("tool.imagesDetected")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {imageUrls.map((url) => (
                    <ToolImagePreview key={url} url={url} />
                  ))}
                </div>
              </div>
            ) : null}

            {event.argsText ? (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("tool.arguments")}</p>
                <pre className="app-scroll max-h-[120px] overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
                  {event.argsText}
                </pre>
              </div>
            ) : null}

            {event.summary ? (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("tool.result")}</p>
                <pre className="app-scroll max-h-[260px] overflow-y-auto break-all whitespace-pre-wrap rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 font-mono text-[11px] leading-5 text-[var(--color-text-secondary)]">
                  {formattedSummary}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
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
  return /^https?:\/\//i.test(clean) && (/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(clean) || clean.includes("cdn.shopify.com"));
}

function cleanUrl(url: string) {
  return url.replace(/[),\]}>'"]+$/g, "").trim();
}
