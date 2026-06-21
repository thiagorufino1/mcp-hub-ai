export type AppLocale = "pt-BR" | "en";

export type TranslationKey =
  | "app.name"
  | "app.version"
  | "theme.label"
  | "theme.light"
  | "theme.dark"
  | "theme.system"
  | "language.label"
  | "language.pt"
  | "language.en"
  | "topbar.newConversation"
  | "topbar.copySession"
  | "topbar.sessionCopied"
  | "topbar.configureLlm"
  | "topbar.mcpCount"
  | "sidebar.closeMenu"
  | "sidebar.validating"
  | "sidebar.connected"
  | "sidebar.disconnected"
  | "sidebar.failed"
  | "sidebar.pending"
  | "sidebar.reconnecting"
  | "sidebar.disabled"
  | "sidebar.enableServer"
  | "sidebar.disableServer"
  | "sidebar.localCommand"
  | "sidebar.remoteEndpoint"
  | "sidebar.connectionFailed"
  | "sidebar.noTools"
  | "sidebar.hideTools"
  | "sidebar.showTools"
  | "sidebar.promptTitle"
  | "sidebar.addPrompt"
  | "sidebar.promptActive"
  | "sidebar.promptHint"
  | "sidebar.editPrompt"
  | "sidebar.removePrompt"
  | "sidebar.promptDialogTitle"
  | "sidebar.promptDialogDescription"
  | "sidebar.promptField"
  | "sidebar.promptPlaceholder"
  | "sidebar.cancel"
  | "sidebar.save"
  | "sidebar.add"
  | "sidebar.llmConfigTitle"
  | "sidebar.noConnection"
  | "sidebar.ready"
  | "sidebar.llmHint"
  | "sidebar.selectProvider"
  | "sidebar.chooseProvider"
  | "sidebar.testConnection"
  | "sidebar.editConnection"
  | "sidebar.removeConnection"
  | "sidebar.test"
  | "sidebar.testing"
  | "sidebar.saving"
  | "sidebar.saved"
  | "sidebar.saveBrowser"
  | "sidebar.fillBeforeTest"
  | "sidebar.fillBeforeSave"
  | "sidebar.testSuccess"
  | "sidebar.testFailed"
  | "sidebar.networkError"
  | "sidebar.saveFailed"
  | "sidebar.tokens"
  | "sidebar.input"
  | "sidebar.output"
  | "sidebar.total"
  | "sidebar.tokensUnavailable"
  | "sidebar.mcpTitle"
  | "sidebar.addMcp"
  | "sidebar.emptyServers"
  | "chat.welcome"
  | "chat.sessionLogTitle"
  | "chat.assistant"
  | "chat.you"
  | "chat.emptyContent"
  | "chat.copySessionError"
  | "composer.label"
  | "composer.placeholder"
  | "composer.streamingHelp"
  | "composer.idleHelp"
  | "composer.stop"
  | "composer.send"
  | "message.you"
  | "message.assistant"
  | "message.stopped"
  | "message.error"
  | "message.copy"
  | "message.copied"
  | "message.copyResponse"
  | "message.thinking"
  | "message.helpful"
  | "message.notHelpful"
  | "message.responseCopied"
  | "starters.eyebrow"
  | "starters.title"
  | "starters.description"
  | "starters.workspace.label"
  | "starters.workspace.prompt"
  | "starters.flow.label"
  | "starters.flow.prompt"
  | "starters.diagnostics.label"
  | "starters.diagnostics.prompt"
  | "starters.example.label"
  | "starters.example.prompt"
  | "audio.unavailable"
  | "audio.autoFailed"
  | "audio.permissionDenied"
  | "audio.noTranscript"
  | "audio.stopRecording"
  | "audio.discardRecording"
  | "audio.retry"
  | "audio.startRecording"
  | "audio.unsupported"
  | "audio.speakToTranscribe"
  | "tool.running"
  | "tool.completed"
  | "tool.failed"
  | "tool.attachedMcp"
  | "tool.doneClickDetails"
  | "tool.imagesDetected"
  | "tool.arguments"
  | "tool.result"
  | "tool.remoteImage"
  | "tool.previewFailed"
  | "tool.openImage"
  | "tool.imageAlt"
  // MCP Dialog
  | "mcp.editTitle"
  | "mcp.addTitle"
  | "mcp.description"
  | "mcp.name"
  | "mcp.transport"
  | "mcp.command"
  | "mcp.args"
  | "mcp.addArg"
  | "mcp.env"
  | "mcp.addEnv"
  | "mcp.headers"
  | "mcp.addHeader"
  | "mcp.customHeaders"
  | "mcp.customHeadersHint"
  | "mcp.authentication"
  | "mcp.authenticationHint"
  | "mcp.appName"
  | "mcp.clientIdPlaceholder"
  | "mcp.scopePlaceholder"
  | "mcp.validating"
  | "mcp.sseUrlLabel"
  | "mcp.errorName"
  | "mcp.errorCommand"
  | "mcp.errorUrl"
  | "mcp.saveFailed"
  | "mcp.stdio.hint"
  | "mcp.sse.hint"
  | "mcp.http.hint"
  // LLM Dialog / Section
  | "llm.editTitle"
  | "llm.addTitle"
  | "llm.description"
  | "llm.provider"
  | "llm.configured"
  | "llm.tokensUsed"
  // Chat Shell
  | "chat.storageReset"
  | "chat.argLabel"
  | "chat.resultLabel"
  | "chat.mcpValidateFailed"
  | "chat.mcpConnectFailed"
  | "chat.noResponseBody"
  | "chat.streamFailed"
  | "chat.feedbackError"
  | "chat.stoppedEmpty"
  | "chat.requestFailed"
  // Error Boundary
  | "error.title"
  | "error.retry"
  // Topbar
  | "topbar.githubLabel"
  | "topbar.reset"
  | "topbar.resetConfirm";

type TranslationTable = Record<TranslationKey, string>;

export const translations: Record<AppLocale, TranslationTable> = {
  "pt-BR": {
    "app.name": "mcp-hub-ui",
    "app.version": `v${process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"}`,
    "theme.label": "Tema",
    "theme.light": "Claro",
    "theme.dark": "Escuro",
    "theme.system": "Sistema",
    "language.label": "Idioma",
    "language.pt": "Português",
    "language.en": "Inglês",
    "topbar.newConversation": "Nova conversa",
    "topbar.copySession": "Copiar sessão",
    "topbar.sessionCopied": "Sessão copiada",
    "topbar.configureLlm": "Configurar LLM",
    "topbar.mcpCount": "MCPs",
    "sidebar.closeMenu": "Fechar menu",
    "sidebar.validating": "Validando",
    "sidebar.connected": "Conectado",
    "sidebar.disconnected": "Desconectado",
    "sidebar.failed": "Falha",
    "sidebar.pending": "Pendente",
    "sidebar.reconnecting": "Reconectando",
    "sidebar.disabled": "Desabilitado",
    "sidebar.enableServer": "Habilitar servidor",
    "sidebar.disableServer": "Desabilitar servidor",
    "sidebar.localCommand": "Comando local",
    "sidebar.remoteEndpoint": "Endpoint remoto",
    "sidebar.connectionFailed": "Falha de conexão com o endpoint.",
    "sidebar.noTools": "O servidor não expôs nenhuma ferramenta.",
    "sidebar.hideTools": "Ocultar ferramentas",
    "sidebar.showTools": "Ver ferramentas",
    "sidebar.promptTitle": "Prompt de sistema",
    "sidebar.addPrompt": "Adicionar prompt de sistema",
    "sidebar.promptActive": "Ativa",
    "sidebar.promptHint": "Edite este bloco para ajustar o comportamento base do agente sem alterar o estilo do app.",
    "sidebar.editPrompt": "Editar prompt de sistema",
    "sidebar.removePrompt": "Remover prompt de sistema",
    "sidebar.promptDialogTitle": "Prompt de sistema",
    "sidebar.promptDialogDescription": "Defina o comportamento base enviado ao modelo antes da conversa.",
    "sidebar.promptField": "Prompt de sistema",
    "sidebar.promptPlaceholder": "Ex.: mostre os dados de forma estruturada e priorize contexto de rede antes de diagnóstico individual.",
    "sidebar.cancel": "Cancelar",
    "sidebar.save": "Salvar",
    "sidebar.add": "Adicionar",
    "sidebar.llmConfigTitle": "Configuração LLM",
    "sidebar.noConnection": "Sem conexão",
    "sidebar.ready": "Pronta",
    "sidebar.llmHint": "Clique no lápis para editar ou no refresh para validar.",
    "sidebar.selectProvider": "Selecionar provedor",
    "sidebar.chooseProvider": "Escolha um provedor para configurar a conexão",
    "sidebar.testConnection": "Testar conexão LLM",
    "sidebar.editConnection": "Editar conexão LLM",
    "sidebar.removeConnection": "Remover conexão LLM",
    "sidebar.test": "Testar",
    "sidebar.testing": "Testando",
    "sidebar.saving": "Salvando",
    "sidebar.saved": "Configuração salva neste navegador.",
    "sidebar.saveBrowser": "Tudo fica salvo apenas neste navegador.",
    "sidebar.fillBeforeTest": "Preencha todos os campos antes de testar.",
    "sidebar.fillBeforeSave": "Preencha todos os campos antes de salvar.",
    "sidebar.testSuccess": "Conexão validada com sucesso.",
    "sidebar.testFailed": "Falha ao conectar.",
    "sidebar.networkError": "Erro de rede ao testar a conexão.",
    "sidebar.saveFailed": "Não foi possível salvar a configuração.",
    "sidebar.tokens": "Tokens acumulados",
    "sidebar.input": "Entrada",
    "sidebar.output": "Saída",
    "sidebar.total": "Total",
    "sidebar.tokensUnavailable": "Tokens indisponíveis para este provider/modelo.",
    "sidebar.mcpTitle": "MCP Server",
    "sidebar.addMcp": "Adicionar MCP",
    "sidebar.emptyServers": "Adicione um MCP via STDIO, SSE ou Streamable HTTP.",
    "chat.welcome": "Olá! Em que posso ajudá-lo hoje? :)",
    "chat.sessionLogTitle": "Portal MCP Dev - Log de Sessão",
    "chat.assistant": "Assistente",
    "chat.you": "Você",
    "chat.emptyContent": "(Conteúdo vazio / Erro)",
    "chat.copySessionError": "Falha ao copiar a sessão",
    "composer.label": "Mensagem para o assistente",
    "composer.placeholder": "Pergunte algo, cole contexto ou use um starter acima…",
    "composer.streamingHelp": "Gerando resposta. Clique em parar para interromper.",
    "composer.idleHelp": "Composer do chat",
    "composer.stop": "Parar geração",
    "composer.send": "Enviar mensagem",
    "message.you": "Você",
    "message.assistant": "Assistente",
    "message.stopped": "Interrompida",
    "message.error": "Erro",
    "message.copy": "Copiar",
    "message.copied": "Copiado",
    "message.copyResponse": "Copiar resposta",
    "message.thinking": "Pensando…",
    "message.helpful": "Útil",
    "message.notHelpful": "Não útil",
    "message.responseCopied": "Resposta copiada.",
    "starters.eyebrow": "Estado inicial",
    "starters.title": "Comece com um fluxo real, não com uma tela vazia.",
    "starters.description": "Dispare perguntas úteis para validar a conexão, as ferramentas e o comportamento base do agente logo no primeiro minuto.",
    "starters.workspace.label": "Panorama do workspace",
    "starters.workspace.prompt": "Me dê um panorama do workspace MCP, dos servidores conectados e do que já posso testar.",
    "starters.flow.label": "Configurar primeiro fluxo",
    "starters.flow.prompt": "Monte um primeiro fluxo para validar chat, MCPs e prompt de sistema neste portal.",
    "starters.diagnostics.label": "Diagnóstico rápido",
    "starters.diagnostics.prompt": "Quais checks devo fazer se um MCP conectar mas não expor ferramentas?",
    "starters.example.label": "Exemplo real",
    "starters.example.prompt": "Simule uma pergunta real usando ferramentas MCP e explique o passo a passo.",
    "audio.unavailable": "Transcrição por voz indisponível neste navegador.",
    "audio.autoFailed": "Falha na transcrição automática.",
    "audio.permissionDenied": "Permissão de microfone negada ou indisponível.",
    "audio.noTranscript": "Não foi possível transcrever o áudio. Tente novamente ou digite manualmente.",
    "audio.stopRecording": "Parar gravação",
    "audio.discardRecording": "Descartar gravação",
    "audio.retry": "Tentar novamente",
    "audio.startRecording": "Iniciar gravação por voz",
    "audio.unsupported": "Transcrição por voz indisponível",
    "audio.speakToTranscribe": "Falar para transcrever no campo",
    "tool.running": "Executando",
    "tool.completed": "Concluída",
    "tool.failed": "Falha",
    "tool.attachedMcp": "MCP anexado",
    "tool.doneClickDetails": "Execução concluída. Clique para detalhes.",
    "tool.imagesDetected": "Imagens detectadas",
    "tool.arguments": "Argumentos",
    "tool.result": "Resultado",
    "tool.remoteImage": "Imagem remota",
    "tool.previewFailed": "Não foi possível carregar preview.",
    "tool.openImage": "Abrir imagem",
    "tool.imageAlt": "Pré-visualização da imagem retornada pela ferramenta",
    // MCP Dialog
    "mcp.editTitle": "Editar Servidor MCP",
    "mcp.addTitle": "Adicionar Servidor MCP",
    "mcp.description": "Configure o nome, o transporte e os parâmetros de conexão do servidor MCP.",
    "mcp.name": "Nome",
    "mcp.transport": "Transporte",
    "mcp.command": "Comando Executável",
    "mcp.args": "Lista de Argumentos",
    "mcp.addArg": "Adicionar argumento",
    "mcp.env": "Variáveis de Ambiente",
    "mcp.addEnv": "Adicionar variável de ambiente",
    "mcp.headers": "Cabeçalhos HTTP",
    "mcp.addHeader": "Adicionar cabeçalho",
    "mcp.customHeaders": "Cabeçalhos personalizados",
    "mcp.customHeadersHint": "Cabeçalhos opcionais enviados com requisições MCP remotas.",
    "mcp.authentication": "Autenticação",
    "mcp.authenticationHint": "Autenticação no navegador quando o servidor exigir.",
    "mcp.appName": "Nome do app",
    "mcp.clientIdPlaceholder": "opcional, para clientes pré-registrados",
    "mcp.scopePlaceholder": "opcional, separado por espaço",
    "mcp.validating": "Validando MCP…",
    "mcp.sseUrlLabel": "URL do Endpoint SSE",
    "mcp.errorName": "Defina um nome para o MCP.",
    "mcp.errorCommand": "Informe o comando do servidor MCP.",
    "mcp.errorUrl": "Informe a URL do servidor MCP.",
    "mcp.saveFailed": "Não foi possível validar o servidor MCP.",
    "mcp.stdio.hint": "Servidor MCP local executado via comando.",
    "mcp.sse.hint": "Endpoint remoto via Server-Sent Events.",
    "mcp.http.hint": "Servidor MCP via HTTP com streaming.",
    // LLM Dialog / Section
    "llm.editTitle": "Editar Configuração LLM",
    "llm.addTitle": "Adicionar LLM",
    "llm.description": "Escolha o provedor, informe as credenciais e teste a conexão antes de salvar.",
    "llm.provider": "Provedor",
    "llm.configured": "Configurado",
    "llm.tokensUsed": "Tokens Utilizados",
    // Chat Shell
    "chat.storageReset": "Seu histórico local foi reiniciado por uma atualização da interface. Uma cópia de segurança foi salva no navegador.",
    "chat.argLabel": "Argumentos:",
    "chat.resultLabel": "Resultado:",
    "chat.mcpValidateFailed": "Não foi possível validar o servidor MCP.",
    "chat.mcpConnectFailed": "Falha ao conectar ao MCP.",
    "chat.noResponseBody": "O backend não retornou conteúdo de resposta.",
    "chat.streamFailed": "Falha ao consumir o stream de resposta.",
    "chat.feedbackError": "Não foi possível registrar seu feedback. Tente novamente.",
    "chat.stoppedEmpty": "Geração interrompida antes de produzir conteúdo.",
    "chat.requestFailed": "Falha ao processar a solicitação",
    // Error Boundary
    "error.title": "Algo deu errado",
    "error.retry": "Tentar novamente",
    // Topbar
    "topbar.githubLabel": "Abrir repositório no GitHub",
    "topbar.reset": "Resetar",
    "topbar.resetConfirm": "Confirmar reset",
  },
  en: {
    "app.name": "mcp-hub-ui",
    "app.version": `v${process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"}`,
    "theme.label": "Theme",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.system": "System",
    "language.label": "Language",
    "language.pt": "Portuguese",
    "language.en": "English",
    "topbar.newConversation": "New chat",
    "topbar.copySession": "Copy session",
    "topbar.sessionCopied": "Session copied",
    "topbar.configureLlm": "Configure LLM",
    "topbar.mcpCount": "MCPs",
    "sidebar.closeMenu": "Close menu",
    "sidebar.validating": "Validating",
    "sidebar.connected": "Connected",
    "sidebar.disconnected": "Disconnected",
    "sidebar.failed": "Failed",
    "sidebar.pending": "Pending",
    "sidebar.reconnecting": "Reconnecting",
    "sidebar.disabled": "Disabled",
    "sidebar.enableServer": "Enable server",
    "sidebar.disableServer": "Disable server",
    "sidebar.localCommand": "Local command",
    "sidebar.remoteEndpoint": "Remote endpoint",
    "sidebar.connectionFailed": "Connection to endpoint failed.",
    "sidebar.noTools": "Server did not expose any tools.",
    "sidebar.hideTools": "Hide tools",
    "sidebar.showTools": "Show tools",
    "sidebar.promptTitle": "System Prompt",
    "sidebar.addPrompt": "Add system prompt",
    "sidebar.promptActive": "Active",
    "sidebar.promptHint": "Edit this block to adjust base agent behavior without changing the app styling.",
    "sidebar.editPrompt": "Edit system prompt",
    "sidebar.removePrompt": "Remove system prompt",
    "sidebar.promptDialogTitle": "System Prompt",
    "sidebar.promptDialogDescription": "Define the base behavior sent to the model before the conversation starts.",
    "sidebar.promptField": "System Prompt",
    "sidebar.promptPlaceholder": "Ex.: present data in structured form and prioritize network context before host-level diagnosis.",
    "sidebar.cancel": "Cancel",
    "sidebar.save": "Save",
    "sidebar.add": "Add",
    "sidebar.llmConfigTitle": "LLM Configuration",
    "sidebar.noConnection": "No connection",
    "sidebar.ready": "Ready",
    "sidebar.llmHint": "Click pencil to edit or refresh to validate.",
    "sidebar.selectProvider": "Select provider",
    "sidebar.chooseProvider": "Choose a provider to configure the connection",
    "sidebar.testConnection": "Test LLM connection",
    "sidebar.editConnection": "Edit LLM connection",
    "sidebar.removeConnection": "Remove LLM connection",
    "sidebar.test": "Test",
    "sidebar.testing": "Testing",
    "sidebar.saving": "Saving",
    "sidebar.saved": "Configuration saved in this browser.",
    "sidebar.saveBrowser": "Everything is stored in this browser only.",
    "sidebar.fillBeforeTest": "Fill every field before testing.",
    "sidebar.fillBeforeSave": "Fill every field before saving.",
    "sidebar.testSuccess": "Connection validated successfully.",
    "sidebar.testFailed": "Connection failed.",
    "sidebar.networkError": "Network error while testing connection.",
    "sidebar.saveFailed": "Could not save configuration.",
    "sidebar.tokens": "Accumulated tokens",
    "sidebar.input": "Input",
    "sidebar.output": "Output",
    "sidebar.total": "Total",
    "sidebar.tokensUnavailable": "Token usage unavailable for this provider/model.",
    "sidebar.mcpTitle": "MCP Server",
    "sidebar.addMcp": "Add MCP",
    "sidebar.emptyServers": "Add an MCP via STDIO, SSE or Streamable HTTP.",
    "chat.welcome": "Hello! How can I help you today? :)",
    "chat.sessionLogTitle": "Portal MCP Dev - Session Log",
    "chat.assistant": "Assistant",
    "chat.you": "You",
    "chat.emptyContent": "(Empty content / Error)",
    "chat.copySessionError": "Failed to copy session",
    "composer.label": "Message to assistant",
    "composer.placeholder": "Ask something, paste context, or use a starter above…",
    "composer.streamingHelp": "Generating response. Click stop to interrupt.",
    "composer.idleHelp": "Chat composer",
    "composer.stop": "Stop generation",
    "composer.send": "Send message",
    "message.you": "You",
    "message.assistant": "Assistant",
    "message.stopped": "Stopped",
    "message.error": "Error",
    "message.copy": "Copy",
    "message.copied": "Copied",
    "message.copyResponse": "Copy response",
    "message.thinking": "Thinking…",
    "message.helpful": "Helpful",
    "message.notHelpful": "Not helpful",
    "message.responseCopied": "Response copied.",
    "starters.eyebrow": "Empty state",
    "starters.title": "Start with a real flow, not an empty screen.",
    "starters.description": "Launch useful prompts to validate connection, tools, and base agent behavior in the first minute.",
    "starters.workspace.label": "Workspace overview",
    "starters.workspace.prompt": "Give me an overview of this MCP workspace, connected servers, and what I can already test.",
    "starters.flow.label": "Set up first flow",
    "starters.flow.prompt": "Build a first flow to validate chat, MCPs, and system instructions in this portal.",
    "starters.diagnostics.label": "Quick diagnostics",
    "starters.diagnostics.prompt": "What checks should I run if an MCP connects but exposes no tools?",
    "starters.example.label": "Real example",
    "starters.example.prompt": "Simulate a real question using MCP tools and walk me through each step.",
    "audio.unavailable": "Voice transcription unavailable in this browser.",
    "audio.autoFailed": "Automatic transcription failed.",
    "audio.permissionDenied": "Microphone permission denied or unavailable.",
    "audio.noTranscript": "Could not transcribe audio. Try again or type manually.",
    "audio.stopRecording": "Stop recording",
    "audio.discardRecording": "Discard recording",
    "audio.retry": "Try again",
    "audio.startRecording": "Start voice recording",
    "audio.unsupported": "Voice transcription unavailable",
    "audio.speakToTranscribe": "Speak to transcribe into field",
    "tool.running": "Running",
    "tool.completed": "Completed",
    "tool.failed": "Failed",
    "tool.attachedMcp": "Attached MCP",
    "tool.doneClickDetails": "Run completed. Click for details.",
    "tool.imagesDetected": "Detected images",
    "tool.arguments": "Arguments",
    "tool.result": "Result",
    "tool.remoteImage": "Remote image",
    "tool.previewFailed": "Could not load preview.",
    "tool.openImage": "Open image",
    "tool.imageAlt": "Preview of image returned by tool",
    // MCP Dialog
    "mcp.editTitle": "Edit MCP Server",
    "mcp.addTitle": "Add MCP Server",
    "mcp.description": "Configure the server name, transport, and MCP connection parameters.",
    "mcp.name": "Name",
    "mcp.transport": "Transport",
    "mcp.command": "Executable Command",
    "mcp.args": "Argument List",
    "mcp.addArg": "Add argument",
    "mcp.env": "Environment Variables",
    "mcp.addEnv": "Add environment variable",
    "mcp.headers": "HTTP Headers",
    "mcp.addHeader": "Add header",
    "mcp.customHeaders": "Custom Headers",
    "mcp.customHeadersHint": "Optional headers sent with remote MCP requests.",
    "mcp.authentication": "Authentication",
    "mcp.authenticationHint": "Browser-based auth when the server requires it.",
    "mcp.appName": "App name",
    "mcp.clientIdPlaceholder": "optional, for pre-registered clients",
    "mcp.scopePlaceholder": "optional, space-separated",
    "mcp.validating": "Validating MCP…",
    "mcp.sseUrlLabel": "SSE Endpoint URL",
    "mcp.errorName": "Set a name for the MCP.",
    "mcp.errorCommand": "Provide the MCP server command.",
    "mcp.errorUrl": "Provide the MCP server URL.",
    "mcp.saveFailed": "Could not validate the MCP server.",
    "mcp.stdio.hint": "Local MCP server executed through a command.",
    "mcp.sse.hint": "Remote endpoint through Server-Sent Events.",
    "mcp.http.hint": "MCP server over HTTP with streaming.",
    // LLM Dialog / Section
    "llm.editTitle": "Edit LLM Configuration",
    "llm.addTitle": "Add LLM",
    "llm.description": "Choose the provider, add credentials, and test the connection before saving.",
    "llm.provider": "Provider",
    "llm.configured": "Configured",
    "llm.tokensUsed": "Tokens Used",
    // Chat Shell
    "chat.storageReset": "Your local history was reset after a UI update. A backup was saved in the browser.",
    "chat.argLabel": "Arguments:",
    "chat.resultLabel": "Result:",
    "chat.mcpValidateFailed": "Could not validate the MCP server.",
    "chat.mcpConnectFailed": "Failed to connect to MCP.",
    "chat.noResponseBody": "Backend did not return response content.",
    "chat.streamFailed": "Failed to consume response stream.",
    "chat.feedbackError": "Could not register your feedback. Try again.",
    "chat.stoppedEmpty": "Generation stopped before producing content.",
    "chat.requestFailed": "Failed to process the request",
    // Error Boundary
    "error.title": "Something went wrong",
    "error.retry": "Try again",
    // Topbar
    "topbar.githubLabel": "Open repository on GitHub",
    "topbar.reset": "Reset",
    "topbar.resetConfirm": "Confirm reset",
  },
};

export function translate(locale: AppLocale, key: TranslationKey) {
  return translations[locale][key];
}
