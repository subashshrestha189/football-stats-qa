const test = require("node:test");
const assert = require("node:assert/strict");

const ANSWERER_MODULE_PATH = "../src/lib/answerer-service.js";

function loadAnswererModule() {
  delete require.cache[require.resolve(ANSWERER_MODULE_PATH)];
  return require(ANSWERER_MODULE_PATH);
}

test("answerer returns grounded model phrasing when the model includes the snapshot citation", async () => {
  const { createAnswererService } = loadAnswererModule();
  const service = createAnswererService({
    modelClient: {
      async answer() {
        return "Liverpool lead the EPL table with 71 points. Data as of 2026-04-08.";
      },
    },
  });

  const result = await service.answer({
    competition: "EPL",
    intent: "standings",
    snapshotDate: "2026-04-08",
    data: [{ team: "Liverpool", points: 71 }],
  });

  assert.deepEqual(result, {
    answerText: "Liverpool lead the EPL table with 71 points. Data as of 2026-04-08.",
    fallbackUsed: false,
  });
});

test("answerer falls back to deterministic text when the model omits the snapshot citation", async () => {
  const { createAnswererService } = loadAnswererModule();
  const service = createAnswererService({
    modelClient: {
      async answer() {
        return "Liverpool lead the EPL table with 71 points.";
      },
    },
  });

  const result = await service.answer({
    competition: "EPL",
    intent: "standings",
    snapshotDate: "2026-04-08",
    data: [{ team: "Liverpool", points: 71 }],
  });

  assert.deepEqual(result, {
    answerText: "Liverpool lead the EPL table with 71 points. Data as of 2026-04-08.",
    fallbackUsed: true,
  });
});

test("answerer falls back to deterministic text when the model call fails", async () => {
  const { createAnswererService } = loadAnswererModule();
  const service = createAnswererService({
    modelClient: {
      async answer() {
        throw new Error("model unavailable");
      },
    },
  });

  const result = await service.answer({
    competition: "EPL",
    intent: "top_scorers",
    snapshotDate: "2026-04-08",
    data: [{ player: "Erling Haaland", goals: 24 }],
  });

  assert.deepEqual(result, {
    answerText: "Erling Haaland has 24 goals in EPL top scorers. Data as of 2026-04-08.",
    fallbackUsed: true,
  });
});
