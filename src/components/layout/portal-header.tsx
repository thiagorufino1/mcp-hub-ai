"use client";

import Link from "next/link";
import { CircleFlag } from "react-circle-flags";

import { signOutAction } from "@/app/chat/actions";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Boxes, MessageSquare, MoonStar, Settings, Shield, Sun, User } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function PortalHeader({ isAdmin, section, userName }: {
  isAdmin: boolean;
  section?: string;
  userName?: string | null;
}) {
  const { locale, setLocale } = useAppPreferences();
  const { theme, setTheme } = useTheme();

  return (
    <header className="portal-header">
      <div className="mx-auto flex h-[60px] w-full max-w-[1500px] items-center justify-between gap-4 px-4 lg:px-6">
        <Link href="/chat" className="flex min-w-0 items-center gap-3 text-white">
          <span className="text-[21px] font-semibold tracking-[-0.05em]">
            MCP <span className="text-white/70">Hub</span>
          </span>
          {section ? (
            <>
              <span className="h-5 w-px bg-white/25" />
              <span className="truncate text-sm font-medium text-white/78">{section}</span>
            </>
          ) : null}
        </Link>

        <TooltipProvider delayDuration={120}>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-full bg-white/[0.09] p-1 sm:flex">
              <HeaderLink href="/chat" label="Chat" icon={MessageSquare} />
              <HeaderLink href="/connections" label="Connections" icon={Boxes} />
              <HeaderLink href="/settings" label="Settings" icon={Settings} />
              {isAdmin ? <HeaderLink href="/admin" label="Admin" icon={Shield} /> : null}
            </div>

            <div className="relative flex items-center rounded-full bg-white/[0.08] p-1">
              <div className="absolute size-7 rounded-full bg-white shadow-sm transition-transform" style={{ transform: theme === "dark" ? "translateX(28px)" : "translateX(0)" }} />
              <button type="button" onClick={() => setTheme("light")} className={cn("relative flex size-7 items-center justify-center rounded-full", theme !== "dark" ? "text-slate-900" : "text-white/55")} aria-label="Light theme">
                <Sun className="size-3.5" />
              </button>
              <button type="button" onClick={() => setTheme("dark")} className={cn("relative flex size-7 items-center justify-center rounded-full", theme === "dark" ? "text-slate-900" : "text-white/55")} aria-label="Dark theme">
                <MoonStar className="size-3.5" />
              </button>
            </div>

            <div className="relative hidden items-center rounded-full bg-white/[0.08] p-1 md:flex">
              <div className="absolute size-7 rounded-full bg-white shadow-sm transition-transform" style={{ transform: locale === "pt-BR" ? "translateX(28px)" : "translateX(0)" }} />
              <button type="button" onClick={() => setLocale("en")} className="relative flex size-7 items-center justify-center rounded-full" aria-label="English">
                <CircleFlag countryCode="us" height="10" className="size-5" />
              </button>
              <button type="button" onClick={() => setLocale("pt-BR")} className="relative flex size-7 items-center justify-center rounded-full" aria-label="Português">
                <CircleFlag countryCode="br" height="10" className="size-5" />
              </button>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden max-w-40 items-center gap-2 rounded-full bg-white/[0.09] px-3 py-2 text-xs text-white/85 lg:flex">
                  <User className="size-3.5" />
                  <span className="truncate">{userName || "User"}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">{userName || "Authenticated user"}</TooltipContent>
            </Tooltip>

            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm" className="rounded-full bg-white/[0.08] text-white hover:bg-white/[0.14] hover:text-white">
                Sign out
              </Button>
            </form>
          </div>
        </TooltipProvider>
      </div>
    </header>
  );
}

function HeaderLink({ href, icon: Icon, label }: {
  href: string;
  icon: typeof MessageSquare;
  label: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white/88 transition hover:bg-white/[0.1] hover:text-white">
      <Icon className="size-3.5" />
      {label}
    </Link>
  );
}
