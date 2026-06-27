"use client";

export const SESSION_LLM_CONFIG_KEY = "mcp-hub-session-llm-config";

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readSessionJson<T>(key: string): T | null {
  try {
    return parseJson<T>(window.sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

export function writeSessionJson(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

export function removeSessionValue(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}
