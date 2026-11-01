import { defineConfig } from "@playwright/test";

const PROD_SECRET = "e2e-prod-secret-0123456789-0123456789-abcdef";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  projects: [
    { name: "dev", grepInvert: /@prod/, use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" } },
    // Payload-leak checks must run against a production build: the dev server echoes server props in its debug channel.
    { name: "prod", grep: /@prod/, use: { baseURL: "http://localhost:3101", trace: "retain-on-failure" } },
  ],
  webServer: [
    {
      command: "pnpm dev --port 3100",
      url: "http://localhost:3100/connexion",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "pnpm build && pnpm start --port 3101",
      url: "http://localhost:3101/connexion",
      reuseExistingServer: false,
      timeout: 300_000,
      env: { BACKOFFICE_SESSION_SECRET: PROD_SECRET, NEXT_DIST_DIR: ".next-e2e" },
    },
  ],
});
