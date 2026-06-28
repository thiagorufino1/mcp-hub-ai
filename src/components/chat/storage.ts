"use client";

export const SESSION_LLM_CONFIG_KEY = "mcp-hub-session-llm-config";

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

export function removeSessionValue(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}
