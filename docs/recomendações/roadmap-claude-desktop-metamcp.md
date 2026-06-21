# Recomendações de Roadmap — Claude Desktop Melhorado + MetaMCP

## Visão do produto

Posicionar o projeto como:

> Um workspace corporativo de IA, com experiência semelhante ao Claude Desktop, múltiplos modelos e um gateway MCP governado.

O diferencial não deve ser apenas oferecer mais um chat com MCP, mas combinar:

- Experiência de desktop e chat;
- Agregação e roteamento MCP;
- Governança por usuário e grupo;
- Observabilidade e segurança;
- Criação de agentes reutilizáveis.

O MetaMCP é uma referência forte para infraestrutura, gateway e orquestração. O MCP Hub já possui uma base relevante na camada de experiência do usuário, chat multimodelo, traces e aprovação de ferramentas.

## Features prioritárias

### 1. Workspaces ou Agents

Criar uma entidade central que agrupe:

- Modelo e parâmetros;
- System prompt;
- Skills;
- MCP servers e ferramentas permitidas;
- Base de conhecimento;
- Conversation starters;
- Política de aprovação;
- Grupos ou usuários autorizados.

Exemplos:

- Analista financeiro;
- Suporte;
- DevOps;
- Desenvolvimento.

Isso amplia o conceito técnico de namespace do MetaMCP e o transforma em uma experiência diretamente compreensível para o usuário.

### 2. Namespaces MCP

Inspirado no MetaMCP:

- Agrupar vários MCP servers;
- Habilitar ferramentas individualmente;
- Definir aliases para evitar colisões;
- Sobrescrever nome, descrição e annotations;
- Associar namespaces a agents e grupos;
- Publicar um namespace como endpoint MCP unificado.

Exemplo:

```text
namespace: engineering
├── GitHub
├── Jira
├── PostgreSQL
└── Kubernetes
```

O chat deve receber uma visão governada do namespace, em vez de conhecer e confiar diretamente em configurações individuais de servidores.

### 3. Gateway MCP próprio

Além de consumir MCPs, o projeto deve poder atuar como servidor MCP:

- Streamable HTTP;
- SSE enquanto necessário;
- Endpoint por namespace ou agent;
- Autenticação por API key, OAuth e Entra ID;
- Compatibilidade com Claude Desktop, Cursor e VS Code;
- Exportação de configuração pronta para cada cliente.

As mesmas ferramentas administradas no portal poderiam ser utilizadas dentro e fora do chat.

### 4. Resources e Prompts do protocolo MCP

Expandir o foco atual em tools:

- Descobrir e navegar resources;
- Suportar templates de resources;
- Exibir prompts publicados pelos servidores;
- Oferecer autocomplete de argumentos;
- Inserir resources na conversa;
- Suportar assinatura e atualização de resources quando disponível.

Isso aproxima o produto de uma implementação MCP completa e da experiência do Claude Desktop.

### 5. Tool registry central

Ao inspecionar um servidor, persistir:

- Schema;
- Versão ou hash;
- Descrição;
- Annotations;
- Status;
- Data da última descoberta;
- Latência média;
- Taxa de erro;
- Histórico de mudanças.

Permitir também:

- Alias;
- Descrição corrigida;
- Tags;
- Classificação de sensibilidade: `read`, `write`, `destructive`, `external`;
- Timeout e retries;
- Valores padrão de input;
- Exemplos de uso.

### 6. Aprovação de ferramentas por risco

Evoluir além de `always`, `never` e `selected`:

- Aprovar automaticamente tools read-only;
- Aprovar uma vez por sessão;
- Aprovar apenas uma execução;
- Exigir justificativa do modelo;
- Exibir diff ou preview antes da execução;
- Exigir confirmação adicional para tools destrutivas;
- Bloquear argumentos por política.

Exemplos:

- `list_issues`: automático;
- `create_issue`: exige aprovação;
- `delete_repository`: bloqueado.

Essa pode ser uma das features mais fortes para diferenciar o produto do Claude Desktop.

### 7. Middleware pipeline

Criar uma pipeline configurável visualmente:

```text
request
 → autorização
 → redaction de PII
 → validação de argumentos
 → aprovação
 → rate limit
 → execução
 → sanitização do resultado
 → auditoria
```

Middlewares recomendados:

- Rate limiting;
- Timeout e retry;
- Cache;
- Redaction de secrets e PII;
- Detecção ou bloqueio de prompt injection;
- Limite de tamanho de resposta;
- Transformação de schema;
- Audit logging;
- Cost tracking;
- Allowlist de domínios e comandos.

### 8. Observabilidade completa

Evoluir o trace atual para uma timeline persistente:

- Prompt final enviado ao modelo;
- Modelo e provider;
- Tokens e custo;
- Passos do agente;
- Tools escolhidas e motivo;
- Argumentos e resultados;
- Latência por etapa;
- Erros e retries;
- Usuário, workspace e namespace;
- Correlação por `traceId`.

Dashboards recomendados:

- Tools mais usadas;
- MCPs instáveis;
- Custos por grupo;
- Taxa de aprovação e rejeição;
- Latência por provider;
- Erros por ferramenta.

### 9. Conversas persistentes e compartilháveis

- Histórico no banco por usuário;
- Pastas e favoritos;
- Busca textual;
- Renomeação automática;
- Branch ou fork de conversa;
- Compartilhamento controlado;
- Exportação Markdown e JSON;
- Retenção configurável;
- Conversas temporárias que não persistem.

### 10. Artifacts

Evoluir além de respostas textuais:

- Código com preview;
- HTML e React;
- Diagramas Mermaid;
- Tabelas editáveis;
- Charts;
- Documentos;
- SQL com resultado tabular;
- Arquivos gerados pelas tools.

O suporte atual a charts oferece uma base para um sistema genérico de artifacts.

## Inteligência e experiência de agente

### 11. Seleção dinâmica de tools

Evitar enviar centenas de schemas ao modelo:

1. Entender a intenção do usuário;
2. Buscar as ferramentas mais relevantes;
3. Expor somente um conjunto pequeno ao LLM;
4. Registrar por que as ferramentas foram selecionadas.

Isso reduz tokens, colisões de nomes e escolhas incorretas. A ideia se relaciona ao roadmap do MetaMCP de busca dinâmica de ferramentas.

### 12. Model routing

Permitir políticas como:

- Modelo barato para classificação;
- Modelo forte para planejamento;
- Modelo especializado para código;
- Fallback automático em erro ou rate limit;
- Limites de custo por usuário ou grupo;
- Seleção automática por tarefa;
- Comparação lado a lado entre modelos.

### 13. Agent loops configuráveis

Substituir o limite fixo por políticas de execução por agent:

- Máximo de passos;
- Máximo de custo;
- Timeout geral;
- Planejamento antes da execução;
- Reflexão depois da tool;
- Execução paralela de tools independentes;
- Estratégia de fallback;
- Condições explícitas de parada.

### 14. Memória

Separar:

- Memória da conversa;
- Preferências do usuário;
- Memória do workspace;
- Conhecimento corporativo;
- Resumos de longo prazo.

Toda gravação de memória deve ser visível, editável e removível pelo usuário.

### 15. Knowledge e RAG

- Upload de PDF, DOCX, Markdown e código;
- Conectores para SharePoint, OneDrive, GitHub e bancos;
- Coleções por grupo;
- Citações com fonte;
- ACL herdada da origem;
- Sincronização incremental;
- Indexação híbrida vetorial e textual.

## Administração e segurança

### 16. Secret vault

Não limitar a proteção à criptografia de colunas:

- Referências a variáveis como `${SECRET_NAME}`;
- Integração com Azure Key Vault, AWS Secrets Manager ou Vault;
- Secrets por ambiente;
- Rotação;
- Auditoria de acesso;
- Valores nunca retornados integralmente ao frontend;
- Teste de conexão sem revelar credenciais.

### 17. RBAC granular

Além de administrador e usuário:

- Platform admin;
- Workspace owner;
- MCP manager;
- Agent editor;
- Auditor;
- User.

Separar permissões para visualizar, editar, executar e publicar.

### 18. Auditoria imutável

Registrar:

- Alterações administrativas;
- Execuções de tools;
- Aprovações;
- Mudanças em policies;
- Acesso a secrets;
- Criação e revogação de API keys.

Prever exportação para SIEM.

### 19. Sandboxing para stdio

Essencial para implantação multiusuário:

- MCP stdio executado em container isolado;
- CPU, memória e timeout limitados;
- Filesystem restrito;
- Network policy;
- Lista permitida de executáveis;
- Diretório temporário por sessão;
- Nenhuma execução direta no processo principal do portal.

### 20. Lifecycle dos MCPs

- Pool de conexões;
- Warm instances para reduzir cold start;
- Health checks;
- Circuit breaker;
- Restart automático;
- Limites de concorrência;
- Logs separados por servidor;
- Versionamento da configuração;
- Rollback.

O MetaMCP mantém sessões ociosas para reduzir cold start; o mesmo padrão pode beneficiar este projeto.

## Marketplace e extensibilidade

### 21. Catálogo interno

- Templates de MCP;
- Instalação guiada;
- Campos de configuração baseados em schema;
- Versões;
- Verificação de publisher;
- Compatibilidade por sistema operacional;
- Avaliação interna;
- Aprovação administrativa.

### 22. Importação e exportação

- Importar `claude_desktop_config.json`;
- Importar configurações do Cursor;
- Exportar configuração para Claude Desktop, Cursor e VS Code;
- Importar namespaces do MetaMCP;
- Backup e restauração do portal;
- Configuração declarativa em YAML para GitOps.

### 23. Headless API e CLI

- CRUD administrativo por API;
- Provisionamento de namespaces e agents;
- Teste de MCP;
- Execução de avaliações;
- Exportação de traces;
- Automação CI/CD;
- CLI para instalação e diagnóstico.

## Ordem recomendada

1. Finalizar grupos da Fase 2;
2. Fase 3: integrar chat ao banco e aplicar policies no servidor;
3. Introduzir `Workspace/Agent` e `Namespace`;
4. Criar o tool registry persistente e os overrides;
5. Adicionar Resources e Prompts MCP;
6. Implementar aprovação baseada em risco;
7. Persistir observabilidade e traces;
8. Criar o gateway MCP com endpoint por namespace;
9. Implementar secret vault e sandbox para stdio;
10. Adicionar tool search, model routing e avaliações;
11. Adicionar Knowledge/RAG e artifacts;
12. Criar marketplace, API e suporte a GitOps.

## Diretriz arquitetural

Usar o MetaMCP como referência para a camada de gateway, mas não modelar todo o produto ao redor de servidores MCP.

O produto deve ser modelado ao redor de agents e workspaces utilizados por pessoas. Namespaces, endpoints, modelos, skills e policies devem funcionar como infraestrutura por trás dessa experiência.

## Referências

- [MetaMCP](https://github.com/metatool-ai/metamcp)
- [MetaMCP README](https://github.com/metatool-ai/metamcp/blob/ai-dev/README.md)
- [MetaMCP proxy](https://github.com/metatool-ai/metamcp/blob/ai-dev/apps/backend/src/lib/metamcp/metamcp-proxy.ts)
- [MetaMCP tool overrides](https://github.com/metatool-ai/metamcp/blob/ai-dev/apps/backend/src/lib/metamcp/metamcp-middleware/tool-overrides.functional.ts)
