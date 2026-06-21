"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Activity, Bot, Boxes, Cable, Layers3, Settings, Shield, User } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard", icon: Activity },
  { href: "/admin/mcp", label: "MCP Servers", icon: Cable },
  { href: "/admin/workspaces", label: "Workspaces", icon: Boxes },
  { href: "/admin/llm", label: "LLM Config", icon: Bot },
  { href: "/admin/skills", label: "Skills", icon: Layers3 },
  { href: "/admin/groups", label: "Entra Groups", icon: User },
  { href: "/admin/audit", label: "Audit Log", icon: Shield },
];

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <aside className="portal-sidebar">
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white"><Shield className="size-4" /></span>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)]">Administration</p>
          <p className="text-xs text-muted-foreground">Corporate control center</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {items.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn("portal-nav-item", active && "portal-nav-item-active")}>
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border/70 p-3">
        <Link href="/settings" className="portal-nav-item"><Settings className="size-4" />Personal settings</Link>
      </div>
    </aside>
  );
}
