# Security Policy

## Runtime model

`mcp-hub` is a local-first CLI application. The supported deployment model is loopback-only access on:

- `127.0.0.1`
- `localhost`
- `::1`

Binding the web server to a non-local interface is intentionally blocked in the public package because MCP `stdio` integrations can launch local processes and must not be exposed to other devices on the network.

## Sensitive data

- LLM credentials and sensitive MCP configuration such as auth headers and environment variables are stored in browser `sessionStorage`
- OAuth client/session data for remote MCP auth is also stored only in browser `sessionStorage`
- Existing legacy local credentials are migrated into `sessionStorage` and removed from `localStorage`
- Session-scoped credentials are normally cleared when the browser session ends, subject to browser restore/session behavior
- Chat history and non-sensitive UI preferences may persist in browser `localStorage` for usability

## Persistence boundaries

- Sensitive provider credentials are intended to be session-scoped
- Session-scoped MCP configuration is normally cleared when the browser session ends, subject to browser behavior
- OAuth access tokens, refresh tokens, and client registration data follow the same session-scoped boundary
- Non-sensitive UX state may persist longer for convenience
- The project does not send stored credentials to any backend operated by the maintainer

## Safe usage guidance

- Only connect to MCP servers you trust
- Treat MCP `stdio` commands as equivalent to running local programs on your machine
- Do not attempt to bypass the loopback-only restriction in the public CLI
- Do not proxy this app to untrusted networks without adding your own authentication and isolation layer
