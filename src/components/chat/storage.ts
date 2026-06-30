"use client";

import type { LLMConfig } from "@/types/llm-config";

export const SESSION_LLM_CONFIG_KEY = "mcp-hub-session-llm-config";

const CREDENTIAL_KEYS = new Set(["apiKey", "secretKey", "accessKeyId"]);

export function readSessionJson<T>(key: string): T | null {
  try {
    const value = window.sessionStorage.getItem(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function writeSessionJson(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function writeLLMConfig(config: LLMConfig): void {
  const safe = Object.fromEntries(
    Object.entries(config as Record<string, unknown>).filter(([k]) => !CREDENTIAL_KEYS.has(k)),
  );
  writeSessionJson(SESSION_LLM_CONFIG_KEY, safe);
}

export function isCompleteLLMConfig(value: unknown): value is LLMConfig {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  if (typeof c.provider !== "string") return false;
  if (c.provider === "ollama") return typeof c.baseUrl === "string" && typeof c.model === "string";
  if (c.provider === "bedrock")
    return typeof c.accessKeyId === "string" && typeof c.secretKey === "string";
  return typeof c.apiKey === "string" && c.apiKey.length > 0;
}

export function removeSessionValue(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}
