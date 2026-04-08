const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("playwright walkthrough script defines the answered and refusal scenarios", () => {
  const scriptPath = path.join(
    __dirname,
    "..",
    "playwright-tests",
    "chat-walkthrough.spec.js"
  );
  const script = fs.readFileSync(scriptPath, "utf8");

  assert.match(script, /Who is top of the EPL table\?/);
  assert.match(script, /Who moved up in the table since yesterday\?/);
});
