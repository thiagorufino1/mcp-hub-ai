export type ToolStatus = "running" | "success" | "error";

export type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type ToolEvent = {
  id: string;
  requestId?: string;
  tool: string;
  title: string;
  reason: string;
  status: ToolStatus;
  createdAt: string;
  summary?: string;
  serverName?: string;
  argsText?: string;
  detailKind?: "tool" | "context" | "assistant" | "system" | "user" | "error";
};

export type Message = {
  id: string;
  requestId?: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status?: "streaming" | "complete" | "stopped" | "error";
  feedback?: "up" | "down";
  usage?: TokenUsage;
};

export type ChatStreamEvent =
  | { type: "message_start"; id: string; requestId?: string }
  | { type: "message_delta"; id: string; requestId?: string; delta: string }
  | {
      type: "tool_start";
      id: string;
      requestId?: string;
      tool: string;
      title: string;
      reason: string;
      argsText?: string;
    }
  | {
      type: "tool_end";
      id: string;
      requestId?: string;
      status: Exclude<ToolStatus, "running">;
      summary: string;
    }
  | {
      type: "trace";
      id: string;
      requestId?: string;
      kind: "system" | "user" | "assistant";
      content: string;
    }
  | { type: "message_end"; id: string; requestId?: string; usage?: TokenUsage }
  | { type: "error"; message: string };

export type ExternalStreamPayload = Record<string, unknown>;
