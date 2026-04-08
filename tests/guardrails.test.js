const test = require("node:test");
const assert = require("node:assert/strict");

const GUARDRAILS_MODULE_PATH = "../src/lib/chat-guardrails.js";

function loadGuardrailsModule() {
  delete require.cache[require.resolve(GUARDRAILS_MODULE_PATH)];
  return require(GUARDRAILS_MODULE_PATH);
}

test("chat guardrails reject inputs longer than 300 characters before any downstream work", () => {
  const { createChatGuardrails } = loadGuardrailsModule();
  const guardrails = createChatGuardrails();

  const result = guardrails.checkRequest({
    ip: "203.0.113.10",
    input: "x".repeat(301),
    now: new Date("2026-04-08T12:00:00Z"),
  });

  assert.deepEqual(result, {
    ok: false,
    statusCode: 400,
    code: "input_too_long",
    message: "Questions must be 300 characters or fewer.",
  });
});

test("chat guardrails allow up to 10 requests per minute per IP and then rate-limit with a generic message", () => {
  const { createChatGuardrails } = loadGuardrailsModule();
  const guardrails = createChatGuardrails();
  const now = new Date("2026-04-08T12:00:00Z");

  for (let count = 0; count < 10; count += 1) {
    const allowed = guardrails.checkRequest({
      ip: "203.0.113.10",
      input: "Who is top of the EPL table?",
      now,
    });

    assert.deepEqual(allowed, {
      ok: true,
    });
  }

  const blocked = guardrails.checkRequest({
    ip: "203.0.113.10",
    input: "Who is top of the EPL table?",
    now,
  });

  assert.deepEqual(blocked, {
    ok: false,
    statusCode: 429,
    code: "rate_limited",
    message: "Please try again shortly.",
  });
});

test("chat guardrails enforce the 50 requests per hour per IP cap independently of the minute window", () => {
  const { createChatGuardrails } = loadGuardrailsModule();
  const guardrails = createChatGuardrails();

  for (let count = 0; count < 50; count += 1) {
    const minuteBucket = String(Math.floor(count / 10)).padStart(2, "0");
    const requestTime = new Date(`2026-04-08T12:${minuteBucket}:00Z`);
    const allowed = guardrails.checkRequest({
      ip: "203.0.113.10",
      input: "When is the next UCL match?",
      now: requestTime,
    });

    assert.deepEqual(allowed, {
      ok: true,
    });
  }

  const blocked = guardrails.checkRequest({
    ip: "203.0.113.10",
    input: "When is the next UCL match?",
    now: new Date("2026-04-08T12:59:00Z"),
  });

  assert.deepEqual(blocked, {
    ok: false,
    statusCode: 429,
    code: "rate_limited",
    message: "Please try again shortly.",
  });
});
