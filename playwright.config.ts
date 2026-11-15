import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { requireDisposableDatabaseUrl } from "./lib/testing/disposable-database-url";

// Not 3000, so a running `npm run dev` (on the dev database) is never reused.
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      // Overrides .env, so the app reads and writes only the e2e database.
      DATABASE_URL: requireDisposableDatabaseUrl("E2E_DATABASE_URL"),
      // `next start` runs in production mode, where Auth.js rejects any host
      // it isn't told to trust.
      AUTH_TRUST_HOST: "true",
      APP_BASE_URL: baseURL,
    },
  },
});
