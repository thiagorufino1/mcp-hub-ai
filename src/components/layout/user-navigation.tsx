"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Bot, Cable, MessageSquare, Settings, Shield } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const items = [
  { href: "/chat", label: "Nova Conversa", icon: MessageSquare },
  { href: "/connections", label: "Minhas Conexões", icon: Cable },
  { href: "/settings", label: "Configurações", icon: Settings },
];

const adminItem = { href: "/admin", label: "Administração", icon: Shield };

export function UserNavigation({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const allItems = [...items, ...(isAdmin ? [adminItem] : [])];
  const current = allItems.find((item) =>
    item.href === "/chat" ? pathname === item.href : pathname.startsWith(item.href),
  ) ?? { label: "MCP Hub", icon: Bot };
  const CurrentIcon = current.icon;

  return (
    <aside className="portal-sidebar">
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
          <CurrentIcon className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)]">MCP Hub</p>
          <p className="text-xs text-muted-foreground">{current.label}</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {items.map((item) => {
          const active = item.href === "/chat"
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("portal-nav-item", active && "portal-nav-item-active")}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {isAdmin && (
        <>
          <div className="mx-3 border-t border-border/50" />
          <nav className="flex flex-col gap-1 p-3">
            <Link
              href="/admin"
              className="portal-nav-item"
            >
              <Shield className="size-4" />
              <span>Administração</span>
            </Link>
          </nav>
        </>
      )}

    </aside>
  );
}
