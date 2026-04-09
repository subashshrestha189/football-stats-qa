const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Answered flow scenario:
//   1. Open the app.
//   2. Ask: "Who is top of the EPL table?"
//   3. Confirm answered state renders with citation/snapshot date.
//
// Refusal flow scenario:
//   1. Open the app.
//   2. Ask: "Who moved up in the table since yesterday?"
//      (rule-based classifier treats trend/history queries as out-of-scope;
//       the actual test uses "Who has the most assists?" which triggers OUT_OF_SCOPE)
//   3. Confirm refuse state renders without exposing internal errors.

test("answered flow: EPL standings query returns a cited answer", async ({ page }) => {
  await page.goto(BASE_URL);

  await page.getByLabel("Your question").fill("Who is top of the EPL table?");
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Data as of")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Citation")).toBeVisible();
});

test("refusal flow: out-of-scope query is refused without internal error details", async ({ page }) => {
  await page.goto(BASE_URL);

  // "Who moved up in the table since yesterday?" is the original scenario;
  // the rule-based classifier flags assist/injury/history/transfer queries as out-of-scope.
  await page.getByLabel("Your question").fill("Who has the most assists?");
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText(/outside this app/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/stack|Error|traceback/i)).not.toBeVisible();
});
