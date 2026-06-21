"use client";

import { Mic, Square, Trash2 } from "@/components/ui/icons";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useAppPreferences } from "@/components/providers/app-preferences-provider";

type RecorderStatus = "idle" | "recording" | "processing" | "ready" | "error";

type Props = {
  disabled?: boolean;
  onTranscriptReady: (value: string) => Promise<void> | void;
};

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }
}

function getVoiceSupport() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const hasMicrophoneAccess = Boolean(navigator.mediaDevices?.getUserMedia);
  const hasSpeechRecognition = Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);

  return hasMicrophoneAccess && hasSpeechRecognition;
}

function subscribeVoiceSupport(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("focus", onStoreChange);
  return () => window.removeEventListener("focus", onStoreChange);
}

export function AudioRecorder({ disabled = false, onTranscriptReady }: Props) {
  const { locale, t } = useAppPreferences();
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const isSupported = useSyncExternalStore(subscribeVoiceSupport, getVoiceSupport, () => false);
  const transcriptRef = useRef("");
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  useEffect(() => {
    if (status !== "recording") {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [status]);

  async function startRecording() {
    if (disabled) {
      return;
    }

    setError(null);
    transcriptRef.current = "";

    const SpeechRecognitionImpl = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      setStatus("error");
      setError(t("audio.unavailable"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recognition = new SpeechRecognitionImpl();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = locale;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();
        transcriptRef.current = transcript;
      };
      recognition.onerror = () => {
        setError(t("audio.autoFailed"));
      };
      recognition.start();
      recognitionRef.current = recognition;

      setSeconds(0);
      setStatus("recording");
    } catch {
      setStatus("error");
      setError(t("audio.permissionDenied"));
    }
  }

  function stopRecording() {
    setStatus("processing");
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    recognitionRef.current?.stop();

    window.setTimeout(async () => {
      const transcript = transcriptRef.current.trim();
      if (!transcript) {
        setStatus("error");
        setError(t("audio.noTranscript"));
        return;
      }

      await onTranscriptReady(transcript);
      setStatus("ready");
      window.setTimeout(() => {
        setStatus("idle");
        setSeconds(0);
      }, 900);
    }, 900);
  }

  function resetRecording() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    recognitionRef.current?.stop();
    transcriptRef.current = "";
    setStatus("idle");
    setSeconds(0);
    setError(null);
  }

  return (
    <div className="flex items-center gap-2">
      {status === "recording" ? (
        <>
          <div
            aria-live="polite"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-error-soft)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-error)]"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--color-error)]" />
            {seconds}s
          </div>

          <button
            aria-label={t("audio.stopRecording")}
            className="inline-flex size-8 items-center justify-center rounded-full text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none"
            style={{ background: "var(--gradient-action)" }}
            onClick={stopRecording}
            type="button"
          >
            <Square className="size-3 fill-current" />
          </button>

          <button
            aria-label={t("audio.discardRecording")}
            className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground/50 transition hover:text-destructive focus-visible:outline-none"
            onClick={resetRecording}
            type="button"
          >
            <Trash2 className="size-3.5" />
          </button>
        </>
      ) : status === "error" ? (
        <button
          aria-label={error ?? t("audio.retry")}
          className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--color-error)]/18 bg-[var(--color-error-soft)]/60 text-[var(--color-error)] transition hover:bg-[var(--color-error-soft)] focus-visible:outline-none"
          onClick={resetRecording}
          title={error ?? t("audio.retry")}
          type="button"
        >
          <Mic className="size-3.5" />
        </button>
      ) : (
        <button
          aria-label={isSupported ? t("audio.startRecording") : t("audio.unsupported")}
          className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-muted-foreground transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled || status === "processing" || !isSupported}
          onClick={startRecording}
          title={isSupported ? t("audio.speakToTranscribe") : t("audio.unsupported")}
          type="button"
        >
          {status === "processing" ? (
            <span className="size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          ) : (
            <Mic className="size-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
