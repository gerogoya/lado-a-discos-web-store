import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: process.env.ADMIN_TEST_URL || "http://localhost:3000",
    browserName: "chromium",
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure"
  }
});
