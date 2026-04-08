const test = require("node:test");
const assert = require("node:assert/strict");

const CHAT_ROUTE_MODULE_PATH = "../app/api/chat/route.js";
const DEBUG_ROUTE_MODULE_PATH = "../app/api/debug/route.js";

function loadChatRouteModule() {
  delete require.cache[require.resolve(CHAT_ROUTE_MODULE_PATH)];
  return require(CHAT_ROUTE_MODULE_PATH);
}

function loadDebugRouteModule() {
  delete require.cache[require.resolve(DEBUG_ROUTE_MODULE_PATH)];
  return require(DEBUG_ROUTE_MODULE_PATH);
}

test("chat handler returns clarify when classifier asks for clarification", async () => {
  const { createChatHandler } = loadChatRouteModule();
  const handler = createChatHandler({
    guardrails: {
      checkRequest() {
        return { ok: true };
      },
    },
    classifier: {
      async classify() {
        return {
          type: "clarify",
          clarificationPrompt: "Which competition — EPL or Champions League?",
        };
      },
    },
    retriever: {},
    answerer: {},
    sessions: {
      setPendingClarification() {},
      getReusableCompetition() {
        return null;
      },
    },
  });

  const response = await handler.handle({
    sessionId: "session-1",
    ip: "203.0.113.10",
    input: "Who is top of the table?",
  });

  assert.deepEqual(response, {
    status: "clarify",
    clarification_prompt: "Which competition — EPL or Champions League?",
  });
});

test("chat handler returns answered payload when retrieval and answer generation succeed", async () => {
  const { createChatHandler } = loadChatRouteModule();
  const handler = createChatHandler({
    guardrails: {
      checkRequest() {
        return { ok: true };
      },
    },
    classifier: {
      async classify() {
        return {
          type: "answer",
          intent: "standings",
          competition: "EPL",
          clarificationPrompt: null,
        };
      },
    },
    retriever: {
      async retrieve() {
        return {
          type: "answer",
          competition: "EPL",
          intent: "standings",
          snapshotDate: "2026-04-08",
          data: [{ team: "Liverpool", points: 71 }],
        };
      },
    },
    answerer: {
      async answer() {
        return {
          answerText:
            "Liverpool lead the EPL table with 71 points. Data as of 2026-04-08.",
          fallbackUsed: false,
        };
      },
    },
    sessions: {
      getReusableCompetition() {
        return null;
      },
      setLastResolvedCompetition() {},
      clearAfterRefusal() {},
    },
  });

  const response = await handler.handle({
    sessionId: "session-1",
    ip: "203.0.113.10",
    input: "Who is top of the EPL table?",
  });

  assert.deepEqual(response, {
    status: "answered",
    answer_text:
      "Liverpool lead the EPL table with 71 points. Data as of 2026-04-08.",
    competition: "EPL",
    intent: "standings",
    snapshot_date: "2026-04-08",
    fallback_used: false,
  });
});

test("debug handler requires the configured debug key and returns manifest plus cache status", async () => {
  const { createDebugHandler } = loadDebugRouteModule();
  const handler = createDebugHandler({
    config: {
      debugKey: "secret-debug-key",
    },
    retriever: {
      getCacheStatus() {
        return {
          size: 1,
          keys: ["gold/latest/EPL/standings.json"],
        };
      },
    },
    storageImpl: {
      async readJson() {
        return {
          status: "complete",
          snapshot_date: "2026-04-08",
          files_written: 8,
        };
      },
    },
  });

  const unauthorized = await handler.handle({
    headers: {},
  });
  const authorized = await handler.handle({
    headers: {
      "x-debug-key": "secret-debug-key",
    },
  });

  assert.deepEqual(unauthorized, {
    statusCode: 401,
    body: {
      error: "Unauthorized",
    },
  });
  assert.deepEqual(authorized, {
    statusCode: 200,
    body: {
      manifest: {
        status: "complete",
        snapshot_date: "2026-04-08",
        files_written: 8,
      },
      cache: {
        size: 1,
        keys: ["gold/latest/EPL/standings.json"],
      },
    },
  });
});

test("chat handler returns unavailable when an internal service throws", async () => {
  const { createChatHandler } = loadChatRouteModule();
  const handler = createChatHandler({
    guardrails: {
      checkRequest() {
        return { ok: true };
      },
    },
    classifier: {
      async classify() {
        throw new Error("classifier offline");
      },
    },
    retriever: {},
    answerer: {},
    sessions: {},
  });

  const response = await handler.handle({
    sessionId: "session-1",
    ip: "203.0.113.10",
    input: "Who is top of the EPL table?",
  });

  assert.deepEqual(response, {
    status: "unavailable",
    answer_text: "Please try again later.",
  });
});

test("debug handler returns a 503 response when manifest lookup fails", async () => {
  const { createDebugHandler } = loadDebugRouteModule();
  const handler = createDebugHandler({
    config: {
      debugKey: "secret-debug-key",
      gcpBucketName: "football-stats-qa-prod",
    },
    retriever: {
      getCacheStatus() {
        return {
          size: 0,
          keys: [],
        };
      },
    },
    storageImpl: {
      async readJson() {
        throw new Error("storage unavailable");
      },
    },
  });

  const response = await handler.handle({
    headers: {
      "x-debug-key": "secret-debug-key",
    },
  });

  assert.deepEqual(response, {
    statusCode: 503,
    body: {
      error: "Debug data unavailable",
    },
  });
});
