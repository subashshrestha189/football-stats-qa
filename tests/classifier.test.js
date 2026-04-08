const test = require("node:test");
const assert = require("node:assert/strict");

const CLASSIFIER_MODULE_PATH = "../src/lib/classifier-service.js";

function loadClassifierModule() {
  delete require.cache[require.resolve(CLASSIFIER_MODULE_PATH)];
  return require(CLASSIFIER_MODULE_PATH);
}

test("classifier returns a supported intent when the model resolves intent and competition with high confidence", async () => {
  const { createClassifierService } = loadClassifierModule();
  const service = createClassifierService({
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
  });

  const result = await service.classify({
    input: "Who is top of the EPL table?",
  });

  assert.deepEqual(result, {
    type: "answer",
    intent: "standings",
    competition: "EPL",
    clarificationPrompt: null,
  });
});

test("classifier forces clarify when the model returns low confidence", async () => {
  const { createClassifierService } = loadClassifierModule();
  const service = createClassifierService({
    modelClient: {
      async classify() {
        return {
          intent: "standings",
          competition: null,
          confidence: "low",
          clarification_prompt: "Which competition — EPL or Champions League?",
        };
      },
    },
  });

  const result = await service.classify({
    input: "Who is top of the table?",
  });

  assert.deepEqual(result, {
    type: "clarify",
    clarificationPrompt: "Which competition — EPL or Champions League?",
  });
});

test("classifier returns refuse for unsupported questions", async () => {
  const { createClassifierService } = loadClassifierModule();
  const service = createClassifierService({
    modelClient: {
      async classify() {
        return {
          intent: "refuse",
          competition: null,
          confidence: "high",
          clarification_prompt: null,
          refusal_code: "unsupported_scope",
          refusal_message:
            "Assists and injury data are outside this app's scope.",
        };
      },
    },
  });

  const result = await service.classify({
    input: "Who has the most assists?",
  });

  assert.deepEqual(result, {
    type: "refuse",
    refusalCode: "unsupported_scope",
    message: "Assists and injury data are outside this app's scope.",
  });
});
