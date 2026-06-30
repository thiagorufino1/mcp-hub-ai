"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ChatNavigation, type ChatSession } from "@/components/chat/chat-navigation";
import { ChatThread } from "@/components/chat/chat-thread";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { MessageComposer } from "@/components/chat/message-composer";
import { SidebarDrawer } from "@/components/chat/sidebar-drawer";
import { PortalHeader } from "@/components/layout/portal-header";
import { SESSION_LLM_CONFIG_KEY, readSessionJson } from "./storage";
import { parseStreamChunks } from "@/lib/chat-stream";
import type { ChatStreamEvent, Message, ToolEvent } from "@/types/chat";
import type { LLMConfig } from "@/types/llm-config";

const MESSAGE_STORAGE_KEY = "ai-chat-messages";
const TOOL_EVENT_STORAGE_KEY = "ai-chat-tool-events";
const STORAGE_VERSION_KEY = "ai-chat-ui-version";
const STORAGE_BACKUP_PREFIX = "ai-chat-storage-backup";
const STORAGE_VERSION = "2026-03-30-ui-refresh-5";
const SESSIONS_INDEX_KEY = "ai-chat-sessions-v1";
const ACTIVE_SESSION_ID_KEY = "ai-chat-active-session-id";
const SESSION_DATA_PREFIX = "ai-chat-session-data-";

type ThreadItem =
  | { id: string; type: "message"; value: Message }
  | { id: string; type: "tool"; value: ToolEvent };

function chatGreeting(userName: string | null): string {
  const hour = new Date().getHours();
  const [emoji, period] =
    hour >= 5 && hour < 12 ? ["🌅", "Bom dia"] :
    hour < 18 ? ["🌞", "Boa tarde"] :
    ["🌙", "Boa noite"];
  const first = userName ? `, ${userName.split(" ")[0]}` : "";
  return `${emoji} ${period}${first}`;
}

function buildInitialAssistantMessage(content: string): Message {
  return {
    id: "assistant-welcome",
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    status: "complete",
  };
}

function normalizeStoredMessage(message: Partial<Message>): Message | null {
  if (!message.id || !message.role || !message.createdAt) {
    return null;
  }

  return {
    content: message.content ?? "",
    createdAt: message.createdAt,
    feedback: message.feedback,
    id: message.id,
    requestId: message.requestId,
    role: message.role,
    status: message.status ?? "complete",
    usage: message.usage,
  };
}

function normalizeStoredToolEvent(event: Partial<ToolEvent>): ToolEvent | null {
  if (!event.id || !event.tool || !event.title || !event.reason || !event.createdAt || !event.status) {
    return null;
  }

  return {
    createdAt: event.createdAt,
    detailKind: event.detailKind ?? "tool",
    id: event.id,
    reason: event.reason,
    requestId: event.requestId,
    serverName: event.serverName,
    status: event.status,
    summary: event.summary,
    title: event.title,
    tool: event.tool,
    argsText: event.argsText,
  };
}

export function ChatShell({
  isAdmin = false,
  userName,
  userImage,
}: {
  isAdmin?: boolean;
  userName?: string | null;
  userImage?: string | null;
}) {
  const { locale, t } = useAppPreferences();
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const initialAssistantMessage = useMemo(
    () => buildInitialAssistantMessage(t("chat.welcome")),
    [t],
  );
  const [messages, setMessages] = useState<Message[]>(() => [buildInitialAssistantMessage(t("chat.welcome"))]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  const [allowedModels, setAllowedModels] = useState<string[]>([]);
  const [hasCorporateLlm, setHasCorporateLlm] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [scrollRequest, setScrollRequest] = useState(0);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const currentAssistantIdRef = useRef<string | null>(null);
  const currentRequestIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
      if (storedVersion !== STORAGE_VERSION) {
        const storedMessagesSnapshot = localStorage.getItem(MESSAGE_STORAGE_KEY);
        const storedToolsSnapshot = localStorage.getItem(TOOL_EVENT_STORAGE_KEY);
        if (storedMessagesSnapshot || storedToolsSnapshot) {
          const backupKey = `${STORAGE_BACKUP_PREFIX}-${Date.now()}`;
          localStorage.setItem(
            backupKey,
            JSON.stringify({
              messages: storedMessagesSnapshot ? JSON.parse(storedMessagesSnapshot) : [],
              toolEvents: storedToolsSnapshot ? JSON.parse(storedToolsSnapshot) : [],
              previousVersion: storedVersion,
            }),
          );
          setStorageNotice(t("chat.storageReset"));
        }
        localStorage.removeItem(MESSAGE_STORAGE_KEY);
        localStorage.removeItem(TOOL_EVENT_STORAGE_KEY);
        localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
      }

      try {
        const storedMessages = localStorage.getItem(MESSAGE_STORAGE_KEY);
        if (storedMessages) {
          const parsed = JSON.parse(storedMessages) as Array<Partial<Message>>;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed.map(normalizeStoredMessage).filter(Boolean) as Message[]);
          }
        }
      } catch {
        // Ignore corrupted messages.
      }

      try {
        const storedToolEvents = localStorage.getItem(TOOL_EVENT_STORAGE_KEY);
        if (storedToolEvents) {
          const parsed = JSON.parse(storedToolEvents) as Array<Partial<ToolEvent>>;
          if (Array.isArray(parsed)) {
            setToolEvents(parsed.map(normalizeStoredToolEvent).filter(Boolean) as ToolEvent[]);
          }
        }
      } catch {
        // Ignore corrupted tool events.
      }

    } catch {
      // Ignore corrupted local state.
    }

    // Sessions init
    try {
      const existingActiveId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
      if (existingActiveId) {
        const sessionsJson = localStorage.getItem(SESSIONS_INDEX_KEY);
        const sessionsList: ChatSession[] = sessionsJson ? JSON.parse(sessionsJson) : [];
        setSessions(sessionsList);
        setActiveSessionId(existingActiveId);
      } else {
        // First setup - migrate current messages into a session
        const newId = crypto.randomUUID();
        const storedMsgs = localStorage.getItem(MESSAGE_STORAGE_KEY);
        const storedTools = localStorage.getItem(TOOL_EVENT_STORAGE_KEY);
        const firstUserContent = storedMsgs
          ? (JSON.parse(storedMsgs) as Array<{ role?: string; content?: string }>)
              .find((m) => m.role === "user")?.content ?? ""
          : "";
        const title = firstUserContent
          ? firstUserContent.slice(0, 42) + (firstUserContent.length > 42 ? "…" : "")
          : new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", " às");
        const newSession: ChatSession = { id: newId, title, createdAt: new Date().toISOString() };
        setSessions([newSession]);
        setActiveSessionId(newId);
        localStorage.setItem(
          SESSION_DATA_PREFIX + newId,
          JSON.stringify({ messages: storedMsgs ? JSON.parse(storedMsgs) : [], toolEvents: storedTools ? JSON.parse(storedTools) : [] }),
        );
        localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify([newSession]));
        localStorage.setItem(ACTIVE_SESSION_ID_KEY, newId);
      }
    } catch {
      // ignore - sessions are enhancement, not critical
    }

    setIsHydrated(true);
  }, [t]);

  useEffect(() => {
    try {
      const stored = readSessionJson<LLMConfig>(SESSION_LLM_CONFIG_KEY);
      if (stored) {
        setLlmConfig(stored);
      }
    } catch {
      // Corrupted config - ignore, user will reconfigure.
    }
  }, []);

  useEffect(() => {
    fetch("/api/user/context")
      .then((res) => res.json())
      .then((data: {
        allowedModels: string[];
        hasCorporateLlm: boolean;
      }) => {
        setAllowedModels(data.allowedModels ?? []);
        setHasCorporateLlm(data.hasCorporateLlm ?? false);
        if (data.allowedModels?.length > 0) {
          setSelectedModel(data.allowedModels[0]);
        }
      })
      .catch(() => {
        // Silently ignore - user context is enhancement, not required
      });
  }, []);

  useEffect(() => {
    if (!storageNotice) {
      return;
    }

    setMessages((current) => {
      if (current.some((message) => message.id === "storage-version-notice")) {
        return current;
      }

      return [
        {
          id: "storage-version-notice",
          role: "assistant",
          content: storageNotice,
          createdAt: new Date().toISOString(),
          status: "complete",
        },
        ...current,
      ];
    });
  }, [storageNotice, t]);

  useEffect(() => {
    setMessages((current) => {
      if (current.length !== 1 || current[0]?.id !== "assistant-welcome") {
        return current;
      }

      return [initialAssistantMessage];
    });
  }, [initialAssistantMessage]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Quota exceeded - skip persistence silently.
    }
  }, [messages, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(TOOL_EVENT_STORAGE_KEY, JSON.stringify(toolEvents));
    } catch {
      // Quota exceeded - skip persistence silently.
    }
  }, [isHydrated, toolEvents]);

  const items = useMemo<ThreadItem[]>(() => {
    const renderedToolIds = new Set<string>();
    const grouped: ThreadItem[] = [];
    const sortedMessages = [...messages].sort((a, b) => {
      const aTime = Date.parse(a.createdAt);
      const bTime = Date.parse(b.createdAt);
      if (aTime !== bTime) return aTime - bTime;
      return a.id.localeCompare(b.id);
    });

    for (const message of sortedMessages) {
      if (message.role === "assistant" && message.requestId) {
        const relatedTools = toolEvents
          .filter((tool) =>
            tool.requestId === message.requestId &&
            !renderedToolIds.has(tool.id) &&
            (tool.detailKind === "tool" || tool.detailKind === "context")
          )
          .sort((a, b) => {
            const aTime = Date.parse(a.createdAt);
            const bTime = Date.parse(b.createdAt);
            if (aTime !== bTime) return aTime - bTime;
            return a.id.localeCompare(b.id);
          });

        for (const tool of relatedTools) {
          renderedToolIds.add(tool.id);
          grouped.push({ id: tool.id, type: "tool", value: tool });
        }
      }

      grouped.push({ id: message.id, type: "message", value: message });
    }

    return grouped;
  }, [messages, toolEvents]);

  function persistSessionData(id: string, msgs: Message[], tools: ToolEvent[], sessionList: ChatSession[]) {
    if (!id) return;
    try {
      localStorage.setItem(SESSION_DATA_PREFIX + id, JSON.stringify({ messages: msgs, toolEvents: tools }));
      const firstUser = msgs.find((m) => m.role === "user" && m.id !== "assistant-welcome");
      const title = firstUser?.content
        ? firstUser.content.slice(0, 42) + (firstUser.content.length > 42 ? "…" : "")
        : new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", " às");
      const updated = sessionList.map((s) => (s.id === id ? { ...s, title } : s));
      localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(updated));
      setSessions(updated);
    } catch {
      // quota exceeded - ignore
    }
  }

  function handleStop() {
    abortControllerRef.current?.abort();
    markCurrentAssistantStopped();
  }

  function handleNewConversation() {
    abortControllerRef.current?.abort();
    // Save current session before resetting
    persistSessionData(activeSessionId, messages, toolEvents, sessions);
    // Create fresh session
    const newId = crypto.randomUUID();
    const newSession: ChatSession = { id: newId, title: new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", " às"), createdAt: new Date().toISOString() };
    const nextSessions = [newSession, ...sessions];
    setSessions(nextSessions);
    setActiveSessionId(newId);
    try {
      localStorage.setItem(SESSION_DATA_PREFIX + newId, JSON.stringify({ messages: [], toolEvents: [] }));
      localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(nextSessions));
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, newId);
    } catch {
      // ignore
    }
    setMessages([initialAssistantMessage]);
    setToolEvents([]);
    setScrollRequest((current) => current + 1);
    currentAssistantIdRef.current = null;
    currentRequestIdRef.current = null;
  }

  function handleSessionSwitch(targetId: string) {
    if (targetId === activeSessionId) return;
    persistSessionData(activeSessionId, messages, toolEvents, sessions);
    try {
      const raw = localStorage.getItem(SESSION_DATA_PREFIX + targetId);
      if (raw) {
        const parsed = JSON.parse(raw) as { messages?: Array<Partial<Message>>; toolEvents?: Array<Partial<ToolEvent>> };
        const loadedMsgs = (parsed.messages ?? []).map(normalizeStoredMessage).filter(Boolean) as Message[];
        const loadedTools = (parsed.toolEvents ?? []).map(normalizeStoredToolEvent).filter(Boolean) as ToolEvent[];
        setMessages(loadedMsgs.length > 0 ? loadedMsgs : [initialAssistantMessage]);
        setToolEvents(loadedTools);
      } else {
        setMessages([initialAssistantMessage]);
        setToolEvents([]);
      }
    } catch {
      setMessages([initialAssistantMessage]);
      setToolEvents([]);
    }
    setActiveSessionId(targetId);
    setScrollRequest((current) => current + 1);
    try {
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, targetId);
    } catch {
      // ignore
    }
  }

  function handleSessionDelete(targetId: string) {
    const nextSessions = sessions.filter((s) => s.id !== targetId);
    setSessions(nextSessions);
    try {
      localStorage.removeItem(SESSION_DATA_PREFIX + targetId);
      localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(nextSessions));
    } catch {
      // ignore
    }
    if (targetId === activeSessionId) {
      if (nextSessions.length > 0) {
        handleSessionSwitch(nextSessions[0].id);
      } else {
        handleNewConversation();
      }
    }
  }

  async function handleCopySession() {
    let sessionText = `${t("chat.sessionLogTitle")}\n==============================\n\n`;

    for (const item of items) {
      if (item.type === "message") {
        const role = item.value.role === "assistant" ? t("chat.assistant") : t("chat.you");
        const date = new Date(item.value.createdAt).toLocaleString();
        sessionText += `[${role}] (${date}):\n${item.value.content || t("chat.emptyContent")}\n\n`;
      } else {
        const date = new Date(item.value.createdAt).toLocaleString();
        sessionText += `[TOOL] ${item.value.tool} (${date})\nStatus: ${item.value.status}\n`;
        if (item.value.argsText) {
          sessionText += `${t("chat.argLabel")}\n${item.value.argsText}\n`;
        }
        if (item.value.summary) {
          let summaryToPrint = item.value.summary;
          try {
            summaryToPrint = JSON.stringify(JSON.parse(item.value.summary), null, 2);
          } catch { }
          sessionText += `${t("chat.resultLabel")}\n${summaryToPrint}\n`;
        }
        sessionText += "\n";
      }
    }

    try {
      await navigator.clipboard.writeText(sessionText);
    } catch (err) {
      console.error(t("chat.copySessionError"), err);
    }
  }

  async function handleSubmit(content: string) {
    if (abortControllerRef.current || isStreaming) {
      return false;
    }

    const requestId = `request-${crypto.randomUUID()}`;
    currentRequestIdRef.current = requestId;

    const userMessage: Message = {
      id: `message-${crypto.randomUUID()}`,
      requestId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
      status: "complete",
    };

    const nextMessages = [...messages, userMessage, {
      id: "__pending__",
      requestId,
      role: "assistant" as const,
      content: "",
      createdAt: new Date(Date.now() + 1).toISOString(),
      status: "streaming" as const,
    }];
    setMessages(nextMessages);
    setScrollRequest((current) => current + 1);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        body: JSON.stringify({
          llmConfig: llmConfig ?? undefined,
          locale,
          message: content,
          messages: nextMessages.map((message) => ({
            content: message.content,
            role: message.role,
          })),
          requestId,
          selectedModel: selectedModel ?? undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorText = await response.text();
        applyStreamEvent({
          type: "error",
          message: errorText || `HTTP ${response.status}`,
        });
        return false;
      }

      if (!response.body) {
        applyStreamEvent({
          type: "error",
          message: t("chat.noResponseBody"),
        });
        return false;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseStreamChunks(buffer);
        buffer = parsed.nextBuffer;

        for (const event of parsed.events) {
          applyStreamEvent(event);
        }
      }

      return true;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        markCurrentAssistantStopped();
      } else {
        applyStreamEvent({
          type: "error",
          message:
            error instanceof Error ? error.message : t("chat.streamFailed"),
        });
      }

      return false;
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }

  function applyStreamEvent(event: ChatStreamEvent) {
    switch (event.type) {
      case "message_start":
        currentAssistantIdRef.current = event.id;
        currentRequestIdRef.current = event.requestId ?? currentRequestIdRef.current;
        setScrollRequest((current) => current + 1);
        setMessages((current) => [
          ...current.filter((m) => m.id !== "__pending__"),
          {
            id: event.id,
            requestId: event.requestId,
            role: "assistant",
            content: "",
            createdAt: new Date().toISOString(),
            status: "streaming",
          },
        ]);
        break;
      case "message_delta":
        ensureAssistantMessage(event.id, event.requestId);
        setMessages((current) =>
          current.map((message) =>
            message.id === resolveAssistantId(event.id)
              ? {
                ...message,
                content: `${message.content}${event.delta}`,
                status: "streaming",
              }
              : message,
          ),
        );
        break;
      case "tool_start":
        setScrollRequest((current) => current + 1);
        setToolEvents((current) => [
          ...current,
          {
            id: event.id,
            requestId: event.requestId ?? currentRequestIdRef.current ?? undefined,
            tool: event.tool,
            title: event.title,
            reason: event.reason,
            argsText: event.argsText,
            detailKind: event.title.toLowerCase().includes("contexto") ? "context" : "tool",
            status: "running",
            createdAt: new Date().toISOString(),
          },
        ]);
        break;
      case "tool_end":
        setToolEvents((current) =>
          current.map((tool) =>
            tool.id === event.id
              ? {
                ...tool,
                requestId: event.requestId ?? tool.requestId,
                status: event.status,
                summary: event.summary,
              }
              : tool,
          ),
        );
        break;
      case "message_end":
        currentAssistantIdRef.current = null;
        currentRequestIdRef.current = null;
        setScrollRequest((current) => current + 1);
        setMessages((current) =>
          current.map((message) =>
            message.id === resolveAssistantId(event.id)
              ? {
                ...message,
                status: message.status === "stopped" ? "stopped" : "complete",
                usage: event.usage ?? message.usage,
              }
              : message,
          ),
        );
        break;
      case "trace":
        setToolEvents((current) => [
          ...current,
          {
            id: event.id,
            requestId: event.requestId ?? currentRequestIdRef.current ?? undefined,
            tool: event.kind === "assistant" ? "ASSISTANT_RESPONSE" : event.kind === "system" ? "SYSTEM_PROMPT" : "USER_PROMPT",
            title: event.kind === "assistant" ? "Assistant Completion" : event.kind === "system" ? "System Prompt" : "User Input Context",
            reason: event.kind === "assistant" ? "Final LLM Output" : event.kind === "system" ? "System Prompt Configuration" : "Frontend Request Payload",
            status: "success",
            createdAt: new Date().toISOString(),
            summary: event.content,
            detailKind: event.kind,
          },
        ]);
        break;
      case "error":
        const pendingAssistantId = currentAssistantIdRef.current;
        const errorMessage = `${t("chat.requestFailed")}: ${event.message}`;
        currentAssistantIdRef.current = null;
        currentRequestIdRef.current = null;
        setMessages((current) => {
          if (pendingAssistantId && current.some((message) => message.id === pendingAssistantId)) {
            return current.map((message) =>
              message.id === pendingAssistantId
                ? {
                  ...message,
                  content: message.content.trim() || errorMessage,
                  status: "error",
                }
                : message,
            );
          }

          return [
            ...current.filter((m) => m.id !== "__pending__"),
            {
              id: `error-${crypto.randomUUID()}`,
              role: "assistant",
              content: errorMessage,
              createdAt: new Date().toISOString(),
              status: "error",
            },
          ];
        });
        break;
    }
  }

  async function handleFeedback(messageId: string, value: "up" | "down") {
    const messageContent = messages.find((message) => message.id === messageId)?.content;
    const previousFeedback = messages.find((message) => message.id === messageId)?.feedback;

    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, feedback: value } : message,
      ),
    );

    try {
      const response = await fetch("/api/feedback", {
        body: JSON.stringify({ messageId, feedback: value, content: messageContent }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, feedback: previousFeedback } : message,
        ),
      );
      setFeedbackError(t("chat.feedbackError"));
      window.setTimeout(() => setFeedbackError(null), 4000);
    }
  }

  function ensureAssistantMessage(id: string, requestId?: string) {
    const resolvedId = resolveAssistantId(id);
    currentAssistantIdRef.current = resolvedId;

    setMessages((current) => {
      if (current.some((message) => message.id === resolvedId)) return current;
      return [
        ...current,
        {
          id: resolvedId,
          requestId: requestId ?? currentRequestIdRef.current ?? undefined,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          status: "streaming",
        },
      ];
    });
  }

  function markCurrentAssistantStopped() {
    const assistantId = currentAssistantIdRef.current;
    if (!assistantId) {
      setMessages((current) => current.filter((m) => m.id !== "__pending__"));
      return;
    }

    setMessages((current) =>
      current.map((message) =>
        message.id === assistantId
          ? {
            ...message,
            content:
              message.content.trim() || t("chat.stoppedEmpty"),
            status: "stopped",
          }
          : message,
      ),
    );
  }

  function resolveAssistantId(id: string) {
    if (id === "assistant-current") {
      return currentAssistantIdRef.current ?? `assistant-${crypto.randomUUID()}`;
    }
    return id;
  }


  const tokenTotals = useMemo(
    () =>
      messages.reduce(
        (totals, message) => ({
          inputTokens: (totals.inputTokens ?? 0) + (message.usage?.inputTokens ?? 0),
          outputTokens: (totals.outputTokens ?? 0) + (message.usage?.outputTokens ?? 0),
          totalTokens: (totals.totalTokens ?? 0) + (message.usage?.totalTokens ?? 0),
        }),
        { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      ),
    [messages],
  );
  const tokenUsageState = useMemo(() => {
    const assistantResponses = messages.filter(
      (message) =>
        message.role === "assistant" &&
        message.id !== "assistant-welcome" &&
        message.id !== "storage-version-notice" &&
        message.status !== "streaming",
    );

    if (assistantResponses.length === 0) {
      return "idle" as const;
    }

    return assistantResponses.some(
      (message) =>
        (message.usage?.inputTokens ?? message.usage?.outputTokens ?? message.usage?.totalTokens) != null,
    )
      ? ("available" as const)
      : ("unavailable" as const);
  }, [messages]);
  const llmProps = {
    llmConfig,
    onChangeLlmConfig: setLlmConfig,
    usageTotals: tokenTotals,
    usageState: tokenUsageState,
  };
  const corporateProps = {
    allowedModels,
    hasCorporateLlm,
    selectedModel,
    onModelChange: setSelectedModel,
  };
  return (
    <div className="fixed inset-0 flex flex-col bg-[var(--color-bg)]">
      {/* Same header as admin pages */}
      <PortalHeader isAdmin={isAdmin} userName={userName} userImage={userImage} />

      {/* Same layout container as PortalShell */}
      <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 gap-5 px-4 py-5 lg:px-6">
        {/* Desktop sidebar - hidden on mobile, portal-sidebar handles sticky + sizing */}
        <div className="hidden lg:block">
          <ChatNavigation
            activeSessionId={activeSessionId}
            isAdmin={isAdmin}
            onNewConversation={handleNewConversation}
            onSessionDelete={handleSessionDelete}
            onSessionSwitch={handleSessionSwitch}
            sessions={sessions}
          />
        </div>

        {/* Mobile overlay drawer */}
        <SidebarDrawer
          isOpen={isSidebarOpen}
          {...llmProps}
          {...corporateProps}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Chat content - flex-1 fills remaining height after header */}
        <main
          className="portal-content min-h-0 min-w-0 flex-1 overflow-hidden p-0"
          style={{ minHeight: 0 }}
        >
          <div className="flex h-full flex-col overflow-hidden">
            {feedbackError ? (
              <div role="alert" aria-live="polite"
                className="mx-4 mt-3 rounded-lg border border-[var(--color-error-soft)] bg-[var(--color-error-soft)]/40 px-3 py-2 text-[12px] text-[var(--color-error)]">
                {feedbackError}
              </div>
            ) : null}

            {messages.some((m) => m.role === "user") ? (
              <>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <ChatThread
                    isStreaming={isStreaming}
                    items={items.filter((i) => !(i.type === "message" && i.value.id === "assistant-welcome"))}
                    onFeedback={handleFeedback}
                    scrollRequest={scrollRequest}
                  />
                </div>
                <div className="shrink-0 px-3 pb-4 pt-2 sm:px-5">
                  <MessageComposer
                    isSubmitting={isStreaming}
                    onStop={handleStop}
                    onSubmit={handleSubmit}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8">
                <div className="w-full max-w-[680px] space-y-8">
                  <div className="space-y-2 text-center">
                    <h1 className="text-[2rem] font-semibold tracking-tight text-[var(--color-text-secondary)]">
                      {chatGreeting(userName ?? null)}
                    </h1>
                    <p className="text-[13px] text-[var(--color-text-secondary)]">
                      Como posso ajudá-lo hoje?
                    </p>
                  </div>
                  <MessageComposer
                    isSubmitting={isStreaming}
                    onStop={handleStop}
                    onSubmit={handleSubmit}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
