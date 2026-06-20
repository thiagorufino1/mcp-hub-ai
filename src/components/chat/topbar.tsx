"use client";

import { IconBrandGithub } from "@tabler/icons-react";
import { CircleFlag } from "react-circle-flags";
import { useState } from "react";

import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Boxes, Check, Copy, MessageSquarePlus, MoonStar, RefreshCw, Settings, Sun } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/chat/actions";

type Props = {
  onNewConversation?: () => void;
  onToggleSidebar?: () => void;
  onCopySession?: () => Promise<void>;
};

export function Topbar({
  onNewConversation,
  onToggleSidebar,
  onCopySession,
}: Props) {
  const [copiedSession, setCopiedSession] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const { locale, setLocale, t } = useAppPreferences();
  const { theme, setTheme } = useTheme();

  function handleReset() {
    if (!resetPending) {
      setResetPending(true);
      window.setTimeout(() => setResetPending(false), 3000);
      return;
    }
    sessionStorage.clear();
    localStorage.clear();
    window.location.reload();
  }

  async function handleCopy() {
    if (!onCopySession) return;
    await onCopySession();
    setCopiedSession(true);
    window.setTimeout(() => setCopiedSession(false), 2000);
  }

  const cieloHeaderBackground = "var(--gradient-action)";

  return (
    <header
      className="shadow-[inset_0_-1px_0_rgba(255,255,255,0.12)]"
      style={{
        background: cieloHeaderBackground,
      }}
    >
      <div className={cn("mx-auto flex h-[52px] w-full max-w-[1500px] items-center justify-between gap-4 px-3 sm:px-4 lg:px-5 xl:px-6 transition-all duration-300")}>
        <TooltipProvider delayDuration={120}>
          <div className="flex min-w-0 items-center">
            <div className="flex items-center gap-2">
              <p className="text-[20px] font-semibold tracking-[-0.05em] text-white sm:text-[22px]" translate="no">
                MCP <span className="text-white/70">Hub</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-0.5 rounded-full bg-white/[0.09] p-1 shadow-[0_8px_18px_rgba(8,24,64,0.10)] backdrop-blur-[4px] sm:flex">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-2.5 text-white/92 shadow-none hover:bg-white/[0.08] hover:text-white"
                onClick={onNewConversation}
              >
                <MessageSquarePlus className="size-[13px]" />
                <span className="text-[12px] font-medium">{t("topbar.newConversation")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-2.5 text-white/92 shadow-none hover:bg-white/[0.08] hover:text-white"
                onClick={() => void handleCopy()}
              >
                {copiedSession ? <Check className="size-[13px]" /> : <Copy className="size-[13px]" />}
                <span className="text-[12px] font-medium">{copiedSession ? t("topbar.sessionCopied") : t("topbar.copySession")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 rounded-full px-2.5 shadow-none",
                  resetPending
                    ? "bg-red-500/20 text-red-200 hover:bg-red-500/30 hover:text-red-100"
                    : "text-white/92 hover:bg-white/[0.08] hover:text-white"
                )}
                onClick={handleReset}
              >
                <RefreshCw className="size-[13px]" />
                <span className="text-[12px] font-medium">
                  {resetPending ? t("topbar.resetConfirm") : t("topbar.reset")}
                </span>
              </Button>

              <a
                href="https://github.com/thiagorufino1/mcp-hub"
                target="_blank"
                rel="noreferrer"
                aria-label={t("topbar.githubLabel")}
                className="inline-flex"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-full px-2.5 text-white/92 shadow-none hover:bg-white/[0.08] hover:text-white"
                >
                  <IconBrandGithub className="size-[13px]" stroke={1.8} />
                  <span className="text-[12px] font-medium">GitHub</span>
                </Button>
              </a>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-2.5 text-white/92 shadow-none hover:bg-white/[0.08] hover:text-white"
              >
                <span className="text-[12px] font-medium">{t("app.version") || "v1.0.0"}</span>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full bg-white/[0.07] text-white shadow-[0_6px_18px_rgba(8,24,64,0.08)] backdrop-blur-[4px] hover:bg-white/[0.12] hover:text-white sm:hidden"
              onClick={onToggleSidebar}
            >
              <Boxes className="size-4" />
            </Button>

            <div className="relative flex items-center rounded-full bg-white/[0.08] p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] backdrop-blur-md">
              <div
                className="absolute size-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-300 ease-in-out"
                style={{
                  transform: theme === "dark" ? "translateX(28px)" : "translateX(0)",
                }}
              />
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center rounded-full transition-colors duration-300",
                  theme !== "dark" ? "text-slate-900" : "text-white/50 hover:text-white"
                )}
                aria-label={t("theme.light")}
              >
                <Sun className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center rounded-full transition-colors duration-300",
                  theme === "dark" ? "text-slate-900" : "text-white/50 hover:text-white"
                )}
                aria-label={t("theme.dark")}
              >
                <MoonStar className="size-3.5" />
              </button>
            </div>

            <div className="relative flex items-center rounded-full bg-white/[0.08] p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] backdrop-blur-md">
              <div
                className="absolute size-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-300 ease-in-out"
                style={{
                  transform: locale === "pt-BR" ? "translateX(28px)" : "translateX(0)",
                }}
              />
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center rounded-full transition-all duration-300",
                  locale === "en" ? "scale-110 opacity-100" : "scale-90 opacity-40 hover:opacity-100"
                )}
                aria-label={t("language.en")}
              >
                <CircleFlag countryCode="us" height="10" className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setLocale("pt-BR")}
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center rounded-full transition-all duration-300",
                  locale === "pt-BR" ? "scale-110 opacity-100" : "scale-90 opacity-40 hover:opacity-100"
                )}
                aria-label={t("language.pt")}
              >
                <CircleFlag countryCode="br" height="10" className="size-5" aria-hidden="true" />
              </button>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://github.com/thiagorufino1/mcp-hub"
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("topbar.githubLabel")}
                  className="inline-flex"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full bg-white/[0.07] text-white/92 shadow-[0_6px_18px_rgba(8,24,64,0.08)] backdrop-blur-[4px] transition-colors hover:bg-white/[0.10] hover:text-white sm:hidden"
                  >
                    <IconBrandGithub className="size-3.5" stroke={1.8} />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="z-[999] border-none bg-slate-950 px-3 py-1.5 text-[11.5px] font-medium text-slate-100 shadow-2xl shadow-black/80"
              >
                GitHub
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={t("topbar.configureLlm")}
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full bg-white/[0.07] text-white/92 shadow-[0_6px_18px_rgba(8,24,64,0.08)] backdrop-blur-[4px] hover:bg-white/[0.10] hover:text-white lg:hidden"
                  onClick={onToggleSidebar}
                >
                  <Settings className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="z-[999] border-none bg-slate-950 px-3 py-1.5 text-[11.5px] font-medium text-slate-100 shadow-2xl shadow-black/80"
              >
                {t("topbar.configureLlm")}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.07] text-white/92 shadow-[0_6px_18px_rgba(8,24,64,0.08)] backdrop-blur-[4px] transition-colors hover:bg-white/[0.10] hover:text-white"
                    aria-label="Sign out"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </button>
                </form>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="z-[999] border-none bg-slate-950 px-3 py-1.5 text-[11.5px] font-medium text-slate-100 shadow-2xl shadow-black/80"
              >
                Sign out
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </header>
  );
}
