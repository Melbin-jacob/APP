import { defineConfig, devices } from "@playwright/test";

// End-to-end tests of the main flows against a production build (npm run
// build first). Uses the database in DATABASE_URL (seeded), Redis, and an
// SMTP inbox the tests start themselves (e2e/global-setup.ts).
const PORT = Number(process.env.E2E_PORT ?? 3000);
export const MAIL_PORT = Number(process.env.E2E_SMTP_PORT ?? 2525);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1, // flows share one database
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      EMAIL_TRANSPORT: "smtp",
      SMTP_URL: `smtp://localhost:${MAIL_PORT}`,
      ALLOW_INSECURE_LOCAL_SECRETS: "true",
      CHAT_AI: "off", // the keyword assistant: no API key or cost in tests
      ERROR_ALERTS: "off",
    },
  },
});
