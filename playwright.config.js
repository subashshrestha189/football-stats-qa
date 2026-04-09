const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./playwright-tests",
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
