const { createChatGuardrails } = require("./chat-guardrails");
const { createClassifierService } = require("./classifier-service");
const { createRetrieverService } = require("./retriever-service");
const { createAnswererService } = require("./answerer-service");
const { createSessionStore } = require("./session-state");
const { getConfig } = require("./config");
const { createChatHandler } = require("./chat-handler");
const { createDebugHandler } = require("./debug-handler");
const { createGcsStorage } = require("./gcs-storage");
const { createAnthropicModelClient } = require("./anthropic-model-client");

let sessionStore;
let chatHandler;
let debugHandler;

function getSessionStore() {
  if (!sessionStore) {
    sessionStore = createSessionStore();
  }

  return sessionStore;
}

function getChatHandler() {
  if (!chatHandler) {
    const config = getConfig();
    const modelClient = createAnthropicModelClient({ apiKey: config.anthropicApiKey });
    const storageImpl = createGcsStorage({ serviceAccountKey: config.gcpServiceAccountKey });

    chatHandler = createChatHandler({
      guardrails: createChatGuardrails(),
      classifier: createClassifierService({ modelClient }),
      retriever: createRetrieverService({
        config,
        storageImpl,
        nowProvider: () => new Date(),
      }),
      answerer: createAnswererService({ modelClient }),
      sessions: getSessionStore(),
    });
  }

  return chatHandler;
}

function getDebugHandler() {
  if (!debugHandler) {
    const config = getConfig();
    const storageImpl = createGcsStorage({ serviceAccountKey: config.gcpServiceAccountKey });
    const retriever = createRetrieverService({
      config,
      storageImpl,
      nowProvider: () => new Date(),
    });

    debugHandler = createDebugHandler({
      config,
      retriever,
      storageImpl,
    });
  }

  return debugHandler;
}

module.exports = {
  getChatHandler,
  getDebugHandler,
};
