# RecomendaÃ§Ãµes de Roadmap - Claude Desktop Melhorado + MetaMCP

## VisÃ£o do produto

Posicionar o projeto como:

> Um workspace corporativo de IA, com experiÃªncia semelhante ao Claude Desktop, mÃºltiplos modelos e um gateway MCP governado.

O diferencial nÃ£o deve ser apenas oferecer mais um chat com MCP, mas combinar:

- ExperiÃªncia de desktop e chat;
- AgregaÃ§Ã£o e roteamento MCP;
- GovernanÃ§a por usuÃ¡rio e grupo;
- Observabilidade e seguranÃ§a;
- CriaÃ§Ã£o de agentes reutilizÃ¡veis.

O MetaMCP Ã© uma referÃªncia forte para infraestrutura, gateway e orquestraÃ§Ã£o. O MCP Hub jÃ¡ possui uma base relevante na camada de experiÃªncia do usuÃ¡rio, chat multimodelo, traces e aprovaÃ§Ã£o de ferramentas.

## Features prioritÃ¡rias

### 1. Workspaces ou Agents

Criar uma entidade central que agrupe:

- Modelo e parÃ¢metros;
- System prompt;
- Skills;
- MCP servers e ferramentas permitidas;
- Base de conhecimento;
- Conversation starters;
- PolÃ­tica de aprovaÃ§Ã£o;
- Grupos ou usuÃ¡rios autorizados.

Exemplos:

- Analista financeiro;
- Suporte;
- DevOps;
- Desenvolvimento.

Isso amplia o conceito tÃ©cnico de namespace do MetaMCP e o transforma em uma experiÃªncia diretamente compreensÃ­vel para o usuÃ¡rio.

### 2. Namespaces MCP

Inspirado no MetaMCP:

- Agrupar vÃ¡rios MCP servers;
- Habilitar ferramentas individualmente;
- Definir aliases para evitar colisÃµes;
- Sobrescrever nome, descriÃ§Ã£o e annotations;
- Associar namespaces a agents e grupos;
- Publicar um namespace como endpoint MCP unificado.

Exemplo:

```text
namespace: engineering
â”œâ”€â”€ GitHub
â”œâ”€â”€ Jira
â”œâ”€â”€ PostgreSQL
â””â”€â”€ Kubernetes
```

O chat deve receber uma visÃ£o governada do namespace, em vez de conhecer e confiar diretamente em configuraÃ§Ãµes individuais de servidores.

### 3. Gateway MCP prÃ³prio

AlÃ©m de consumir MCPs, o projeto deve poder atuar como servidor MCP:

- Streamable HTTP;
- SSE enquanto necessÃ¡rio;
- Endpoint por namespace ou agent;
- AutenticaÃ§Ã£o por API key, OAuth e Entra ID;
- Compatibilidade com Claude Desktop, Cursor e VS Code;
- ExportaÃ§Ã£o de configuraÃ§Ã£o pronta para cada cliente.

As mesmas ferramentas administradas no portal poderiam ser utilizadas dentro e fora do chat.

### 4. Resources e Prompts do protocolo MCP

Expandir o foco atual em tools:

- Descobrir e navegar resources;
- Suportar templates de resources;
- Exibir prompts publicados pelos servidores;
- Oferecer autocomplete de argumentos;
- Inserir resources na conversa;
- Suportar assinatura e atualizaÃ§Ã£o de resources quando disponÃ­vel.

Isso aproxima o produto de uma implementaÃ§Ã£o MCP completa e da experiÃªncia do Claude Desktop.

### 5. Tool registry central

Ao inspecionar um servidor, persistir:

- Schema;
- VersÃ£o ou hash;
- DescriÃ§Ã£o;
- Annotations;
- Status;
- Data da Ãºltima descoberta;
- LatÃªncia mÃ©dia;
- Taxa de erro;
- HistÃ³rico de mudanÃ§as.

Permitir tambÃ©m:

- Alias;
- DescriÃ§Ã£o corrigida;
- Tags;
- ClassificaÃ§Ã£o de sensibilidade: `read`, `write`, `destructive`, `external`;
- Timeout e retries;
- Valores padrÃ£o de input;
- Exemplos de uso.

### 6. AprovaÃ§Ã£o de ferramentas por risco

Evoluir alÃ©m de `always`, `never` e `selected`:

- Aprovar automaticamente tools read-only;
- Aprovar uma vez por sessÃ£o;
- Aprovar apenas uma execuÃ§Ã£o;
- Exigir justificativa do modelo;
- Exibir diff ou preview antes da execuÃ§Ã£o;
- Exigir confirmaÃ§Ã£o adicional para tools destrutivas;
- Bloquear argumentos por polÃ­tica.

Exemplos:

- `list_issues`: automÃ¡tico;
- `create_issue`: exige aprovaÃ§Ã£o;
- `delete_repository`: bloqueado.

Essa pode ser uma das features mais fortes para diferenciar o produto do Claude Desktop.

### 7. Middleware pipeline

Criar uma pipeline configurÃ¡vel visualmente:

```text
request
 â†’ autorizaÃ§Ã£o
 â†’ redaction de PII
 â†’ validaÃ§Ã£o de argumentos
 â†’ aprovaÃ§Ã£o
 â†’ rate limit
 â†’ execuÃ§Ã£o
 â†’ sanitizaÃ§Ã£o do resultado
 â†’ auditoria
```

Middlewares recomendados:

- Rate limiting;
- Timeout e retry;
- Cache;
- Redaction de secrets e PII;
- DetecÃ§Ã£o ou bloqueio de prompt injection;
- Limite de tamanho de resposta;
- TransformaÃ§Ã£o de schema;
- Audit logging;
- Cost tracking;
- Allowlist de domÃ­nios e comandos.

### 8. Observabilidade completa

Evoluir o trace atual para uma timeline persistente:

- Prompt final enviado ao modelo;
- Modelo e provider;
- Tokens e custo;
- Passos do agente;
- Tools escolhidas e motivo;
- Argumentos e resultados;
- LatÃªncia por etapa;
- Erros e retries;
- UsuÃ¡rio, workspace e namespace;
- CorrelaÃ§Ã£o por `traceId`.

Dashboards recomendados:

- Tools mais usadas;
- MCPs instÃ¡veis;
- Custos por grupo;
- Taxa de aprovaÃ§Ã£o e rejeiÃ§Ã£o;
- LatÃªncia por provider;
- Erros por ferramenta.

### 9. Conversas persistentes e compartilhÃ¡veis

- HistÃ³rico no banco por usuÃ¡rio;
- Pastas e favoritos;
- Busca textual;
- RenomeaÃ§Ã£o automÃ¡tica;
- Branch ou fork de conversa;
- Compartilhamento controlado;
- ExportaÃ§Ã£o Markdown e JSON;
- RetenÃ§Ã£o configurÃ¡vel;
- Conversas temporÃ¡rias que nÃ£o persistem.

### 10. Artifacts

Evoluir alÃ©m de respostas textuais:

- CÃ³digo com preview;
- HTML e React;
- Diagramas Mermaid;
- Tabelas editÃ¡veis;
- Charts;
- Documentos;
- SQL com resultado tabular;
- Arquivos gerados pelas tools.

O suporte atual a charts oferece uma base para um sistema genÃ©rico de artifacts.

## InteligÃªncia e experiÃªncia de agente

### 11. SeleÃ§Ã£o dinÃ¢mica de tools

Evitar enviar centenas de schemas ao modelo:

1. Entender a intenÃ§Ã£o do usuÃ¡rio;
2. Buscar as ferramentas mais relevantes;
3. Expor somente um conjunto pequeno ao LLM;
4. Registrar por que as ferramentas foram selecionadas.

Isso reduz tokens, colisÃµes de nomes e escolhas incorretas. A ideia se relaciona ao roadmap do MetaMCP de busca dinÃ¢mica de ferramentas.

### 12. Model routing

Permitir polÃ­ticas como:

- Modelo barato para classificaÃ§Ã£o;
- Modelo forte para planejamento;
- Modelo especializado para cÃ³digo;
- Fallback automÃ¡tico em erro ou rate limit;
- Limites de custo por usuÃ¡rio ou grupo;
- SeleÃ§Ã£o automÃ¡tica por tarefa;
- ComparaÃ§Ã£o lado a lado entre modelos.

### 13. Agent loops configurÃ¡veis

Substituir o limite fixo por polÃ­ticas de execuÃ§Ã£o por agent:

- MÃ¡ximo de passos;
- MÃ¡ximo de custo;
- Timeout geral;
- Planejamento antes da execuÃ§Ã£o;
- ReflexÃ£o depois da tool;
- ExecuÃ§Ã£o paralela de tools independentes;
- EstratÃ©gia de fallback;
- CondiÃ§Ãµes explÃ­citas de parada.

### 14. MemÃ³ria

Separar:

- MemÃ³ria da conversa;
- PreferÃªncias do usuÃ¡rio;
- MemÃ³ria do workspace;
- Conhecimento corporativo;
- Resumos de longo prazo.

Toda gravaÃ§Ã£o de memÃ³ria deve ser visÃ­vel, editÃ¡vel e removÃ­vel pelo usuÃ¡rio.

### 15. Knowledge e RAG

- Upload de PDF, DOCX, Markdown e cÃ³digo;
- Conectores para SharePoint, OneDrive, GitHub e bancos;
- ColeÃ§Ãµes por grupo;
- CitaÃ§Ãµes com fonte;
- ACL herdada da origem;
- SincronizaÃ§Ã£o incremental;
- IndexaÃ§Ã£o hÃ­brida vetorial e textual.

## AdministraÃ§Ã£o e seguranÃ§a

### 16. Secret vault

NÃ£o limitar a proteÃ§Ã£o Ã  criptografia de colunas:

- ReferÃªncias a variÃ¡veis como `${SECRET_NAME}`;
- IntegraÃ§Ã£o com Azure Key Vault, AWS Secrets Manager ou Vault;
- Secrets por ambiente;
- RotaÃ§Ã£o;
- Auditoria de acesso;
- Valores nunca retornados integralmente ao frontend;
- Teste de conexÃ£o sem revelar credenciais.

### 17. RBAC granular

AlÃ©m de administrador e usuÃ¡rio:

- Platform admin;
- Workspace owner;
- MCP manager;
- Agent editor;
- Auditor;
- User.

Separar permissÃµes para visualizar, editar, executar e publicar.

### 18. Auditoria imutÃ¡vel

Registrar:

- AlteraÃ§Ãµes administrativas;
- ExecuÃ§Ãµes de tools;
- AprovaÃ§Ãµes;
- MudanÃ§as em policies;
- Acesso a secrets;
- CriaÃ§Ã£o e revogaÃ§Ã£o de API keys.

Prever exportaÃ§Ã£o para SIEM.

### 19. Sandboxing para stdio

Essencial para implantaÃ§Ã£o multiusuÃ¡rio:

- MCP stdio executado em container isolado;
- CPU, memÃ³ria e timeout limitados;
- Filesystem restrito;
- Network policy;
- Lista permitida de executÃ¡veis;
- DiretÃ³rio temporÃ¡rio por sessÃ£o;
- Nenhuma execuÃ§Ã£o direta no processo principal do portal.

### 20. Lifecycle dos MCPs

- Pool de conexÃµes;
- Warm instances para reduzir cold start;
- Health checks;
- Circuit breaker;
- Restart automÃ¡tico;
- Limites de concorrÃªncia;
- Logs separados por servidor;
- Versionamento da configuraÃ§Ã£o;
- Rollback.

O MetaMCP mantÃ©m sessÃµes ociosas para reduzir cold start; o mesmo padrÃ£o pode beneficiar este projeto.

## Marketplace e extensibilidade

### 21. CatÃ¡logo interno

- Templates de MCP;
- InstalaÃ§Ã£o guiada;
- Campos de configuraÃ§Ã£o baseados em schema;
- VersÃµes;
- VerificaÃ§Ã£o de publisher;
- Compatibilidade por sistema operacional;
- AvaliaÃ§Ã£o interna;
- AprovaÃ§Ã£o administrativa.

### 22. ImportaÃ§Ã£o e exportaÃ§Ã£o

- Importar `claude_desktop_config.json`;
- Importar configuraÃ§Ãµes do Cursor;
- Exportar configuraÃ§Ã£o para Claude Desktop, Cursor e VS Code;
- Importar namespaces do MetaMCP;
- Backup e restauraÃ§Ã£o do portal;
- ConfiguraÃ§Ã£o declarativa em YAML para GitOps.

### 23. Headless API e CLI

- CRUD administrativo por API;
- Provisionamento de namespaces e agents;
- Teste de MCP;
- ExecuÃ§Ã£o de avaliaÃ§Ãµes;
- ExportaÃ§Ã£o de traces;
- AutomaÃ§Ã£o CI/CD;
- CLI para instalaÃ§Ã£o e diagnÃ³stico.

## Ordem recomendada

1. Finalizar grupos da Fase 2;
2. Fase 3: integrar chat ao banco e aplicar policies no servidor;
3. Introduzir `Workspace/Agent` e `Namespace`;
4. Criar o tool registry persistente e os overrides;
5. Adicionar Resources e Prompts MCP;
6. Implementar aprovaÃ§Ã£o baseada em risco;
7. Persistir observabilidade e traces;
8. Criar o hub MCP com endpoint por namespace;
9. Implementar secret vault e sandbox para stdio;
10. Adicionar tool search, model routing e avaliaÃ§Ãµes;
11. Adicionar Knowledge/RAG e artifacts;
12. Criar marketplace, API e suporte a GitOps.

## Diretriz arquitetural

Usar o MetaMCP como referÃªncia para a camada de hub, mas nÃ£o modelar todo o produto ao redor de servidores MCP.

O produto deve ser modelado ao redor de agents e workspaces utilizados por pessoas. Namespaces, endpoints, modelos, skills e policies devem funcionar como infraestrutura por trÃ¡s dessa experiÃªncia.

## ReferÃªncias

- [MetaMCP](https://github.com/metatool-ai/metamcp)
- [MetaMCP README](https://github.com/metatool-ai/metamcp/blob/ai-dev/README.md)
- [MetaMCP proxy](https://github.com/metatool-ai/metamcp/blob/ai-dev/apps/backend/src/lib/metamcp/metamcp-proxy.ts)
- [MetaMCP tool overrides](https://github.com/metatool-ai/metamcp/blob/ai-dev/apps/backend/src/lib/metamcp/metamcp-middleware/tool-overrides.functional.ts)

