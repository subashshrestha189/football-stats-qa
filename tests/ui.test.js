const test = require("node:test");
const assert = require("node:assert/strict");

const UI_MODULE_PATH = "../src/ui/chat-ui.js";

function loadUiModule() {
  delete require.cache[require.resolve(UI_MODULE_PATH)];
  return require(UI_MODULE_PATH);
}

test("chat composer renders a text area with a 300 character limit", () => {
  const { renderChatComposer } = loadUiModule();

  const html = renderChatComposer();

  assert.match(html, /textarea/i);
  assert.match(html, /maxlength="300"/i);
  assert.match(html, /Send/i);
});

test("response renderer supports answered, clarify, refuse, and unavailable states", () => {
  const { renderResponse } = loadUiModule();

  assert.match(
    renderResponse({ status: "answered", answer_text: "Liverpool lead." }),
    /Liverpool lead\./
  );
  assert.match(
    renderResponse({
      status: "clarify",
      clarification_prompt: "Which competition — EPL or Champions League?",
    }),
    /Which competition/
  );
  assert.match(
    renderResponse({ status: "refuse", answer_text: "Out of scope." }),
    /Out of scope\./
  );
  assert.match(
    renderResponse({ status: "unavailable", answer_text: "Please try again later." }),
    /Please try again later\./
  );
});

test("citation block and assumption banner render when metadata is present", () => {
  const { renderCitationBlock, renderAssumptionBanner } = loadUiModule();

  assert.match(
    renderCitationBlock({ competition: "EPL", snapshot_date: "2026-04-08" }),
    /Data as of 2026-04-08/i
  );
  assert.match(
    renderAssumptionBanner({ competition: "EPL" }),
    /Assumed competition: EPL/i
  );
});

test("clarification prompt bubble renders inside a dedicated prompt container", () => {
  const { renderClarificationBubble } = loadUiModule();

  const html = renderClarificationBubble(
    "Which competition — EPL or Champions League?"
  );

  assert.match(html, /clarification-bubble/);
  assert.match(html, /Which competition/);
});
