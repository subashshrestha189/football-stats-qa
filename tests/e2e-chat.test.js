const test = require("node:test");
const assert = require("node:assert/strict");

const { createChatGuardrails } = require("../src/lib/chat-guardrails");
const { createClassifierService } = require("../src/lib/classifier-service");
const { createRetrieverService } = require("../src/lib/retriever-service");
const { createAnswererService } = require("../src/lib/answerer-service");
const { createSessionStore } = require("../src/lib/session-state");
const { createChatHandler } = require("../app/api/chat/route");

function createApp() {
  const sessions = createSessionStore();
  const classifier = createClassifierService({
    modelClient: {
      async classify({ input }) {
        const normalized = input.toLowerCase();

        if (normalized.includes("assists")) {
          return {
            intent: "refuse",
            confidence: "high",
            refusal_code: "unsupported_scope",
            refusal_message: "Assists and injury data are outside this app's scope.",
          };
        }

        if (normalized.includes("top of the table") && !normalized.includes("epl")) {
          return {
            intent: "standings",
            competition: null,
            confidence: "low",
            clarification_prompt: "Which competition — EPL or Champions League?",
          };
        }

        if (normalized.includes("standings") || normalized.includes("top of the epl table")) {
          return {
            intent: "standings",
            competition: "EPL",
            confidence: "high",
            clarification_prompt: null,
          };
        }

        if (normalized.includes("recent result")) {
          return {
            intent: "recent_results",
            competition: "EPL",
            confidence: "high",
            clarification_prompt: null,
          };
        }

        if (normalized.includes("top scorer")) {
          return {
            intent: "top_scorers",
            competition: "EPL",
            confidence: "high",
            clarification_prompt: null,
          };
        }

        return {
          intent: "upcoming_fixtures",
          competition: "EPL",
          confidence: "high",
          clarification_prompt: null,
        };
      },
    },
  });

  const retriever = createRetrieverService({
    config: { gcpBucketName: "football-stats-qa-prod" },
    storageImpl: {
      async readJson(_bucketName, objectPath) {
        if (objectPath === "gold/manifest.json") {
          return {
            status: "complete",
            snapshot_date: "2026-04-08",
            files_written: 8,
          };
        }

        if (objectPath === "gold/latest/EPL/standings.json") {
          return {
            snapshot_date: "2026-04-08",
            rows: [{ team: "Liverpool", points: 71 }],
          };
        }

        if (objectPath === "gold/latest/EPL/scorers.json") {
          return {
            snapshot_date: "2026-04-08",
            rows: [{ player: "Erling Haaland", goals: 24 }],
          };
        }

        return {
          snapshot_date: "2026-04-08",
          recent_results: [
            {
              homeTeam: "Arsenal",
              awayTeam: "Chelsea",
              homeScore: 2,
              awayScore: 1,
              status: "FINISHED",
            },
          ],
          upcoming_fixtures: [
            {
              homeTeam: "Liverpool",
              awayTeam: "Arsenal",
              status: "SCHEDULED",
            },
          ],
          rows: [],
        };
      },
    },
    nowProvider: () => new Date("2026-04-08T12:00:00Z"),
  });

  const answerer = createAnswererService({
    modelClient: {
      async answer({ intent, snapshotDate }) {
        if (intent === "standings") {
          return `Liverpool lead the EPL table with 71 points. Data as of ${snapshotDate}.`;
        }

        if (intent === "recent_results") {
          return `Arsenal beat Chelsea 2-1. Data as of ${snapshotDate}.`;
        }

        if (intent === "top_scorers") {
          return `Erling Haaland has 24 goals in EPL top scorers. Data as of ${snapshotDate}.`;
        }

        return `Liverpool play Arsenal next. Data as of ${snapshotDate}.`;
      },
    },
  });

  return createChatHandler({
    guardrails: createChatGuardrails(),
    classifier,
    retriever,
    answerer,
    sessions,
  });
}

test("end-to-end standings flow returns answered", async () => {
  const handler = createApp();
  const response = await handler.handle({
    sessionId: "e2e-1",
    ip: "203.0.113.10",
    input: "Who is top of the EPL table?",
  });
  assert.equal(response.status, "answered");
});

test("end-to-end results flow returns answered", async () => {
  const handler = createApp();
  const response = await handler.handle({
    sessionId: "e2e-2",
    ip: "203.0.113.10",
    input: "Show me the recent result",
  });
  assert.equal(response.status, "answered");
});

test("end-to-end scorers flow returns answered", async () => {
  const handler = createApp();
  const response = await handler.handle({
    sessionId: "e2e-3",
    ip: "203.0.113.10",
    input: "Who is the top scorer?",
  });
  assert.equal(response.status, "answered");
});

test("end-to-end fixtures flow returns answered", async () => {
  const handler = createApp();
  const response = await handler.handle({
    sessionId: "e2e-4",
    ip: "203.0.113.10",
    input: "What is the upcoming fixture?",
  });
  assert.equal(response.status, "answered");
});

test("end-to-end clarify flow returns clarify", async () => {
  const handler = createApp();
  const response = await handler.handle({
    sessionId: "e2e-5",
    ip: "203.0.113.10",
    input: "Who is top of the table?",
  });
  assert.equal(response.status, "clarify");
});

test("end-to-end refuse flow returns refuse", async () => {
  const handler = createApp();
  const response = await handler.handle({
    sessionId: "e2e-6",
    ip: "203.0.113.10",
    input: "Who has the most assists?",
  });
  assert.equal(response.status, "refuse");
});

test("end-to-end unavailable flow returns unavailable when manifest is not complete", async () => {
  const sessions = createSessionStore();
  const handler = createChatHandler({
    guardrails: createChatGuardrails(),
    classifier: createClassifierService({
      modelClient: {
        async classify() {
          return {
            intent: "standings",
            competition: "EPL",
            confidence: "high",
            clarification_prompt: null,
          };
        },
      },
    }),
    retriever: createRetrieverService({
      config: { gcpBucketName: "football-stats-qa-prod" },
      storageImpl: {
        async readJson() {
          return {
            status: "failed",
            snapshot_date: "2026-04-08",
            files_written: 0,
          };
        },
      },
      nowProvider: () => new Date("2026-04-08T12:00:00Z"),
    }),
    answerer: createAnswererService({
      modelClient: {
        async answer() {
          return "unused";
        },
      },
    }),
    sessions,
  });

  const response = await handler.handle({
    sessionId: "e2e-7",
    ip: "203.0.113.10",
    input: "Who is top of the EPL table?",
  });

  assert.equal(response.status, "unavailable");
});
