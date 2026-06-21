# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js)
npm run build        # Build for development/testing
npm run lint         # ESLint (excludes .next, .next-package, .npm-package)
npm run typecheck    # TypeScript check without emit
npm run test         # Run tests (Node.js built-in test runner)

# Package build (for npm publish)
npm run build:package   # Builds with NEXT_DIST_DIR=.next-package then copies standalone
npm run prepare:publish-dir  # Full publish pipeline
```

## Architecture

### Two-layer separation

**Server-side** (`src/app/api/`, `src/lib/mcp-client.ts`, `src/lib/ai-provider.ts`, `src/lib/mcp-oauth.ts`): runs in the Next.js Node.js process. This is where MCP connections are established, stdio child processes are spawned, and LLM requests are forwarded. Credentials never persist here — they arrive per-request from the browser.

**Client-side** (`src/components/`, `src/lib/client-storage.ts`): all state is held in browser `sessionStorage`. Two keys own all mutable state: `mcp-hub-session-llm-config` and `mcp-hub-session-mcp-servers`. Closing the tab wipes everything.

### Chat request flow

`POST /api/chat` → validates body with Zod → calls `resolveLiveMcpServers()` (re-inspects stale/disconnected servers, 12s cache TTL) → builds AI SDK tool definitions wrapping MCP calls → `streamText()` with `stopWhen: stepCountIs(6)` → SSE stream back to browser.

If no `llmConfig` in the request body, returns a mock streaming response (demo mode).

### MCP client (`src/lib/mcp-client.ts`)

Supports three transports: `stdio` (spawns child process), `sse`, `streamable-http`. Every call opens a new connection and closes it after use — no persistent connections. OAuth token refresh happens transparently with one retry on 401.

Tool execution is gated by `mcp-authorization.ts`: `approvalMode` is `always | never | selected`. `never` (default) means zero tools exposed to the LLM.

### Provider abstraction (`src/lib/ai-provider.ts`)

Single `getModel(config: LLMConfig)` function that switches on `config.provider` and returns a Vercel AI SDK `LanguageModel`. Ten providers: openai, azure, google, bedrock, ollama, anthropic, groq, xai, mistral, deepseek. Ollama uses the OpenAI-compatible adapter pointed at the local base URL.

### OAuth for remote MCP (`src/lib/mcp-oauth.ts`, `src/lib/mcp-oauth-browser.ts`)

Discovery follows the MCP protected-resource metadata spec: probes `/.well-known/oauth-protected-resource`, falls back to path-based variants and `WWW-Authenticate` header hints. Uses PKCE + dynamic client registration. Token state lives in browser `sessionStorage` inside the MCP server config object.

OAuth routes: `POST /api/mcp/oauth/start` and `POST /api/mcp/oauth/exchange`. Callback page: `src/app/oauth/callback/page.tsx`.

### CLI entry point (`bin/mcp-portal.mjs`)

Pure Node.js ESM script. Validates host is local-only, finds a free port, spawns `.next/standalone/server.js` as a child process with `PORT` and `HOSTNAME` env vars, then polls until ready and opens the browser.

### Package build

`next.config.ts` sets `output: "standalone"`. The normal `npm run build` outputs to `.next`. The publish build uses `NEXT_DIST_DIR=.next-package` to avoid overwriting the dev build, then `scripts/copy-standalone.mjs` assembles the final package layout. Published package ships only `bin/` and `.next/standalone`.

### Streaming event protocol (`src/types/chat.ts`)

SSE events are typed as `ChatStreamEvent` with discriminated union on `type`: `message_start`, `message_delta`, `message_end`, `tool_start`, `tool_end`, `error`. Tool function names are sanitized and namespaced as `mcp_<serverId>__<toolName>` (truncated to 64 chars).

### Chart rendering

The system prompt instructs the LLM to emit fenced ` ```chart ``` ` blocks with JSON. The `chart-block.tsx` component parses and renders them as interactive inline charts.
