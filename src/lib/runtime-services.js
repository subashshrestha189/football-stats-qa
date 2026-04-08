const { createChatGuardrails } = require("./chat-guardrails");
const { createClassifierService } = require("./classifier-service");
const { createRetrieverService } = require("./retriever-service");
const { createAnswererService } = require("./answerer-service");
const { createSessionStore } = require("./session-state");
const { getConfig } = require("./config");
const { createChatHandler } = require("./chat-handler");
const { createDebugHandler } = require("./debug-handler");

function createUnavailableModelClient() {
  return {
    async classify() {
      throw new Error("Model client not configured");
    },
    async answer() {
      throw new Error("Model client not configured");
    },
  };
}

function createUnavailableStorage() {
  return {
    async readJson() {
      throw new Error("Storage client not configured");
    },
  };
}

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
    const modelClient = createUnavailableModelClient();
    const storageImpl = createUnavailableStorage();

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
    const storageImpl = createUnavailableStorage();
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
