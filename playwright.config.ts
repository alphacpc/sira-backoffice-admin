import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm dev --port 3100",
    url: "http://localhost:3100/connexion",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
