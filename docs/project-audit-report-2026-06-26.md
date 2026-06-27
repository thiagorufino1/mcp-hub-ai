# Project Audit Report - 2026-06-26

## Escopo

Analise estatica e validacoes nao destrutivas do projeto `mcp-hub-ai`, com foco em erros, bugs, codigo morto e melhorias de performance.

Nenhum arquivo de codigo-fonte foi alterado durante a analise. Este documento foi criado para registrar o relatorio.

## Validacoes executadas

| Comando | Resultado | Observacao |
| --- | --- | --- |
| `git status --short` | Passou | Worktree estava limpa antes da criacao deste relatorio. |
| `npm run typecheck` | Passou | TypeScript sem erros. |
| `npm run lint` | Falhou | 4 erros e 1 warning de React hooks. |
| `npm test` | Falhou | 31 testes passaram, 6 falharam. |
| `npm run build` | Passou | Build Next.js 16.2.9 compilou e gerou rotas com sucesso. |

## Confirmacoes por documentacao

Foi usado Context7 para validar praticas atuais de React, Next.js e Prisma:

- React oficial (`/reactjs/react.dev`): confirma que `setState` sincronamente dentro de `useEffect` para derivar dados de props causa render extra/cascading render; deve-se derivar durante render quando possivel. Isso confirma os erros de lint como problema real de pratica React, nao apenas preferencia local.
- Next.js 16.2.9 (`/vercel/next.js/v16.2.9`): confirma que `revalidatePath` invalida paths reais, pages ou layouts; chamadas para rotas removidas sao residuo tecnico. A documentacao tambem confirma que fetches lentos em Server Components bloqueiam a renderizacao da rota.
- Prisma (`/prisma/web`): confirma que modelos e relacoes no schema mantem API gerada e representam estrutura persistida/migrada. Modelos sem uso no app, como `AccessPolicy`, devem ser tratados com decisao explicita e migration, nao removidos informalmente.

## Achados criticos

### 1. `updateMcp` apaga o registry de tools e nao repopula

**Severidade:** Alta  
**Arquivo:** `src/app/admin/mcp/actions.ts`  
**Evidencia:** `updateMcp` executa `prisma.mcpToolRegistry.deleteMany({ where: { mcpServerId: id } })`, mas nao chama `inspectMcpConfig` depois da atualizacao. Ja `createMcp` chama `inspectMcpConfig(mcp.id, false)`.

**Impacto provavel:** ao editar um MCP, as tools registradas sao removidas e so voltam se alguem executar refresh manual. Isso afeta UI admin, namespaces e execucao governada que dependem do registry.

**Recomendacao:** apos atualizar o MCP, repopular o registry com `inspectMcpConfig(id, true)` ou evitar deletar o registry quando campos que afetam discovery nao mudaram.

### 2. Namespaces "all users" nao entram no contexto geral do usuario

**Severidade:** Alta  
**Arquivos:** `src/lib/user-context.ts`, `src/lib/mcp-namespace.ts`

**Evidencia:** `resolveAccessibleNamespace` considera um namespace sem grupos e sem usuarios como acessivel para todos. Ja `getUserContext` busca namespaces publicados apenas quando ha match em `users` ou `groups`, sem incluir a condicao equivalente de acesso publico.

**Impacto provavel:** um namespace publicado para todos pode funcionar pelo endpoint direto `/api/mcp/namespaces/[alias]`, mas nao aparecer no contexto do chat/proxy geral.

**Recomendacao:** alinhar o filtro de `getUserContext` com a regra `canAccess` usada por `mcp-namespace.ts`, incluindo `{ AND: [{ groups: { none: {} } }, { users: { none: {} } }] }`.

### 3. Testes quebrados por Workspaces removidos

**Severidade:** Alta  
**Arquivos:** `tests/phase9-workspaces-namespaces.test.mjs`, `tests/workspace-detail-page.test.mjs`

**Evidencia:** a suite tenta ler arquivos removidos:

- `src/lib/workspace-context.ts`
- `src/app/admin/workspaces/actions.ts`
- `src/app/admin/workspaces/client.tsx`
- `src/app/admin/workspaces/[id]/page.tsx`
- `src/app/admin/workspaces/[id]/client.tsx`
- `src/app/admin/workspaces/[id]/actions.ts`

**Impacto:** `npm test` falha com `ENOENT`, impedindo que a suite seja usada como gate confiavel.

**Recomendacao:** remover ou reescrever testes legados de Workspaces para a arquitetura atual baseada em namespaces.

## Achados importantes

### 4. Lint falha por estado derivado em effects

**Severidade:** Media/Alta  
**Confirmado por documentacao:** Sim, React oficial.

**Arquivos:**

- `src/app/admin/llm/client.tsx`
- `src/app/connections/client.tsx`
- `src/components/admin/namespace-form.tsx`

**Evidencia:** `npm run lint` falha com `react-hooks/set-state-in-effect`, porque componentes sincronizam estado derivado de props dentro de `useEffect`.

**Impacto:** renderizacoes extras, possivel jank e bloqueio do pipeline de lint.

**Recomendacao:** derivar valores durante render quando possivel, usar `key` para resetar formulario/modal quando a entidade muda, ou aplicar padrao condicional controlado apenas quando houver estado editavel que realmente precise sobreviver entre renders.

### 5. `useCallback` em `connections/client.tsx` usa `router` fora das dependencias

**Severidade:** Media  
**Confirmado por documentacao:** Sim, regras oficiais de hooks.

**Arquivo:** `src/app/connections/client.tsx`

**Evidencia:** `connect` chama `router.refresh()` mas o array de dependencias e `[]`.

**Impacto:** lint falha e o React Compiler pula otimizacao por nao conseguir preservar memoizacao manual.

**Recomendacao:** incluir `router` nas dependencias ou remover `useCallback` se a memoizacao nao traz beneficio real.

### 6. `/connections` faz trabalho externo pesado durante render

**Severidade:** Media/Alta  
**Confirmado por documentacao:** Sim, Next.js Server Components.

**Arquivo:** `src/app/connections/page.tsx`

**Evidencia:**

- Chama `getUserContext`.
- Consulta namespaces novamente em dois blocos separados.
- Para OAuth conectado, chama `resolveMcpServerTools` para cada servidor durante render da pagina.

**Impacto:** a pagina pode ficar lenta ou instavel conforme cresce o numero de MCPs conectados, pois discovery externo bloqueia a resposta da rota.

**Recomendacao:** usar o registry persistido como fonte principal para contagem/status, mover probes para acao explicita ou background refresh, e consolidar as queries de namespaces.

### 7. Codigo morto de Workspaces em revalidacoes

**Severidade:** Media  
**Confirmado por documentacao:** Sim, Next.js `revalidatePath`.

**Arquivos:**

- `src/app/admin/namespaces/actions.ts`
- `src/app/admin/namespaces/[id]/actions.ts`

**Evidencia:** ainda existem varias chamadas `revalidatePath("/admin/workspaces")`, embora a rota tenha sido removida.

**Impacto:** nao parece quebrar runtime, mas aumenta ruido, confunde manutencao e sugere migracao incompleta.

**Recomendacao:** remover as revalidacoes de `/admin/workspaces` ou substituir por paths reais impactados pela mutacao.

### 8. `AccessPolicy` parece modelo legado/orfao

**Severidade:** Media  
**Confirmado por documentacao:** Parcialmente, Prisma schema/migrations.

**Arquivo:** `prisma/schema.prisma`

**Evidencia:** busca local encontrou `AccessPolicy` apenas no schema/relacoes, sem uso funcional no app atual.

**Impacto:** mantem API Prisma e tabela/relacoes legadas, aumenta complexidade do modelo mental e pode induzir implementacoes novas a usarem uma camada obsoleta.

**Recomendacao:** decidir se `AccessPolicy` ainda faz parte do dominio. Se nao fizer, remover com migration planejada e limpeza de relacoes em `McpServer` e `EntraGroup`.

## Achados de teste/contrato

### 9. Testes ainda esperam labels antigas/localizadas

**Severidade:** Media  
**Arquivos:** `tests/phase11-mcp-protocol-compat.test.mjs`, `src/app/connections/client.tsx`

**Evidencia:** teste espera `Vincular` e `Desvincular`, mas a UI atual usa labels em ingles como `Connect`/`Disconnect`.

**Impacto:** a falha pode ser apenas teste obsoleto, mas tambem aponta inconsistencia de idioma na UI.

**Recomendacao:** decidir idioma padrao da tela. Atualizar teste para labels atuais ou ajustar UI para portugues se essa for a diretriz.

### 10. Teste de registry espera UI de permissoes que nao aparece no cliente listado

**Severidade:** Media  
**Arquivos:** `tests/phase7-tool-registry.test.mjs`, `src/app/admin/mcp/client.tsx`

**Evidencia:** teste espera strings como `tools enabled`, `Requer aprovacao` e grid de cards de tools, mas `src/app/admin/mcp/client.tsx` mostra tabela resumida e contagem `enabledTools/registryTools.length`.

**Impacto:** contrato de teste divergiu da UI atual.

**Recomendacao:** se a configuracao detalhada de tools foi movida para `src/app/admin/mcp/[id]/client.tsx`, atualizar o teste para o arquivo correto. Se foi removida sem querer, restaurar a UI.

### 11. Teste de audit espera textos em ingles, UI esta em portugues

**Severidade:** Baixa/Media  
**Arquivos:** `tests/phase8-governance-audit.test.mjs`, `src/app/admin/audit/client.tsx`, `src/app/admin/audit/page.tsx`

**Evidencia:** teste procura `Average latency` e `Sensitive argument fields are redacted`, mas a UI usa `Latencia media` e nao contem a segunda frase.

**Impacto:** falha de teste por desalinhamento de copy/contrato.

**Recomendacao:** alinhar teste com a UI atual ou restaurar o texto se ele for requisito de compliance/seguranca.

## Achados de seguranca e governanca

### 12. `/api/mcp/call` executa servidor MCP enviado pelo cliente autenticado

**Severidade:** Depende da decisao de produto  
**Arquivo:** `src/app/api/mcp/call/route.ts`

**Evidencia:** a rota aceita `server` no body, normaliza o payload e chama `executeGovernedMcpTool`.

**Impacto:** pode ser intencional para MCP pessoal, mas contorna o catalogo corporativo/admin/proxy. Mesmo autenticada, essa rota permite execucao baseada em configuracao client-provided.

**Recomendacao:** documentar explicitamente essa fronteira. Se o produto deve ser estritamente governado, restringir a rota a servidores persistidos/permitidos. Se MCP pessoal e requisito, manter, mas registrar essa excecao nos testes e docs de seguranca.

## Achados de performance

### 13. Queries duplicadas em `/connections`

**Severidade:** Media  
**Arquivo:** `src/app/connections/page.tsx`

**Evidencia:** a pagina busca namespaces acessiveis uma vez para IDs de MCP e outra vez para exibicao de endpoints. Alem disso chama `getUserContext`, que tambem resolve parte do mesmo dominio.

**Impacto:** custo de banco desnecessario e maior complexidade.

**Recomendacao:** consolidar a query de namespaces e derivar MCP IDs/endpoints do mesmo resultado, ou expor uma funcao compartilhada para resolver acesso sem duplicacao.

### 14. Uso de arrays/filter em dados pequenos esta ok, mas pode crescer

**Severidade:** Baixa  
**Arquivo:** `src/app/admin/page.tsx`

**Evidencia:** para montar graficos, o dashboard usa `filter`/`find` sobre `execByDay` e `llmByDay` em loops de 14 dias. Hoje o volume e pequeno porque os SQLs ja agregam por dia/modelo.

**Impacto:** baixo no estado atual.

**Recomendacao:** se a quantidade de modelos/status crescer, trocar por `Map` indexado por dia/status/modelo.

## Codigo morto e dependencias candidatas a limpeza

### 15. `adm-zip` parece nao utilizado

**Severidade:** Baixa  
**Arquivo:** `package.json`

**Evidencia:** `adm-zip` e `@types/adm-zip` aparecem em dependencias, mas nao foram encontrados imports/usos no codigo atual.

**Recomendacao:** confirmar se scripts de empacotamento antigos ainda precisam dele. Se nao, remover dependencia e lockfile em uma mudanca dedicada.

### 16. Textos e encoding aparente em saida PowerShell

**Severidade:** Baixa  
**Arquivos:** varios componentes exibidos no terminal

**Evidencia:** terminal exibiu caracteres como `â€”`, `LatÃªncia`, `Ãºltimas`. Isso pode ser apenas encoding da saida PowerShell, nao necessariamente arquivo corrompido.

**Recomendacao:** verificar no editor/DOM antes de tratar como bug. Nao classificar como erro sem confirmacao visual.

## Itens que nao sao necessariamente bugs

- O build de producao passa, entao os problemas atuais nao impedem empacotamento.
- Logs com `console.error`/`console.warn` aparecem em rotas e libs, mas muitos parecem intencionais para observabilidade. Nao foram classificados como codigo morto.
- `next-themes`, `recharts`, `react-circle-flags`, `@lobehub/icons` e `open` tem usos encontrados.
- A existencia de migrations antigas de Workspaces/Skills e normal em historico de banco; o problema atual sao testes e chamadas de app ainda apontando para rotas removidas.

## Priorizacao sugerida

1. Corrigir `updateMcp` para nao deixar registry vazio apos edicao.
2. Alinhar `getUserContext` com a regra de acesso publico de namespaces.
3. Atualizar/remover testes legados de Workspaces e ajustar testes de UI ao estado atual.
4. Corrigir erros de lint de React hooks.
5. Remover revalidacoes de `/admin/workspaces`.
6. Reduzir custo de `/connections`, evitando probes externos no render.
7. Decidir futuro de `AccessPolicy` e da rota `/api/mcp/call`.
8. Limpar dependencias candidatas, como `adm-zip`, apos confirmacao.

## Resumo executivo

O projeto compila e o typecheck passa, mas a qualidade automatizada nao esta verde: lint e testes falham. Os riscos mais concretos sao dois bugs funcionais no dominio MCP/namespaces: edicao de MCP pode limpar o registry de tools, e namespaces publicados para todos podem ficar fora do contexto geral do usuario. Em paralelo, ha sinais claros de migracao incompleta da remocao de Workspaces/Skills, especialmente testes obsoletos e revalidacoes para rotas removidas.
