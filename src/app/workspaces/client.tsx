"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Bot, Layers3, Search, Sparkles } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type WorkspaceItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isDefault: boolean;
  conversationStarters: string[];
  llmProvider: string | null;
  llmName: string | null;
  skillCount: number;
  namespaceName: string | null;
  namespaceAlias: string | null;
};

function providerLabel(provider: string | null) {
  if (!provider) return "Automatic";
  const map: Record<string, string> = {
    openai: "OpenAI",
    azure: "Azure",
    anthropic: "Anthropic",
    google: "Google",
    groq: "Groq",
    ollama: "Ollama",
    bedrock: "Bedrock",
    xai: "xAI",
    mistral: "Mistral",
    deepseek: "DeepSeek",
  };
  return map[provider] ?? provider;
}

function WorkspaceCard({ item }: { item: WorkspaceItem }) {
  return (
    <Link
      href={`/chat?w=${item.id}`}
      className={cn(
        "group flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(17,63,124,0.04)] transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:shadow-[0_12px_32px_rgba(17,63,124,0.12)]",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary)] group-hover:text-white">
          <Bot className="size-5" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {item.isDefault && (
            <Badge variant="info">Default</Badge>
          )}
        </div>
      </div>

      {/* Title + description */}
      <div className="flex-1">
        <h2 className="text-base font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)]">
          {item.name}
        </h2>
        <p className="mt-1 font-mono text-xs text-muted-foreground">/{item.slug}</p>
        {item.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>

      {/* Conversation starters preview */}
      {item.conversationStarters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.conversationStarters.slice(0, 2).map((starter) => (
            <span
              key={starter}
              className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-2.5 py-1 text-[11px] text-muted-foreground"
            >
              <Sparkles className="size-2.5 shrink-0 text-[var(--color-primary)]" />
              <span className="max-w-[180px] truncate">{starter}</span>
            </span>
          ))}
        </div>
      )}

      {/* Meta tags */}
      <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
        <MetaTag label={providerLabel(item.llmProvider)} />
        {item.namespaceName && (
          <MetaTag icon={<Layers3 className="size-3" />} label={item.namespaceName} />
        )}
        {item.skillCount > 0 && (
          <MetaTag label={`${item.skillCount} skill${item.skillCount === 1 ? "" : "s"}`} />
        )}
      </div>
    </Link>
  );
}

function MetaTag({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

export function WorkspacesClient({ items }: { items: WorkspaceItem[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.description ?? "", item.slug].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [items, search]);

  return (
    <div className="portal-page">
      <div className="portal-page-heading flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Select an agent workspace to start a conversation.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workspaces..."
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <WorkspaceCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center">
          <Bot className="size-10 text-muted-foreground/40" />
          <p className="mt-3 font-semibold text-[var(--color-text-secondary)]">
            {items.length === 0 ? "No workspaces available" : "No workspaces found"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length === 0
              ? "Ask your administrator to assign you to a workspace."
              : "Try a different search term."}
          </p>
        </div>
      )}
    </div>
  );
}
