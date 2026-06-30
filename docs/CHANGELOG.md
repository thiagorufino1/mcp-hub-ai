# Changelog

## 2026-06-28 a 2026-06-30

36 commits — vulnerabilidades corrigidas, novas features, refactors e limpeza de dead code.

---

### Vulnerabilidades Corrigidas

#### CodeQL / GitHub Security Scanning

- **[HIGH] Clear-text storage of sensitive data** (`storage.ts`) — `apiKey`, `secretKey` e `accessKeyId` eram armazenados em claro no `sessionStorage`. Corrigido: credenciais são excluídas antes de persistir; validação na restauração impede uso de config incompleta.
- **[HIGH] Incomplete multi-character sanitization** (`route.ts`) — regex lazy `<!--[\s\S]*?-->` podia ser bypassada com comentários aninhados. Corrigido: loop `do...while` que repete até a string estabilizar.

#### Security Hardening — 23 fixes (`259ef6b`)

**Autenticação & Autorização**
- `/api/feedback` estava completamente público (sem auth) — guard adicionado.
- `/api/llm/test` sem restrição de papel — restrito a admins.
- Query de namespaces em "My Connections" sem filtro `published:true` — usuário podia ver namespaces não publicados.
- Middleware global retornando 401 para requisições não autenticadas à API.

**OAuth & Tokens**
- PKCE: `code_verifier` era verificado APÓS marcar o auth code como usado — janela de replay attack. Corrigido com transaction atômica.
- `/api/oauth/revoke` sem validação de `client_id` (viola RFC 7009) — adicionado.
- Validação de `redirect_uri` usava string comparison — bypass possível com variantes de `localhost`. Corrigido com URL parser.
- `PersonalToken` sem `expiresAt` obrigatório — token nunca expirava. Corrigido: campo obrigatório + check no resolve.

**MCP & Tool Security**
- Fallback `body.llmConfig` client-side era vetor SSRF — removido.
- Tools não filtravam por `NamespaceTool.enabled` — tools desabilitadas ainda executavam.
- Nomes de tools no proxy sem prefixo — colisão entre servidores. Corrigido com esquema `ServerName.toolName`.
- MCP import criava env em plaintext enquanto create encriptava — alinhado com criptografia.

**Proteção de Dados**
- Props de RSC incluíam env/headers decriptados — agora envia apenas nomes das chaves.
- Update de MCP com campo em branco sobrescrevia secrets com vazio — valor preservado.
- Args sensíveis visíveis no SSE stream e em resumos de tool — redactados.
- Unicode normalization + remoção de zero-width chars em `sanitizePromptValue`.

#### Fixes Pontuais de Segurança e Integridade de Dados

- Export de MCP Server não redactava valores de headers (`e821225`).
- Audit log: `Date.now()` em queries de 24h causava inconsistência de timezone vs banco — substituído por `SQL CURRENT_TIMESTAMP` (`3a55545`).
- Import: `resourceId` incorreto no audit log, cast de `mcpServers` sem guard, erro `P2002` não tratado (`682fa5b`).
- Export filtrava flag `__mcpHubEncrypted` mas não os valores associados (`9f448d5`).

#### Auth Microsoft Entra ID

- `OAuthAccountNotLinked` em users com registro em `User` sem `Account` vinculado — adicionado `allowDangerousEmailAccountLinking: true`. Seguro para single-provider corporativo: Microsoft controla e verifica emails do tenant, sem vetor de account linking exploit.

---

### Features

**MCP Servers**
- Export e import de servidores em JSON com secrets redactados (`affbee4`).
- Dialog dedicado de import com schema Zod e resolução automática de transport (`e9bc3fa`).
- Nome único de MCP Server: constraint no banco + validação frontend + backend (`861b6d4`).
- Stats cards na listagem: servidores ativos, total de tools, execuções, P95 de latência (`e24d6b6`).
- Badge de auth OAuth e sync desabilitado para servidores OAuth delegados (`ef3ba58`).
- Campo description movido para seção principal do formulário (`1df264a`).
- Toolbar: botões Export/Import/Add com ícones, alinhados à direita do campo de busca (`56bda08`, `5e3d05c`, `41600b2`).

**Dashboard**
- Top tools, latência P95 e execuções por origem (`b1e0c25`).
- Métrica de latência trocada de média para P95 (`4de26f3`).
- Grid 3 colunas para as novas seções (`9f448d5`).

**Namespaces**
- Stats cards na listagem (`26e0bf2`).
- Botão de delete com confirmation dialog (`7515d0e`).
- Tabela com ações de edit/delete inline (`e9bc3fa`).

**Audit Log**
- Badges de contagem das últimas 24h por tab (`ef27486`).

**Connections**
- Dialog de confirmação antes de desconectar (`a2fb274`).
- Botões localizados em PT-BR: Conectar / Desvincular (`989c8b3`).
- Rota de inspect com HMAC state (`a2fb274`).

**Chat / System Prompt**
- System prompt carregado de `config/system-prompt.md` — editável sem redeploy (`a2fb274`).
- `userName` passado ao contexto do chat para personalização por primeiro nome (`a2fb274`).

**Personal Tokens**
- Tabela com status badge (verde/amarelo/vermelho) e dias restantes até expiração (`259ef6b`).

---

### Refactors & Dead Code Removal

- `-414 linhas`, `-1 dependência` (`react-circle-flags`): removidos componentes UI não usados (`card`, `scroll-area`, `dropdown-menu`); `hashToken` deduplicado; `mcp-authorization.ts`, `mcp-tool-name.ts` e `oauth-connection.ts` inlined nos call sites (`9f22124`).
- Removidos `conversation-starters.tsx`, `live-trace-console.tsx`, `topbar.tsx`, `llm-setup-shell.tsx`, `client-storage.ts`, `mcp-tool-name.ts`, campos `approvalMode` e `approvedToolNames` — dead code confirmado (`f52a768`).
- Removidos `requireAdminApi()`, `separator.tsx` e `middleware.ts` (conflito com `proxy.ts` no Next.js 16) (`15ba1af`).
- `chart-shared.tsx` extraído — utilities de chart duplicados consolidados em um único módulo (`a2fb274`).
- `hmac-state.ts` extraído de `corporate-oauth-state.ts` (`a2fb274`).

---

### Infra & Docs

- `.dockerignore` expandido: cobre `.env`, `node_modules`, `.git`, caches, docs, testes e scripts (`3fff674`, `7bd09e7`).
- `.gitignore`: pattern para overrides locais de config (`config/*.local.md`, `config/*.local.json`) (`3fff674`).
- Docker Compose: instruções de setup adicionadas ao README (`abbe2d3`).
- README reescrito em PT-BR com stack e arquitetura precisas (`6996177`).
- Documentação obsoleta removida: audit report, roadmap, assets de imagem (`6dcd52c`).
