import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  webServer: [
    {
      command: "npx tsx tests/e2e/start-server.ts 3100",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: "npx tsx tests/e2e/start-server.ts",
      url: "http://localhost:3101",
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
  projects: [
    {
      name: "laptop",
      use: {
        ...devices["Desktop Chrome"],
        timezoneId: "America/Los_Angeles",
      },
    },
    { name: "ipad", use: { ...devices["iPad (gen 7)"] } },
    { name: "phone", use: { ...devices["iPhone 13"] } },
  ],
});
