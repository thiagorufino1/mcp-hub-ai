// src/lib/app-config.ts
export const appConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "mcp-hub",
  appSubtitle:
    process.env.NEXT_PUBLIC_APP_SUBTITLE ??
    "Chat with MCP servers using any LLM provider.",
};
