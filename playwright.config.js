// @ts-check
const { defineConfig, devices } = require("@playwright/test");

// CI tem retries=1 pra amortecer flakes leves (race em fetch/render).
// Local fica retries=0 pra forçar você a corrigir teste flaky em vez de mascarar.
// Se um teste só passa com retry no CI, marcar como `flaky` (ver CLAUDE.md §6).
module.exports = defineConfig({
  testDir: "./tests/web",
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm --prefix sample-app run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
