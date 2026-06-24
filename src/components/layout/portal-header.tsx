"use client";

import Link from "next/link";
import { CircleFlag } from "react-circle-flags";

import { signOutAction } from "@/app/chat/actions";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { MoonStar, Sun } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function PortalHeader({ isAdmin, section, userName, userImage }: {
  isAdmin: boolean;
  section?: string;
  userName?: string | null;
  userImage?: string | null;
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

            <form action={signOutAction}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="submit" className="group flex items-center gap-2.5 rounded-full bg-white/[0.08] px-2 py-1 text-white/70 transition-colors duration-150 hover:bg-white/[0.14] hover:text-white">
                    {userImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={userImage} alt={userName || "User"} className="size-6 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.15] text-[11px] font-semibold text-white">
                        {(userName || "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="hidden text-[12px] font-medium lg:block">{(userName || "User").split(" ")[0]}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 transition-opacity group-hover:opacity-80">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 text-white">Sign out</TooltipContent>
              </Tooltip>
            </form>
          </div>
        </TooltipProvider>
      </div>
    </header>
  );
}


