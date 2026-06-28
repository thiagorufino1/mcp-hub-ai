# MCP Hub

[![npm version](https://img.shields.io/npm/v/@thiagorufino/mcp-hub?color=blue)](https://www.npmjs.com/package/@thiagorufino/mcp-hub)
[![npm downloads](https://img.shields.io/npm/dm/@thiagorufino/mcp-hub?color=blue)](https://www.npmjs.com/package/@thiagorufino/mcp-hub)

**MCP Hub** is a local web UI for testing LLMs and MCP servers. Connect providers, inspect tool calls, and run multi-turn chats in one place.

![MCP Hub chat interface](docs/mcp-hub.png)

---

## Architecture Overview

```
┌──────────────────────────────────────────────┐
│                  Browser UI                  │
│        (Next.js App Router + shadcn/ui)      │
└─────────────────────┬────────────────────────┘
                      │
┌─────────────────────▼────────────────────────┐
│           Next.js Server (local)             │
│                                              │
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │    AI Routes     │  │    MCP Routes    │  │
│  │  Vercel AI SDK   │  │  @mcp/sdk client │  │
│  └────────┬─────────┘  └────────┬─────────┘  │
└───────────┼─────────────────────┼────────────┘
            │                     │
┌───────────▼────────┐  ┌─────────▼────────────┐
│   LLM Providers    │  │     MCP Servers      │
│   (10 providers)   │  │  stdio / SSE / HTTP  │
└────────────────────┘  └──────────────────────┘
```

MCP Hub consists of two components that work together:

**MCP Hub Server**: A Next.js standalone server that runs locally via `npx`. It acts as the bridge between the browser and external services, spawning MCP stdio processes, connecting to remote MCP servers over SSE or Streamable HTTP, and forwarding LLM requests to the configured provider.

**MCP Hub Client**: A React-based web UI served by the local server. It provides the interface for configuring providers, managing MCP connections, inspecting tool schemas, and running multi-turn chats with live tool call traces.

All traffic stays on `localhost` except direct calls to the LLM providers you configure.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
  - [LLM Providers](#llm-providers)
  - [MCP Servers](#mcp-servers)
  - [Chat](#chat)
- [MCP Proxy - Connect Claude Desktop](#mcp-proxy--connect-claude-desktop)
- [Stack](#stack)
- [Security](#security)
- [Limitations](#limitations)
- [Links](#links)

---

## Quick Start

```bash
npx @thiagorufino/mcp-hub
```

Starts on `http://127.0.0.1:3000` by default and opens the browser automatically. If the port is already taken, the CLI picks the next free local port.

To update to the latest version:

```bash
npx @thiagorufino/mcp-hub@latest
```

```bash
# Custom port
npx @thiagorufino/mcp-hub --port 4010

# Bind explicitly to localhost without auto-opening the browser
npx @thiagorufino/mcp-hub --host localhost --port 3000 --no-open

# IPv6 loopback is also allowed
npx @thiagorufino/mcp-hub --host ::1

# Show all options
npx @thiagorufino/mcp-hub --help
```

**Requires Node.js 20+**

The public CLI refuses non-local host binding. Allowed hosts: `127.0.0.1`, `localhost`, `::1`.

---

## Features

### LLM Providers

Configure any of the 10 supported providers directly in the UI:

| Provider | Supported |
|---|:---:|
| Anthropic | ✅ |
| AWS Bedrock | ✅ |
| DeepSeek | ✅ |
| Google Gemini | ✅ |
| Groq | ✅ |
| Microsoft Foundry | ✅ |
| Mistral AI | ✅ |
| Ollama | ✅ |
| OpenAI | ✅ |
| xAI | ✅ |

### MCP Servers

Connect to MCP servers over all three transports:

| Transport | Description |
|---|---|
| **stdio** | Local process spawned by the app |
| **SSE** | Remote server-sent events endpoint |
| **Streamable HTTP** | Modern MCP transport |

Inspect tools, schemas, and execute calls directly from the sidebar.

- Remote MCP auth support: custom headers or OAuth 2.0 when the server requires it
- OAuth discovery follows MCP protected-resource metadata and authorization-server metadata
- Discovery fallback supports root metadata, path-based metadata such as `/mcp`, and `WWW-Authenticate` hints

- Automatic health revalidation: MCP status updates when a server goes offline or comes back
- Per-server recovery logic: one failing MCP does not block others from being revalidated
- Manual retest controls: force validation whenever you want from the sidebar

### Chat

- Streaming responses with live token display
- Multi-turn conversation history
- System Prompt support
- Token usage tracking: input, output, and total tokens per message and accumulated per session
- Tool activity trace: see every MCP tool call and result in real time
- Chart rendering: ask for charts, get interactive visualizations inline
- Audio input support
- MCP-aware chat requests: fresh validated MCP snapshot before exposing tools to the model

---

## MCP Proxy - Connect Claude Desktop

MCP Hub exposes a Streamable HTTP MCP endpoint at `/api/mcp/proxy` that aggregates all your configured servers into a single connection. Claude Desktop and other MCP clients can connect to it without any manual token setup.

### OAuth 2.1 (recommended)

The hub implements a full OAuth 2.1 Authorization Server with Dynamic Client Registration (DCR). Clients that support MCP OAuth discovery (Claude Desktop, VS Code extension) authenticate automatically:

1. Client hits `/api/mcp/proxy` → receives `401` with `WWW-Authenticate` pointing to well-known metadata
2. Client discovers the AS at `/.well-known/oauth-authorization-server`
3. Client registers itself via DCR at `/api/oauth/register` (no manual setup)
4. Browser opens the hub's approval page - user approves once
5. Client stores tokens and renews them automatically

**Claude Desktop config** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcp-hub": {
      "url": "http://localhost:3000/api/mcp/proxy",
      "type": "http"
    }
  }
}
```

For a specific published namespace:

```json
{
  "mcpServers": {
    "github-tools": {
      "url": "http://localhost:3000/api/mcp/namespaces/github",
      "type": "http"
    }
  }
}
```

No token required. The OAuth flow runs once per client, then renews silently.

### Import example

Use this JSON in the Admin import dialog to seed common stdio, HTTP, Bearer token, OAuth, and SSE servers:

```json
{
  "mcpServers": {
    "Everything MCP Server": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-everything"
      ]
    },
    "Microsoft Learn": {
      "url": "https://learn.microsoft.com/api/mcp",
      "type": "http"
    },
    "http-example-token": {
      "url": "https://localhost:8000/mcp",
      "type": "http",
      "headers": {
        "Authorization": "Bearer your-token"
      }
    },
    "http-example-oauth": {
      "url": "https://localhost:8000/mcp",
      "type": "http",
      "authType": "oauth_delegated"
    },
    "http-example-sse": {
      "url": "https://localhost:8000/mcp",
      "type": "sse"
    }
  }
}
```

### Personal Access Tokens (legacy)

Tokens created in the UI still work as Bearer tokens and will continue to do so during a deprecation window. Pass them via `Authorization: Bearer <token>` or configure them directly in the MCP client.

### OAuth endpoints

| Endpoint | Purpose |
|---|---|
| `GET /.well-known/oauth-authorization-server` | AS metadata (RFC 8414) |
| `GET /.well-known/oauth-protected-resource` | Resource metadata (RFC 9728) |
| `POST /api/oauth/register` | Dynamic Client Registration (RFC 7591) |
| `GET /api/oauth/authorize` | Authorization endpoint (PKCE S256 mandatory) |
| `POST /api/oauth/token` | Token exchange and refresh rotation |
| `POST /api/oauth/revoke` | Token revocation (RFC 7009) |

### Scopes

| Scope | Access |
|---|---|
| `mcp:proxy` | All tools via the proxy endpoint |
| `mcp:namespace:{alias}` | Tools in a specific published namespace |

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, standalone output) |
| AI | Vercel AI SDK 6, unified streaming across all providers |
| MCP | @modelcontextprotocol/sdk |
| UI | Tailwind CSS 4 + Radix UI + shadcn/ui |
| Icons | @lobehub/icons, official AI provider brand icons |

---

## Security

Runs locally on loopback interfaces only. Credentials are sent only to providers you configure and never stored in any remote backend.

- LLM credentials and MCP auth headers/env stored only in browser `sessionStorage`
- OAuth state, tokens, and related MCP auth config stay in browser session storage too
- Closing the tab clears all sensitive config
- Chat history and non-sensitive UI preferences may persist locally
- MCP `stdio` servers are spawned as child processes, so only connect to servers you trust
- CLI refuses non-local host binding by design

See [SECURITY.md](./SECURITY.md) for the full security model.

---

## Limitations

- CLI app distributed via npm, not a library API
- First launch downloads the standalone Next.js bundle, which may take a moment
- Provider credentials are session-scoped, so you must re-enter them in new browser sessions
- Remote MCP OAuth config is also session-scoped, so re-auth may be needed after session end
- Remote multi-user deployment is out of scope
- OAuth 2.1 Personal Token deprecation window: legacy tokens remain valid for 90 days, then OAuth 2.1 only

---

## Executar com Docker

### Pré-requisitos

- Docker e Docker Compose instalados
- Credenciais Azure AD/Entra ID configuradas

### Configuração

```bash
cp .env.example .env
# Edite .env com suas variáveis reais
```

Gere os valores obrigatórios:

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# MCP_HUB_ENCRYPTION_KEY
openssl rand -hex 32
```

### Subir o ambiente

```bash
docker compose up --build
```

O app estará disponível em http://localhost:3000.

As migrações do banco de dados são aplicadas automaticamente na inicialização.

### Parar

```bash
docker compose down
```

### Resetar banco de dados

```bash
docker compose down -v
docker compose up --build
```

---

## Links

- GitHub: https://github.com/thiagorufino1/mcp-hub
- Issues: https://github.com/thiagorufino1/mcp-hub/issues
- npm: https://www.npmjs.com/package/@thiagorufino/mcp-hub

## License

Apache License 2.0. See [LICENSE](./LICENSE).
