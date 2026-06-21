import type { ChatStreamEvent, ExternalStreamPayload } from "@/types/chat";

export function parseStreamChunks(
  buffer: string,
): { nextBuffer: string; events: ChatStreamEvent[] } {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const events: ChatStreamEvent[] = [];

  if (normalized.includes("\n\n")) {
    const chunks = normalized.split("\n\n");
    const nextBuffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const parsed = parseSseChunk(chunk);
      if (parsed) {
        events.push(...parsed);
      }
    }

    return { nextBuffer, events };
  }

  const lines = normalized.split("\n");
  const nextBuffer = lines.pop() ?? "";

  for (const line of lines) {
    const parsed = parseNdjsonLine(line);
    if (parsed) {
      events.push(...parsed);
    }
  }

  return { nextBuffer, events };
}

function parseSseChunk(chunk: string): ChatStreamEvent[] | null {
  const dataLines = chunk
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);

  if (dataLines.length === 0) {
    return null;
  }

  if (dataLines.length === 1 && dataLines[0] === "[DONE]") {
    return [{ type: "message_end", id: "assistant-current" } satisfies ChatStreamEvent];
  }

  return dataLines.flatMap((line) => normalizeExternalEvent(safeJsonParse(line)));
}

function parseNdjsonLine(line: string): ChatStreamEvent[] | null {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed === "[DONE]") {
    return [{ type: "message_end", id: "assistant-current" } satisfies ChatStreamEvent];
  }

  return normalizeExternalEvent(safeJsonParse(trimmed));
}

function safeJsonParse(value: string): ExternalStreamPayload | null {
  try {
    return JSON.parse(value) as ExternalStreamPayload;
  } catch {
    return null;
  }
}

export function normalizeExternalEvent(
  payload: ExternalStreamPayload | null,
): ChatStreamEvent[] {
  if (!payload) {
    return [];
  }

  if (isCanonicalEvent(payload)) {
    return [payload];
  }

  const type = getString(payload.type) ?? getString(payload.event);

  if (type === "response.output_text.delta") {
    return [
      {
        type: "message_delta",
        id: getString(payload.id) ?? "assistant-current",
        delta: getString(payload.delta) ?? "",
      },
    ];
  }

  if (
    type === "response.completed" ||
    type === "message.completed" ||
    type === "done"
  ) {
    return [
      {
        type: "message_end",
        id: getString(payload.id) ?? "assistant-current",
      },
    ];
  }

  if (type === "thread.message.delta") {
    const delta =
      getString(payload.delta) ??
      getStringFromPath(payload, ["data", "delta"]) ??
      getStringFromPath(payload, ["data", "text"]);

    if (!delta) {
      return [];
    }

    return [
      {
        type: "message_delta",
        id: getString(payload.id) ?? "assistant-current",
        delta,
      },
    ];
  }

  if (type === "tool_start" || type === "tool.started" || type === "response.tool_call.started") {
    return [
      {
        type: "tool_start",
        id: getString(payload.id) ?? crypto.randomUUID(),
        tool: getString(payload.tool) ?? getString(payload.name) ?? "Tool",
        title:
          getString(payload.title) ??
          getString(payload.label) ??
          `Running ${getString(payload.tool) ?? getString(payload.name) ?? "tool"}`,
        reason:
          getString(payload.reason) ??
          getString(payload.description) ??
          "Tool invoked to collect context for the request.",
      },
    ];
  }

  if (type === "tool_end" || type === "tool.completed" || type === "response.tool_call.completed") {
    return [
      {
        type: "tool_end",
        id: getString(payload.id) ?? "tool-current",
        status: getToolStatus(payload),
        summary:
          getString(payload.summary) ??
          getString(payload.result) ??
          "Execução concluída.",
      },
    ];
  }

  if (type === "error") {
    return [
      {
        type: "error",
        message:
          getString(payload.message) ??
          getString(payload.error) ??
          "Erro inesperado no backend.",
      },
    ];
  }
  
  if (type === "trace") {
    return [
      {
        type: "trace",
        id: getString(payload.id) ?? crypto.randomUUID(),
        requestId: getString(payload.requestId),
        kind: (getString(payload.kind) as "system" | "user") ?? "system",
        content: getString(payload.content) ?? "",
      },
    ];
  }

  const text =
    getString(payload.delta) ??
    getString(payload.text) ??
    getString(payload.content) ??
    getStringFromPath(payload, ["message", "content"]);

  if (text) {
    return [
      {
        type: "message_delta",
        id: getString(payload.id) ?? "assistant-current",
        delta: text,
      },
    ];
  }

  return [];
}

function isCanonicalEvent(payload: ExternalStreamPayload): payload is ChatStreamEvent {
  const type = getString(payload.type);
  return Boolean(
    type &&
      ["message_start", "message_delta", "tool_start", "tool_end", "trace", "message_end", "error"].includes(type),
  );
}

function getToolStatus(payload: ExternalStreamPayload): "success" | "error" {
  const status = getString(payload.status);
  return status === "error" || status === "failed" ? "error" : "success";
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getStringFromPath(payload: ExternalStreamPayload, path: string[]) {
  let current: unknown = payload;

  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return getString(current);
}

