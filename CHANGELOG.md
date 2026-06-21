# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.9] - 2026-05-04

### Added
- OAuth support for remote MCP servers over HTTP transports
- MCP OAuth discovery that follows protected-resource metadata, authorization-server metadata, and path-based discovery variants
- Automatic OAuth token refresh and single-retry handling for expired remote MCP sessions

### Changed
- MCP server dialog now separates custom headers from authentication options
- OAuth-related UI copy now stays language-aware and provider-neutral
- Wide Markdown tables now render with horizontal scrolling instead of breaking the chat layout

### Fixed
- OAuth callback flow now works with popup-based auth handoff
- Local session storage remains the only persistence layer for sensitive browser-side config

## [1.0.8] - 2026-04-27

### Changed
- npm package metadata refined with a clearer description focused on local LLM and MCP server testing
- npm keywords updated to improve package discoverability around MCP, tool calling, and chat UI workflows
- README branding and introductory copy aligned with the published package metadata

---

## [1.0.7] - 2026-04-27

### Changed
- Responsive chat layout refined for desktop scaling scenarios such as Windows 125% / 150% / 175%
- Sidebar width now scales more smoothly across intermediate desktop breakpoints, with better balance between chat width and control panels
- Topbar and main chat container now use aligned width constraints for more consistent desktop composition
- Mobile/tablet settings drawer now uses a stronger overlay and more solid panel background for better readability
- LLM token usage unavailable state now uses a clearer warning-style visual treatment

### Fixed
- Demo-mode fallback responses now respect the selected UI language, including Portuguese (`pt-BR`)

---

## [1.0.6] - 2026-04-23

### Added
- README screenshot preview for the chat interface
- README note for token usage tracking in chat

### Changed
- Topbar now includes a reset action with confirmation to clear local session and UI state

---

## [1.0.5] - 2026-04-23

### Changed
- Default theme changed to light
- System Prompt terminology (previously "Instructions") in PT-BR and EN
- GitHub links corrected across all files
- App version in frontend now reflects npm package version automatically

### Fixed
- npm publish pipeline: OTP error resolved with Automation token
- npm publish: provenance requires public repository (repo made public)

---

## [1.0.0] - 2026-04-22

### Added
- Local web UI for testing LLMs, MCP servers, tools, and chat workflows
- Support for 10 LLM providers: Anthropic, AWS Bedrock, Microsoft Foundry, DeepSeek, Google Gemini, Groq, Mistral, Ollama, OpenAI, xAI
- MCP server connections over stdio, SSE, and Streamable HTTP transports
- Streaming chat with multi-turn history, System Prompt support, and tool activity trace
- Chart rendering via fenced `chart` code blocks
- Audio input support
- i18n support for English and Portuguese (pt-BR)
- `--port` and `--host` CLI flags
- `--help` / `-h` CLI flag
- Automatic browser launch on startup
- Public npm packaging for `@thiagorufino/mcp-hub`
- Package validation scripts for manifest checks, smoke tests, and tarball verification
- Loopback-only host enforcement for the public CLI
- Session-scoped storage for LLM credentials and MCP auth-sensitive configuration
