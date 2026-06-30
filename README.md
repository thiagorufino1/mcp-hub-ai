# 🧠 MCP Hub

Interface web para gerenciar servidores MCP e testar provedores de LLM. Conecte modelos a ferramentas, inspecione tráfego, publique namespaces e exponha um proxy MCP protegido por OAuth para outros clientes.

## 🏗️ Arquitetura

```text
Interface (Browser)
(Next.js App Router + shadcn/ui)
        |
        v
Servidor Next.js (Node.js)
  |-- Chat  ──────────────────> Provedores LLM (AI SDK v6)
  |-- Rotas MCP ───────────────> Servidores MCP (stdio / SSE / Streamable HTTP)
  |-- Servidor OAuth 2.1
  |-- API Admin + Auditoria
        |
        +--> Provedores LLM
        |    Anthropic, Amazon Bedrock, Azure OpenAI, DeepSeek,
        |    Google Gemini, Groq, Mistral AI, Ollama, OpenAI, xAI
        |
        +--> Servidores MCP
             stdio / SSE / Streamable HTTP
        |
        +--> PostgreSQL (Prisma 6)
```

## 📋 Índice

- [Início Rápido](#-início-rápido)
- [Funcionalidades](#-funcionalidades)
  - [Provedores LLM](#provedores-llm)
  - [Chat](#chat)
  - [Servidores MCP](#servidores-mcp)
  - [Namespaces](#namespaces)
  - [Administração](#administração)
- [Proxy MCP](#-proxy-mcp)
- [Docker](#-docker)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Stack](#-stack)
- [Segurança](#-segurança)

## 🚀 Início Rápido

**Requisitos:** Node.js 20+, PostgreSQL 14+

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp .env.example .env
# Editar .env: mínimo DATABASE_URL, NEXTAUTH_SECRET, AZURE_AD_*

# 3. Executar migrações do banco
npx prisma migrate deploy

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse em `http://localhost:3000`.

**Build de produção:**

```bash
npm run build
npm start
```

## ✨ Funcionalidades

### Provedores LLM

Configure provedores pela interface admin. Credenciais armazenadas criptografadas no banco de dados.

| Provedor | Pacote |
|---|---|
| Anthropic | `@ai-sdk/anthropic` |
| Amazon Bedrock | `@ai-sdk/amazon-bedrock` |
| Azure OpenAI | `@ai-sdk/azure` |
| DeepSeek | `@ai-sdk/deepseek` |
| Google Gemini | `@ai-sdk/google` |
| Groq | `@ai-sdk/groq` |
| Mistral AI | `@ai-sdk/mistral` |
| Ollama | `@ai-sdk/openai` (compat) |
| OpenAI | `@ai-sdk/openai` |
| xAI | `@ai-sdk/xai` |

### Chat

- Respostas em streaming via Vercel AI SDK v6
- Sessões multi-turno persistidas no navegador
- Suporte a system prompt (inline ou carregado de arquivo)
- Inspeção de tool calls com argumentos, resultados e status por chamada
- Renderização de gráficos a partir de blocos ` ```chart ``` ` (Recharts)
- Transcrição de voz em navegadores compatíveis
- Requisições MCP-aware: snapshot de ferramentas atualizado antes de cada execução
- Preferências de personalização por usuário

### Servidores MCP

Conecte servidores MCP pelos três transportes suportados:

| Transporte | Descrição |
|---|---|
| `stdio` | Processo local iniciado pelo servidor |
| `SSE` | Endpoint server-sent events |
| `Streamable HTTP` | Transporte HTTP padrão MCP |

Capacidades adicionais:

- Validação e inspeção de schema antes de conectar
- Monitoramento de saúde com recuperação automática
- Autenticação remota via headers customizados ou OAuth 2.0
- Descoberta de metadados OAuth via endpoints MCP protected-resource e authorization-server
- Importação e exportação de definições de servidores pela interface admin

### Namespaces

Agrupe servidores e ferramentas MCP em conjuntos nomeados e publique como endpoints de proxy separados:

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

Cada namespace tem seu próprio escopo OAuth (`mcp:namespace:{alias}`) e pode ser compartilhado de forma independente.

### Administração

Rotas admin exigem membership no grupo Entra ID configurado em `ADMIN_GROUP_ID`.

- **Dashboard**: cards KPI, gráficos de execução (14 dias), consumo de tokens LLM por modelo, latência P95 por servidor, top tools, top clientes
- **Servidores MCP**: registrar, editar, testar, importar/exportar
- **Namespaces**: criar e publicar conjuntos curados de ferramentas
- **LLM**: configurar e habilitar/desabilitar provedores
- **Grupos**: gerenciar grupos Entra ID para controle de acesso
- **Auditoria**: log completo de ações privilegiadas e execuções de ferramentas

## 🔌 Proxy MCP

O MCP Hub expõe um endpoint Streamable HTTP em `/api/mcp/proxy` que agrega todos os servidores registrados em uma única conexão.

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

### OAuth 2.1

O hub implementa OAuth 2.1 com Dynamic Client Registration. Clientes com suporte a OAuth discovery MCP autenticam sem tratamento manual de tokens.

Fluxo:

1. Cliente requisita `/api/mcp/proxy`
2. Hub retorna `401` com metadados de descoberta OAuth
3. Cliente descobre o authorization server e registra dinamicamente
4. Navegador abre a página de aprovação
5. Tokens são emitidos e renovados automaticamente

Endpoints OAuth:

| Endpoint | Finalidade |
|---|---|
| `GET /.well-known/oauth-authorization-server` | Metadados do authorization server |
| `GET /.well-known/oauth-protected-resource` | Metadados do protected resource |
| `POST /api/oauth/register` | Registro dinâmico de cliente |
| `GET /api/oauth/authorize` | Endpoint de autorização |
| `POST /api/oauth/token` | Troca e renovação de tokens |
| `POST /api/oauth/revoke` | Revogação de tokens |

Escopos:

| Escopo | Acesso |
|---|---|
| `mcp:proxy` | Todas as ferramentas via endpoint proxy |
| `mcp:namespace:{alias}` | Ferramentas de um namespace publicado específico |

## 🐳 Docker

**Pré-requisitos:** Docker + Docker Compose, credenciais Azure AD / Entra ID

```bash
# 1. Configurar
cp .env.example .env
# Preencher .env com valores reais

# Gerar secrets
openssl rand -base64 32   # NEXTAUTH_SECRET
openssl rand -hex 32      # MCP_HUB_ENCRYPTION_KEY

# 2. Iniciar
docker compose up --build
```

Aplicação disponível em `http://localhost:3000`. Dados do Postgres persistidos no volume `postgres_data`. Migrações executadas automaticamente na inicialização.

## ⚙️ Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|:---:|---|
| `DATABASE_URL` | Sim | String de conexão PostgreSQL |
| `NEXTAUTH_SECRET` | Sim | Chave de criptografia de sessão (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Sim | URL pública da aplicação (ex: `http://localhost:3000`) |
| `MCP_HUB_ENCRYPTION_KEY` | Não | Chave para secrets armazenados (usa `NEXTAUTH_SECRET` como fallback) |
| `MCP_TOOL_CACHE_TTL_MS` | Não | TTL do cache do registro de ferramentas em ms (padrão: `300000`) |
| `AZURE_AD_CLIENT_ID` | Sim | Client ID do registro de app no Entra ID |
| `AZURE_AD_CLIENT_SECRET` | Sim | Client secret do registro de app no Entra ID |
| `AZURE_AD_TENANT_ID` | Sim | Tenant ID do Entra ID |
| `ADMIN_GROUP_ID` | Sim | Object ID do grupo Entra que concede acesso admin |

Consulte `.env.example` para referência completa.

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Estilização | Tailwind CSS 4 + Radix UI + shadcn/ui |
| Integração LLM | Vercel AI SDK v6 (`ai`, `@ai-sdk/*`) |
| MCP | `@modelcontextprotocol/sdk` |
| Banco de dados | PostgreSQL 16 + Prisma 6 |
| Autenticação | NextAuth v5 + Azure AD / Entra ID |
| Gráficos | Recharts |
| Validação | Zod v4 |

## 🔒 Segurança

- Autenticação via Entra ID, sem acesso anônimo
- Autorização admin baseada em grupo (`ADMIN_GROUP_ID`)
- Todos os secrets armazenados (chaves LLM, tokens MCP, credenciais OAuth) criptografados em repouso
- OAuth 2.1 com PKCE para clientes do proxy MCP
- Saída de streaming e inspeção de ferramentas sanitizadas na interface
- Log de auditoria completo para ações privilegiadas e execuções de ferramentas
