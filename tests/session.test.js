const test = require("node:test");
const assert = require("node:assert/strict");

const SESSION_MODULE_PATH = "../src/lib/session-state.js";

function loadSessionModule() {
  delete require.cache[require.resolve(SESSION_MODULE_PATH)];
  return require(SESSION_MODULE_PATH);
}

test("session store records one pending clarification and resolves it into the original request", () => {
  const { createSessionStore } = loadSessionModule();
  const store = createSessionStore();

  store.setPendingClarification("session-1", {
    originalInput: "Who is top of the table?",
    intent: "standings",
  });

  const resolved = store.resolveClarification("session-1", "EPL");

  assert.deepEqual(resolved, {
    originalInput: "Who is top of the table?",
    intent: "standings",
    competition: "EPL",
  });
  assert.equal(store.getSession("session-1").pendingClarification, null);
});

test("session store reuses the last resolved competition for one same-intent follow-up only", () => {
  const { createSessionStore } = loadSessionModule();
  const store = createSessionStore();

  store.setLastResolvedCompetition("session-1", {
    competition: "EPL",
    intent: "standings",
  });

  assert.equal(
    store.getReusableCompetition("session-1", { intent: "standings" }),
    "EPL"
  );
  assert.equal(
    store.getReusableCompetition("session-1", { intent: "standings" }),
    null
  );
});

test("session store clears all state after a refusal", () => {
  const { createSessionStore } = loadSessionModule();
  const store = createSessionStore();

  store.setPendingClarification("session-1", {
    originalInput: "Who is top of the table?",
    intent: "standings",
  });
  store.setLastResolvedCompetition("session-1", {
    competition: "UCL",
    intent: "standings",
  });

  store.clearAfterRefusal("session-1");

  assert.deepEqual(store.getSession("session-1"), {
    pendingClarification: null,
    lastResolvedCompetition: null,
  });
});
