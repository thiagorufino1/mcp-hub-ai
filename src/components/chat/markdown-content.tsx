import { memo, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { ChartBlock, parseChartSpec } from "@/components/chat/chart-block";

type ContentSegment =
  | { type: "markdown"; value: string }
  | { type: "chart"; value: string }
  | { type: "image"; value: string };

function MarkdownContentComponent({ content }: { content: string }) {
  const segments = splitChartBlocks(content);

  return (
    <div className="markdown-body text-[12px] leading-6">
      {segments.map((segment, index) => {
        if (segment.type === "chart") {
          const spec = parseChartSpec(segment.value);
          if (spec) {
            return <ChartBlock key={`chart-${index}`} spec={spec} />;
          }
        }

        if (segment.type === "image") {
          return <MarkdownImage key={`image-${index}`} src={segment.value} alt="Imagem renderizada automaticamente" />;
        }

        return <MarkdownSegment key={`md-${index}`} content={segment.value} />;
      })}
    </div>
  );
}

function MarkdownSegment({ content }: { content: string }) {
  const normalizedContent = normalizeLoosePipeTables(content);

  return (
    <ReactMarkdown
      components={{
        a: ({ href, children }) => (
          <a href={href} rel="noopener noreferrer" target={href?.startsWith("http") ? "_blank" : undefined}>
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="my-4 max-w-full overflow-x-auto app-scroll">
            <table className="min-w-max border-collapse rounded-2xl border border-[var(--color-border)] text-left">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="whitespace-nowrap border-b border-[var(--color-border)] bg-[hsl(var(--muted))] px-3 py-2 text-[11px] font-semibold text-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-2 text-[12px] text-foreground">
            {children}
          </td>
        ),
        p: ({ children }) => {
          const childArray = toNodeArray(children);
          const hasOnlyImageContent = childArray.every((child) => isImageLikeNode(child) || isWhitespaceNode(child));

          if (hasOnlyImageContent) {
            return <>{children}</>;
          }

          return <p>{children}</p>;
        },
        img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} />,
      }}
      rehypePlugins={[rehypeSanitize, rehypeHighlight]}
      remarkPlugins={[remarkGfm]}
    >
      {normalizedContent}
    </ReactMarkdown>
  );
}

function normalizeLoosePipeTables(content: string) {
  const lines = content.split("\n");
  const normalized: string[] = [];
  let buffer: string[] = [];

  function flushBuffer() {
    if (buffer.length === 0) {
      return;
    }

    const tableLikeLines = buffer.filter((line) => line.includes("|"));
    const hasManyColumns = tableLikeLines.some((line) => line.split("|").filter(Boolean).length >= 3);
    const hasHeaderAndSeparator = buffer.some((line) => /^(\s*\|?.+\|.+\|?\s*)$/.test(line)) &&
      buffer.some((line) => /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line));

    if (hasManyColumns && !hasHeaderAndSeparator && buffer.length >= 2) {
      const header = buffer[0]?.trim();
      const separator = `|${header?.split("|").filter(Boolean).map(() => " --- ").join("|") }|`;
      normalized.push(header);
      normalized.push(separator);
      normalized.push(...buffer.slice(1));
    } else {
      normalized.push(...buffer);
    }

    buffer = [];
  }

  for (const line of lines) {
    if (line.includes("|")) {
      buffer.push(line);
      continue;
    }

    flushBuffer();
    normalized.push(line);
  }

  flushBuffer();
  return normalized.join("\n");
}

function splitChartBlocks(content: string): ContentSegment[] {
  const pattern = /```chart\s*([\s\S]*?)```/g;
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const [fullMatch, chartValue] = match;
    const start = match.index;

    if (start > lastIndex) {
      pushMarkdownWithStandaloneImages(segments, content.slice(lastIndex, start));
    }

    segments.push({ type: "chart", value: chartValue.trim() });
    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < content.length) {
    pushMarkdownWithStandaloneImages(segments, content.slice(lastIndex));
  }

  return segments.length > 0 ? segments : [{ type: "markdown", value: content }];
}

function pushMarkdownWithStandaloneImages(segments: ContentSegment[], raw: string) {
  const lines = raw.split("\n");
  let buffer: string[] = [];

  const flushBuffer = () => {
    const value = buffer.join("\n").trim();
    if (value) {
      segments.push({ type: "markdown", value });
    }
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (looksLikeImageUrl(trimmed)) {
      flushBuffer();
      segments.push({ type: "image", value: trimmed });
      continue;
    }

    buffer.push(line);
  }

  flushBuffer();
}

function MarkdownImage({ src, alt }: { src?: string | Blob; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const normalizedSrc = typeof src === "string" ? src.trim() : "";

  if (!normalizedSrc) {
    return null;
  }

  if (failed) {
    return (
      <div className="my-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 p-4">
        <p className="text-sm font-medium text-foreground">{alt || "Imagem"}</p>
        <p className="mt-1 text-sm text-muted-foreground">Nao foi possivel carregar a imagem remota.</p>
        <a className="mt-2 inline-block text-sm" href={normalizedSrc} rel="noopener noreferrer" target="_blank">
          Abrir imagem em nova guia
        </a>
      </div>
    );
  }

  return (
    <figure className="my-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt ?? ""}
        className="block h-auto max-h-[460px] w-full object-contain bg-[var(--color-surface-muted)]"
        loading="lazy"
        referrerPolicy="no-referrer"
        src={normalizedSrc}
        onError={() => setFailed(true)}
      />
      {alt ? <figcaption className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs text-muted-foreground">{alt}</figcaption> : null}
    </figure>
  );
}

function looksLikeImageUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value) && /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(value);
}

function toNodeArray(children: ReactNode): ReactNode[] {
  return Array.isArray(children) ? children : [children];
}

function isWhitespaceNode(node: ReactNode) {
  return typeof node === "string" && node.trim().length === 0;
}

function isImageLikeNode(node: ReactNode) {
  if (!node || typeof node !== "object") {
    return false;
  }

  return "type" in node && node.type === "img";
}

export const MarkdownContent = memo(MarkdownContentComponent);
