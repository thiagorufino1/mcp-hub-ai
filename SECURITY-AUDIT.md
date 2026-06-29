# Security Audit — mcp-hub-ai

**Data:** 2026-06-28  
**Revisores:** Claude Sonnet 4.6 + code-reviewer subagent  
**Status:** Pendente de correção

---

## Sumário executivo

| Severidade | Qtd |
|------------|-----|
| Crítico    | 4   |
| Alto       | 7   |
| Médio      | 6   |
| Baixo      | 4   |
| **Total**  | **21** |

Princípio violado em múltiplos pontos: **deny by default**. Várias rotas carecem de autenticação, dados sensíveis chegam ao browser e tokens pessoais não expiram.

---

## CRÍTICO

---

### C-1 — Credenciais reais no `.env` versionado

**Arquivo:** `.env`  
**Risco:** Qualquer acesso ao repositório permite forjar sessões NextAuth (NEXTAUTH_SECRET) e autenticar contra o Azure AD com as credenciais da aplicação. Impacto máximo — bypass de autenticação de todos os usuários.

**Detalhes:**
- `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_TENANT_ID` em texto claro
- `NEXTAUTH_SECRET` permite forjar JWTs válidos para qualquer e-mail
- `.env` pode não estar em `.gitignore`

**Plano de correção:**
1. Verificar `git log --all --full-history -- .env` — se commitado, considerar todas as credenciais comprometidas
2. Rotacionar `AZURE_AD_CLIENT_SECRET` no Azure Portal
3. Regenerar `NEXTAUTH_SECRET`: `openssl rand -base64 32`
4. Garantir `.env` em `.gitignore` e nunca usar `.env` para segredos em produção
5. Usar `.env.local` localmente e variáveis de ambiente da plataforma em produção

---

### C-2 — `POST /api/oauth/register` sem autenticação

**Arquivo:** `src/app/api/oauth/register/route.ts` (arquivo inteiro)  
**Risco:** Qualquer ator anônimo registra um OAuth client com `redirect_uri` arbitrário. Permite phishing: atacante registra `redirect_uris: ["https://attacker.com"]`, envia link de autorização a usuário legítimo e rouba o authorization code.

**Detalhes:**
- Nenhuma chamada `auth()` antes de `createOAuthClient(...)`
- `redirect_uris` aceita qualquer string sem validação de scheme ou host
- Sem rate limiting

**Plano de correção:**
1. Adicionar check de admin no topo: `const session = await auth(); if (!session?.user?.isAdmin) return Response.json({ error: "Forbidden" }, { status: 403 })`
2. Se registro público for necessário (RFC 7591), implementar: signed registration token, rate limiting por IP, allowlist de redirect_uri origins
3. Validar scheme de `redirect_uris` (apenas `https://` ou `http://localhost` para dev)

---

### C-3 — `POST /api/oauth/revoke` sem autenticação — qualquer um revoga token de qualquer usuário

**Arquivo:** `src/app/api/oauth/revoke/route.ts` (arquivo inteiro)  
**Risco:** DoS de sessões. Atacante que obtiver ou adivinhar um token `mcp_at_...` pode revogar tokens de todos os usuários ativos. RFC 7009 §2.1 exige validação do `client_id`.

**Detalhes:**
- `revokeToken(token)` chamado sem verificar quem faz o pedido
- Nenhum `client_id` validado contra o token no banco
- Sem rate limiting

**Plano de correção:**
1. Extrair `client_id` do body e verificar que ele corresponde ao `clientId` do token no banco antes de revogar
2. Adicionar rate limiting por IP
3. Alternativamente: exigir Bearer auth (o caller apresenta seu próprio token válido)

---

### C-4 — Rate limiting e concorrência em Map em memória (bypass em multi-instância)

**Arquivo:** `src/lib/mcp-governance.ts` linhas 34–35  
**Risco:** Em qualquer deploy com mais de um processo Node.js (Vercel, Docker replicas, PM2), cada instância tem contador independente. Usuário faz N requests para N instâncias e bypassa `maxConcurrentCalls` e `rateLimitRequests` completamente.

**Detalhes:**
```ts
const activeCalls = new Map<string, number>(); // por instância, não distribuído
const rateWindows = new Map<string, ...>();
```

**Plano de correção:**
1. **Curto prazo:** Documentar limitação explicitamente — aplicação deve rodar como instância única
2. **Longo prazo:** Substituir Maps por Redis (Upstash funciona em serverless): `INCR rateKey` + `EXPIRE` para rate limit; `INCR`/`DECR` com TTL para concorrência

---

## ALTO

---

### A-1 — SSRF via `llmConfig` client-side no chat

**Arquivo:** `src/app/api/chat/route.ts` linha 99; `src/lib/ai-provider.ts` linha 43  
**Risco:** Usuário autenticado sem LLM corporativo configurado pode enviar `body.llmConfig` com `baseUrl: "http://169.254.169.254"` (IMDS AWS), `http://127.0.0.1`, ou hosts internos. O backend fará a request em nome do servidor.

**Detalhes:**
```ts
// chat/route.ts linha 99 — fallback para config do cliente
const resolvedLlmConfig = corporateContext.llmConfig ?? (body.llmConfig ?? null);

// ai-provider.ts — sem validação de URL
const ollama = createOpenAI({ baseURL: `${config.baseUrl.replace(/\/$/, "")}/v1` });
```

**Plano de correção:**
1. Remover fallback `body.llmConfig` do chat — se não há LLM corporativo, retornar mock/erro
2. Se config do cliente for mantida, implementar allowlist de provedores e hosts
3. Bloquear IPs privados/link-local antes de qualquer request LLM
4. Mover `/api/llm/test` para rota admin-only (já listado em A-2)
5. Adicionar audit log para toda chamada LLM com config do cliente

---

### A-2 — `/api/llm/test` aceita API key arbitrária de qualquer usuário autenticado

**Arquivo:** `src/app/api/llm/test/route.ts` linha 33  
**Risco:** Qualquer usuário autenticado (não só admin) pode usar o endpoint como validador de API keys roubadas ou proxy para LLM providers arbitrários.

**Plano de correção:**
1. Adicionar no topo: `if (!session.user.isAdmin) return Response.json({ error: "Forbidden" }, { status: 403 })`
2. Validar que `llmConfig` passado corresponde a uma configuração existente no banco, não config arbitrária do body

---

### A-3 — Import de MCP salva `env` sem criptografar

**Arquivo:** `src/app/admin/mcp/actions.ts` linhas 386–400  
**Risco:** `createMcp` criptografa `env` com `encryptSecretJson`. `importMcpServers` salva `env` como JSON plaintext. API keys e senhas de MCP servers importados ficam expostos no banco.

**Detalhes:**
```ts
// importMcpServers — plaintext
env: entry.env ?? {}

// createMcp — correto
env: encryptSecretJson(JSON.parse(envRaw))
```

**Plano de correção:**
1. Em `importMcpServers`, aplicar `encryptSecretJson(entry.env ?? {})` para o campo `env`
2. Aplicar igualmente para `headers` se necessário
3. Migrar registros existentes importados (script de migração pontual)

---

### A-4 — `env`/`headers` descriptografados enviados como props RSC ao browser (admin)

**Arquivo:** `src/app/admin/mcp/page.tsx` linhas 62–65; `src/app/admin/mcp/[id]/page.tsx` linha 70  
**Risco:** API keys, tokens e senhas dos MCP servers são descriptografados no servidor e serializados no payload RSC, ficando visíveis no Network tab do browser para qualquer admin.

**Plano de correção:**
1. Na listagem admin, enviar apenas nomes das chaves: `envKeys: Object.keys(decryptSecretJson(mcp.env))`
2. Na edição, buscar valores descriptografados via Server Action separada quando o dialog abre
3. No save: se campo vier vazio, preservar valor existente no banco (não sobrescrever com vazio)

---

### A-5 — chat/proxy ignoram `NamespaceTool.enabled` — LLM recebe tools não autorizadas

**Arquivo:** `src/lib/user-context.ts` linha 25; `src/app/api/chat/route.ts` linha 520; `src/app/api/mcp/proxy/route.ts` linha 104  
**Risco:** `getUserContext` retorna MCP servers via namespace mas não filtra `NamespaceTool.enabled`. A LLM recebe tools que foram desabilitadas naquele namespace.

**Detalhes:**
- Namespace pode ter tool X habilitada no server mas `NamespaceTool.enabled=false` para aquele namespace
- `buildExecutableTools` usa todos os `server.tools` sem verificar o filtro por namespace

**Plano de correção:**
1. Criar helper `resolveAuthorizedToolsForUser(userId, entraGroups)` que retorna tools com filtro completo: namespace enabled, server enabled, `NamespaceTool.enabled`, `permissionMode !== "blocked"`
2. Aplicar helper em: `chat/route.ts`, `proxy/route.ts`, `mcp-governance.ts`
3. Validar permissão no momento da execução, não só na listagem

---

### A-6 — `oauth_delegated` bypassa registry/permissionMode — tools novas executam automaticamente

**Arquivo:** `src/lib/mcp-governance.ts` linhas 160–168  
**Risco:** Servers com `authType === "oauth_delegated"` têm `toolAllowed: true` forçado sem checar registry ou `permissionMode`. Novas tools adicionadas ao servidor remoto executam sem aprovação.

**Detalhes:**
```ts
const isDelegated = server.authType === "oauth_delegated";
return {
  toolAllowed: server.enabled && (isDelegated || Boolean(tool?.enabled)),
  // isDelegated força true — sem check de permissionMode
};
```

**Plano de correção:**
1. Para `oauth_delegated`, verificar `permissionMode` no registry se existir entrada
2. Implementar `deny-by-default` para oauth_delegated: tools novas ficam bloqueadas até aprovação explícita
3. Ou: adicionar opção de configuração por server (`autoApproveNewTools: boolean`)

---

### A-7 — PersonalToken sem scope, expiração ou revogação

**Arquivo:** `prisma/schema.prisma` linhas 188–196; `src/app/settings/actions.ts` linha 27; `src/lib/token-auth.ts` linha 40  
**Risco:** Token válido = acesso permanente e irrestrito a todos os MCPs do usuário. Sem como limitar escopo, sem expiração automática, sem campo `revokedAt`.

**Detalhes:**
```prisma
model PersonalToken {
  id         String    @id
  userId     String
  tokenHash  String    @unique
  lastUsedAt DateTime?
  createdAt  DateTime  @default(now())
  // FALTAM: scope, expiresAt, revokedAt
}
```

**Plano de correção:**
1. Adicionar campos ao schema: `scope String? @default("mcp:proxy")`, `expiresAt DateTime?`, `revokedAt DateTime?`
2. Gerar migration Prisma
3. Em `resolveTokenUser`, verificar `revokedAt IS NULL` e `expiresAt > NOW()`
4. UI: permitir escolher escopo e prazo ao criar token
5. Política para tokens legados: aceitar com aviso ou exigir renovação

---

## MÉDIO

---

### M-1 — Sem Next.js middleware global — proteção por rota é frágil

**Arquivo:** `src/middleware.ts` (não existe)  
**Risco:** Toda rota protegida depende de `requireAuth()` individual. Rota nova sem o guard é silenciosamente pública.

**Plano de correção:**
1. Criar `src/middleware.ts` com `auth()` para todos os paths: `/admin/*`, `/settings/*`, `/connections/*`, `/chat/*`
2. Excluir: `/api/auth/*`, `/api/oauth/*`, `/api/mcp/proxy`, `/api/mcp/namespaces/*` (têm Bearer auth próprio)
3. Retornar 401 para API routes não autenticadas, redirect para `/` para page routes

---

### M-2 — `/api/feedback` sem autenticação

**Arquivo:** `src/app/api/feedback/route.ts`  
**Risco:** Endpoint público. Se armazenamento for adicionado, vira vetor de spam/injeção.

**Plano de correção:**
1. Adicionar `const session = await auth(); if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })`

---

### M-3 — `oauth_delegated` proxy sem validação de scheme/host no register

**Arquivo:** `src/app/api/oauth/register/route.ts` linhas 30–38  
**Risco:** `redirect_uris` aceita qualquer string. Sem validação de scheme ou host, `redirect_uris: ["javascript:alert(1)"]` ou `["http://internal-service"]` são aceitos.

**Plano de correção:**
1. Validar que cada URI tem scheme `https://` (ou `http://localhost` para dev)
2. Bloquear IPs privados e link-local em `redirect_uris`
3. Bloquear schemes não-HTTP (`javascript:`, `data:`, etc.)

---

### M-4 — Tokens NextAuth (`Account.access_token`) em plaintext no banco

**Arquivo:** `prisma/schema.prisma` linhas 34–49  
**Risco:** Se banco for comprometido, access_token e refresh_token do Azure AD de todos os usuários expostos em plaintext.

**Plano de correção:**
1. Implementar Prisma middleware que criptografa/descriptografa campos sensíveis do model `Account`
2. Usar mesmas funções `encryptSecret`/`decryptSecret` já existentes
3. Script de migração para criptografar registros existentes

---

### M-5 — Redaction insuficiente: args expostos em SSE sem sanitização

**Arquivo:** `src/app/api/chat/route.ts` linhas 368–378; `src/lib/mcp-governance.ts` linha 331  
**Risco:** `sanitizeArguments` redacta no audit log, mas `argsText` vai cru no SSE stream (`reason: "Args: ${argsText}"`). Se args contiverem tokens ou senhas, vão ao browser.

**Plano de correção:**
1. Aplicar `sanitizeArguments` antes de emitir no SSE, não só antes de salvar no banco
2. Extrair função comum `redactSensitiveFields` usada em SSE + audit + log

---

### M-6 — `.env` pode ser empacotado em `npm publish` + dependency circular

**Arquivo:** `package.json` linhas 22–25; `Dockerfile` linha 13  
**Risco:** `.next/standalone` inclui `.env`. Sem `.dockerignore`. Self-dependency `@thiagorufino/mcp-hub` cria dependency circular.

**Plano de correção:**
1. Criar `.dockerignore` com: `.env`, `.env.local`, `.env.*.local`
2. Adicionar script `prepack` que aborta se `.env` presente no bundle: `node scripts/check-pack.mjs`
3. Remover `@thiagorufino/mcp-hub` de `dependencies` (self-reference)
4. Adicionar `!.next/standalone/.env` em `.npmignore` ou repensar o que vai em `files`

---

## BAIXO

---

### L-1 — Proxy não checa `permissionMode: "blocked"` para tools habilitadas

**Arquivo:** `src/app/api/mcp/proxy/route.ts` linha 160; `src/lib/mcp-tool-registry.ts` linhas 151–160  
**Risco:** Tool com `enabled: true` mas `permissionMode: "blocked"` é executada pelo proxy. O namespace path filtra corretamente, somente o proxy está afetado.

**Plano de correção:**
1. Em `isRegisteredToolEnabled`, adicionar check: `return Boolean(record?.enabled && record.permissionMode !== "blocked")`

---

### L-2 — Export vaza nomes das chaves de `env`/`headers`

**Arquivo:** `src/app/admin/mcp/actions.ts` linhas 300–333  
**Risco:** Export mostra `{ "OPENAI_API_KEY": "[REDACTED]" }` — revela arquitetura de autenticação.

**Plano de correção:**
1. Opção A: exportar apenas count de chaves: `_env_keys_count: Object.keys(env).length`
2. Opção B: exportar nomes mas documentar export como confidencial
3. Opção C: manter comportamento atual (low risk, apenas informativo)

---

### L-3 — `requireAdmin` faz redirect 302 em vez de 403 para chamadas de API

**Arquivo:** `src/lib/auth-helpers.ts` linha 18  
**Risco:** Server Actions chamadas programaticamente recebem redirect como "sucesso" (não `!response.ok`). Mascaramento do erro, não escalada de privilégio.

**Plano de correção:**
1. Criar variante `requireAdminApi()` que retorna `Response.json({ error: "Forbidden" }, { status: 403 })` para uso em route handlers
2. Manter `requireAdmin()` com redirect para uso em RSC pages

---

### L-4 — Prompt injection via metadados de MCP servers

**Arquivo:** `src/app/api/chat/route.ts` linhas 542–566  
**Risco:** Admin mal-intencionado ou comprometido pode craftar nome/descrição de MCP server com payload de prompt injection usando Unicode ou zero-width chars que `sanitizePromptValue` não remove.

**Plano de correção:**
1. Adicionar normalização Unicode (NFD/NFC) antes de `sanitizePromptValue`
2. Remover zero-width chars: `​`, `‌`, `‍`, `﻿`, `‮` (RTLO)
3. Considerar allowlist de chars em vez de blocklist

---

## Decisões de arquitetura necessárias

| # | Decisão | Opções |
|---|---------|--------|
| D-1 | Rate limiting distribuído | (a) Redis/Upstash — requer nova infra; (b) Instância única documentada — sem mudança |
| D-2 | OAuth register público vs admin-only | (a) Admin-only simples; (b) RFC 7591 público com signed token + allowlist |
| D-3 | Secrets admin edit — como enviar valores ao form | (a) Server Action separada ao abrir dialog (mais seguro); (b) Placeholder + re-entrada obrigatória; (c) Aceitar props RSC para admins (atual) |
| D-4 | Criptografar tokens NextAuth no banco | Requer custom Prisma adapter ou middleware — trabalho não trivial |
| D-5 | PersonalToken legados sem scope/expiração | (a) Aceitar com aviso; (b) Exigir renovação após prazo; (c) Revogar automaticamente |

---

## Ordem de implementação recomendada

### Fase 1 — Crítico (imediato)
1. C-1: Rotacionar credenciais e remover `.env` do repo
2. C-2: Fechar `/api/oauth/register` com guard admin
3. C-3: Validar `client_id` em `/api/oauth/revoke`
4. A-3: Criptografar `env` no import

### Fase 2 — Alto (próxima sprint)
5. A-1 + A-2: Remover SSRF via `llmConfig` client-side; mover `/api/llm/test` para admin-only
6. A-4: Remover secrets das props RSC no admin
7. A-5: Filtrar tools por `NamespaceTool.enabled` em chat e proxy
8. L-1: Adicionar check `permissionMode !== "blocked"` no proxy

### Fase 3 — Médio + infraestrutura
9. M-1: Criar `src/middleware.ts` global
10. A-7: Adicionar scope/expiração/revogação ao PersonalToken (schema migration)
11. M-6: `.dockerignore`, `prepack` check, remover self-dep
12. M-5: Redaction em SSE

### Fase 4 — Decisões de arquitetura
13. D-1: Decidir rate limiting distribuído
14. D-4: Criptografar tokens NextAuth
15. A-6: Política deny-by-default para oauth_delegated

---

## Como validar manualmente (cenários críticos)

```bash
# C-2: OAuth register anônimo
curl -X POST http://localhost:3000/api/oauth/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"test","redirect_uris":["https://attacker.com"]}'
# Esperado DEPOIS da correção: 401 ou 403
# Atual: 201 Created

# C-3: Revogação anônima
curl -X POST http://localhost:3000/api/oauth/revoke \
  -d "token=mcp_at_qualquercoisa"
# Esperado DEPOIS: 401
# Atual: 200 OK

# A-1: SSRF via chat
# Enviar body.llmConfig com provider=ollama, baseUrl=http://127.0.0.1:8080
# Esperado DEPOIS: ignorado, usar config corporativa
# Atual: aceito e executado

# A-2: LLM test não-admin
# Logar como usuário comum, POST /api/llm/test com apiKey arbitrária
# Esperado DEPOIS: 403
# Atual: executa

# L-1: permissionMode blocked no proxy
# Criar tool com enabled=true, permissionMode=blocked
# Chamar via /api/mcp/proxy
# Esperado DEPOIS: bloqueado
# Atual: executa
```

---

## Complemento de validação Codex — itens ainda não contemplados

**Data:** 2026-06-28  
**Escopo:** validação estática complementar sobre o estado atual da árvore local, sem alterações de código.

### Observação sobre o baseline

Durante a validação complementar, o arquivo `.env` foi encontrado apenas como arquivo local ignorado pelo Git (`!! .env`). `git ls-files .env` não retornou o arquivo. Portanto, o item **C-1** deve ser tratado como:

- **confirmado:** existem secrets reais no workspace local;
- **não confirmado:** `.env` versionado/commitado na árvore atual;
- **risco ainda crítico:** vazamento por build, Docker context, `.next/standalone`, pacote npm, logs, backup ou compartilhamento do workspace.

Antes de executar a correção de C-1, validar também:

```bash
git log --all --full-history -- .env
git ls-files .env
git status --ignored --short .env
```

---

### CX-1 — Proxy executa tools por nome global e colisões escolhem o primeiro servidor

**Severidade:** Médio  
**Arquivo:** `src/app/api/mcp/proxy/route.ts` linhas 104-144  

**Risco:** O proxy MCP expõe e executa tools usando apenas `tool.name`. Se dois MCP servers acessíveis tiverem uma tool com o mesmo nome, como `search`, `query` ou `delete`, o `toolIndex` mantém a primeira ocorrência e ignora as demais. Isso pode fazer cliente/LLM chamar uma tool pensando em um servidor e executar em outro.

**Evidência:**

```ts
for (const tool of resolvedServer.tools) {
  if (!toolIndex.has(tool.name)) {
    toolIndex.set(tool.name, { server: serverCandidate, toolName: tool.name });
  }
}
```

**Plano de correção:**
1. Usar nomes estáveis e únicos no proxy, por exemplo `serverAlias_toolName` ou hash estável como o chat já faz.
2. Manter mapeamento exato do nome listado para o servidor e tool original.
3. Rejeitar colisões se o contrato MCP precisar preservar nomes originais.

**Testes necessários:**
1. Dois MCPs acessíveis com `tool.name = "search"`.
2. `tools/list` deve retornar nomes únicos.
3. `tools/call` deve executar o servidor correto para cada nome listado.

---

### CX-2 — Resultados de MCP retornam sem redaction para LLM e clientes

**Severidade:** Médio  
**Arquivos:** `src/app/api/chat/route.ts`, `src/app/api/mcp/proxy/route.ts`, `src/app/api/mcp/namespaces/[alias]/route.ts`, `src/lib/mcp-governance.ts`

**Risco:** O audit log sanitiza argumentos antes de salvar no banco, mas os resultados das tools são repassados para a LLM, para o SSE do browser e para clientes MCP sem redaction por chave ou padrão sensível. Se uma tool retornar `apiKey`, `Authorization`, cookie, connection string, token ou segredo aninhado, esses dados podem ser enviados ao provedor LLM e ao cliente.

**Plano de correção:**
1. Criar função comum de redaction para objetos e texto: `redactSensitiveValue`.
2. Aplicar antes de `buildToolConversationContent`.
3. Aplicar em `tool_end.summary` e em `tool_start.argsText`.
4. Aplicar no retorno do proxy e do namespace endpoint.
5. Manter truncamento, mas não depender só dele.

**Testes necessários:**
1. Tool mock retorna `{ apiKey, Authorization, nested: { secret } }`.
2. Tool mock retorna texto contendo token/API key.
3. Chat, proxy e namespace devem retornar `[REDACTED]`.

---

### CX-3 — `logAudit` é fire-and-forget em mutações críticas

**Severidade:** Médio  
**Arquivo:** `src/lib/audit.ts` linhas 47-68  

**Risco:** `logAudit` retorna `void` e dispara `prisma.auditLog.create` sem `await`. Server Actions administrativas podem concluir, revalidar cache ou redirecionar antes da escrita de auditoria terminar. Em runtime serverless, falha de conexão ou encerramento rápido do processo pode persistir a mutação sem trilha confiável.

**Plano de correção:**
1. Tornar `logAudit` assíncrono.
2. Usar `await logAudit(...)` em mutações críticas.
3. Para operações sensíveis, considerar transaction/outbox para mutação + auditoria.
4. Definir política: falha de audit deve bloquear mutação crítica ou registrar fallback?

**Testes necessários:**
1. Mockar `prisma.auditLog.create` e garantir que action aguarda a resolução.
2. Simular falha de audit em delete/update crítico e validar política esperada.

---

### CX-4 — Delete de namespace na lista não revalida a rota

**Severidade:** Médio  
**Arquivo:** `src/app/admin/namespaces/actions.ts` linhas 182-186  

**Risco:** O delete da lista remove o namespace e registra audit, mas não chama `revalidatePath("/admin/namespaces")`. O client depende de `router.refresh()`, criando semântica diferente do delete na página de detalhe e risco de cache stale.

**Plano de correção:**
1. Consolidar uma action única para delete de namespace.
2. Sempre revalidar `/admin/namespaces`.
3. Na página de detalhe, revalidar e redirecionar após delete.

**Testes necessários:**
1. Teste estático ou integração garantindo `revalidatePath("/admin/namespaces")`.
2. Cobrir delete via lista e via detalhe.

---

### CX-5 — Métricas de audit/admin omitem ações administrativas registradas

**Severidade:** Baixo/Médio  
**Arquivos:** `src/lib/audit.ts`, `src/app/admin/audit/page.tsx`

**Risco:** `AuditAction` inclui ações como `mcp.refresh`, `namespace.create`, `namespace.update`, `namespace.delete` e `group.sync`, mas a métrica `adminLogs24h` usa uma lista manual divergente. O dashboard/audit pode subcontar atividade administrativa real.

**Plano de correção:**
1. Centralizar categorias de audit em constantes compartilhadas.
2. Usar a constante no dashboard e em testes.
3. Preferir categorização por tipo em vez de listas duplicadas.

**Testes necessários:**
1. Garantir que toda `AuditAction` administrativa entra na métrica esperada.
2. Falhar se novas ações administrativas forem adicionadas sem categoria.

---

### CX-6 — Fluxo `My Connections` lista namespaces enabled ainda não publicados

**Severidade:** Médio  
**Arquivo:** `src/app/connections/page.tsx` linhas 20-38  

**Risco:** `getUserContext` e o endpoint publicado exigem `enabled: true` e `published: true`, mas `My Connections` consulta namespaces com `enabled: true` sem exigir `published: true`. Usuário pode visualizar/conectar servidores associados a namespace ainda não publicado, criando divergência entre governança de publicação e superfície de conexão.

**Plano de correção:**
1. Decidir se `published` deve controlar também a visibilidade em `My Connections`.
2. Se sim, adicionar `published: true` na consulta.
3. Se não, documentar explicitamente que `published` controla apenas endpoint externo e não conexão do usuário.

**Testes necessários:**
1. Namespace `enabled=true, published=false` não deve aparecer em `My Connections` se a política for deny-by-default.
2. Namespace publicado deve continuar aparecendo.

---

### CX-7 — PKCE/HMAC não deve ser marcado como totalmente seguro

**Severidade:** Médio  
**Arquivos:** `src/app/api/oauth/authorize/route.ts`, `src/app/oauth/approve/actions.ts`, `src/lib/oauth-server.ts`

**Risco:** Existe HMAC/state e verificação PKCE, mas o `code_challenge` é repassado para `/oauth/approve` fora do `hub_state` assinado. Além disso, `consumeAuthCode` marca o auth code como usado antes de verificar o PKCE. Uma tentativa com verifier incorreto invalida o code legítimo, e manipulação do form pode trocar o challenge antes da emissão do code.

**Plano de correção:**
1. Incluir `code_challenge`, `code_challenge_method` e `original_state` no payload assinado.
2. Alternativamente, persistir uma authorization request server-side.
3. Em `consumeAuthCode`, verificar PKCE antes de marcar `usedAt`, idealmente em transação que preserve replay protection.
4. Validar formato e tamanho do `code_challenge` e `code_verifier`.

**Testes necessários:**
1. Tamper de `code_challenge` na tela de approve deve falhar.
2. Exchange com verifier errado não deve consumir o code legítimo.
3. Replay após exchange bem-sucedido deve continuar falhando.

---

## Ajustes recomendados em itens já existentes

### Ajuste em C-1

Trocar o título de **"Credenciais reais no `.env` versionado"** para **"Credenciais reais em `.env` local com risco de vazamento por empacotamento/build"**, salvo se `git log --all --full-history -- .env` confirmar commit anterior.

### Ajuste em C-3

O endpoint realmente é anônimo, mas a frase **"qualquer um revoga token de qualquer usuário"** deve ser refinada. O atacante precisa possuir o token bruto. O risco correto é: **revogação anônima de token conhecido/roubado, sem validação de client ownership e sem rate limit**.

### Ajuste em M-1

Não existe `middleware.ts`, mas existe `src/proxy.ts`, que atua como proxy/middleware no Next atual. O risco não é ausência total de middleware global; o risco é que `src/proxy.ts` libera `/api/oauth`, `/api/mcp/proxy` e `/api/mcp/namespaces`, então esses handlers precisam ser perfeitamente defensivos.

### Ajuste em L-1/H-1

O proxy chama `isRegisteredToolEnabled` antes de executar. O problema principal não é apenas `permissionMode`, mas a combinação:

1. proxy e chat não respeitam `NamespaceTool.enabled`;
2. `oauth_delegated` pode expor live tools fora do fluxo de registry;
3. colisões de nome no proxy tornam execução ambígua.

### Ajuste em "Já está seguro"

Não marcar como totalmente seguro:

1. **OAuth PKCE + nonce + HMAC**: parcialmente implementado, mas com gap no `code_challenge` e no consumo antes da verificação PKCE.
2. **Tool execution: `approvalMode === "always"` como guarda final**: não é controle de autorização suficiente. A autorização final deve validar usuário, namespace, server, registry/tool, `NamespaceTool.enabled`, `permissionMode`, token scope e server enabled no backend no momento da execução.
3. **IDOR prevenido de forma geral**: correto em `deleteToken` e `disconnect`, mas não deve ser generalizado para todo o sistema enquanto chat/proxy/tools ainda têm gaps de escopo.
