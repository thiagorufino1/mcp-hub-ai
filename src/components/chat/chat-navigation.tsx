"use client";

import Link from "next/link";
import {
  Cable,
  MessageSquarePlus,
  Settings,
  Shield,
  Sparkles,
  Trash2,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
};

type Props = {
  isAdmin: boolean;
  sessions: ChatSession[];
  activeSessionId: string;
  onNewConversation: () => void;
  onSessionSwitch: (id: string) => void;
  onSessionDelete: (id: string) => void;
};

// portal-sidebar is sticky top:80px (60px header + 20px py-5 padding).
// This component is used inside the same mx-auto flex max-w-[1500px] gap-5 px-4 py-5 container as admin.
export function ChatNavigation({
  activeSessionId,
  isAdmin,
  onNewConversation,
  onSessionDelete,
  onSessionSwitch,
  sessions,
}: Props) {
  return (
    <aside className="portal-sidebar">
      {/* Header — identical structure to AdminNavigation */}
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
          <Sparkles className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)]" translate="no">
            MCP Hub
          </p>
          <p className="text-xs text-muted-foreground">AI Chat</p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="app-scroll flex flex-1 flex-col overflow-y-auto">
        {/* Primary nav — same <nav> pattern as admin */}
        <nav className="flex flex-col gap-1 p-3">
          <button
            type="button"
            onClick={onNewConversation}
            className="portal-nav-item w-full text-left"
          >
            <MessageSquarePlus className="size-4" />
            <span>Nova Conversa</span>
          </button>

          <Link href="/connections" className="portal-nav-item">
            <Cable className="size-4" />
            <span>My Connections</span>
          </Link>

          <Link href="/settings" className="portal-nav-item">
            <Settings className="size-4" />
            <span>Settings</span>
          </Link>
        </nav>

        {isAdmin && (
          <>
            <div className="mx-3 border-t border-border/50" />
            <nav className="flex flex-col gap-1 p-3">
              <Link href="/admin" className="portal-nav-item">
                <Shield className="size-4" />
                <span>Administration</span>
              </Link>
            </nav>
          </>
        )}

        {/* Sessions */}
        {sessions.length > 0 && (
          <>
            <div className="mx-3 border-t border-border/50" />
            <div className="p-3">
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Sessões
              </p>
              <div className="flex flex-col gap-0.5">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-xl px-3 py-2 transition-colors",
                      session.id === activeSessionId
                        ? "bg-[var(--color-primary-soft)]"
                        : "hover:bg-[var(--color-primary-soft)]/60",
                    )}
                  >
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSessionSwitch(session.id)}>
                      <p className={cn("truncate text-[12px] font-medium leading-snug",
                        session.id === activeSessionId ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]")}>
                        {session.title}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground/50">#{session.id.slice(-8)}</p>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded-full p-1 text-muted-foreground/30 opacity-0 transition-opacity hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] group-hover:opacity-100"
                      onClick={() => onSessionDelete(session.id)}
                      aria-label={`Excluir sessão #${session.id.slice(-8)}`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

    </aside>
  );
}
