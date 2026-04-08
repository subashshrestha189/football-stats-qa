const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("daily ETL workflow runs on the required 00:00 UTC and 06:00 UTC schedules", () => {
  const workflowPath = path.join(
    __dirname,
    "..",
    ".github",
    "workflows",
    "etl.yml"
  );
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.match(workflow, /cron:\s*'0 0 \* \* \*'/);
  assert.match(workflow, /cron:\s*'0 6 \* \* \*'/);
});

test("daily ETL workflow runs the ETL pipeline and distinguishes primary run from retry run", () => {
  const workflowPath = path.join(
    __dirname,
    "..",
    ".github",
    "workflows",
    "etl.yml"
  );
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.match(workflow, /name:\s*Daily ETL/i);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /python/i);
  assert.match(workflow, /github\.event\.schedule/);
  assert.match(workflow, /0 0 \* \* \*/);
  assert.match(workflow, /0 6 \* \* \*/);
});
