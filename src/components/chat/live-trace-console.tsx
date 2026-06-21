import { Activity, X, Terminal, CheckCircle2, XCircle, Loader2, Sparkles, MessageSquare, Trash2 } from "@/components/ui/icons";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";
import type { ToolEvent } from "@/types/chat";

type Props = {
  events: ToolEvent[];
  onClose: () => void;
  onClear?: () => void;
};

function formatJsonIfValid(str: string | undefined): string {
  if (!str) return "";
  try {
    const obj = JSON.parse(str);
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(str);
  }
}

export function LiveTraceConsole({ events, onClose, onClear }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para os eventos
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [events]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[22px] border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Header */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 transition-all">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
            <Activity className="size-3.5" />
          </div>
          <h2 className="text-[13px] font-semibold tracking-wide text-slate-200">
            Live Trace Console
          </h2>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 ring-1 ring-inset ring-slate-700/50">
            {events.length} req
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-full text-slate-400 hover:bg-red-500/10 hover:text-red-400"
            onClick={onClear}
            title="Limpar Monitor"
          >
            <Trash2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            onClick={onClose}
            title="Fechar Monitor"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 app-scroll" 
        style={{ scrollbarGutter: "stable" }}
      >
        {events.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Terminal className="mb-3 size-10 text-slate-800" />
            <p className="text-[12px] font-mono text-slate-500">
              Aguardando interceptação<br />de ferramentas...
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 font-mono text-[11.5px] leading-relaxed">
            {events.map((evt) => {
              const time = formatTime(evt.createdAt);
              const isError = evt.status === "error";
              const isRunning = evt.status === "running";
              const isSuccess = evt.status === "success";
              const isAssistant = evt.detailKind === "assistant";
              const isUser = evt.detailKind === "user";

              return (
                <div key={evt.id} className="flex flex-col gap-2">
                  {/* Log Header */}
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 text-slate-500">[{time}]</span>
                    <span
                      className={cn(
                        "mt-[3px] shrink-0",
                        isError && "text-red-400",
                        isSuccess && !isAssistant && !isUser && "text-emerald-400",
                        isRunning && "text-amber-400 animate-pulse",
                        isAssistant && "text-sky-400",
                        isUser && "text-indigo-400"
                      )}
                    >
                      {isError ? (
                        <XCircle className="size-3.5" />
                      ) : isAssistant ? (
                        <Sparkles className="size-3.5" />
                      ) : isUser ? (
                        <MessageSquare className="size-3.5" />
                      ) : isSuccess ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : (
                        <Loader2 className="size-3.5 animate-spin" />
                      )}
                    </span>
                    <span className={cn(
                      "break-all font-semibold",
                      isAssistant && "text-sky-400",
                      isUser && "text-indigo-400",
                      !isAssistant && !isUser && "text-sky-400"
                    )}>
                      {isAssistant ? "ASSISTANT /response" : isUser ? "USER /input" : `POST /${evt.tool}`}
                    </span>
                  </div>

                  {/* Log Payload (Args) */}
                  {evt.argsText && (
                    <div className="ml-5 overflow-hidden rounded-md bg-slate-900/60 ring-1 ring-inset ring-slate-800">
                      <div className="border-b border-slate-800/60 bg-slate-900/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Request Payload
                      </div>
                      <div className="overflow-x-auto p-2.5 text-emerald-300 app-scroll">
                        <pre className="whitespace-pre-wrap break-words">{formatJsonIfValid(evt.argsText)}</pre>
                      </div>
                    </div>
                  )}

                  {/* Log Response (Summary or Content) */}
                  {evt.summary && (
                    <div className={cn(
                      "ml-5 overflow-hidden rounded-md bg-slate-900/60 ring-1 ring-inset",
                      isAssistant ? "ring-sky-500/20" : isUser ? "ring-indigo-500/20" : "ring-slate-800"
                    )}>
                      <div className={cn(
                        "border-b px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest",
                        isAssistant ? "border-sky-500/20 bg-sky-500/5 text-sky-400/70" : 
                        isUser ? "border-indigo-500/20 bg-indigo-500/5 text-indigo-400/70" : 
                        "border-slate-800/60 bg-slate-900/80 text-slate-500"
                      )}>
                        {isAssistant ? "Assistant Completion" : isUser ? "User Message" : "Response Data"}
                      </div>
                      <div className={cn(
                        "overflow-x-auto p-2.5 app-scroll", 
                        isError ? "text-red-300" : 
                        isAssistant ? "text-sky-100/90" :
                        isUser ? "text-indigo-200/90" :
                        "text-sky-200"
                      )}>
                        <pre className="whitespace-pre-wrap break-words max-h-[600px] overflow-y-auto app-scroll">
                          {isAssistant || isUser ? evt.summary : formatJsonIfValid(evt.summary)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
