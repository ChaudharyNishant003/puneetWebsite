import { defineConfig, devices } from "@playwright/test";

// Runs against a dev/prod server that is already up (npm run dev:local) with seeded demo data
// and integrations in mock mode (no Razorpay/MSG91 keys), so OTPs and payments are simulated.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 5"] } }],
});
