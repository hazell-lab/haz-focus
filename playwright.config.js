// test settings: runs every spec on a desktop and a phone screen
const { defineConfig, devices } = require("@playwright/test");

// locally use the installed chrome, in ci use the chromium that playwright installs
const channel = process.env.CI ? undefined : "chrome";

// BASE_URL tests a site that is already running, like a copy in a /haz-focus/ folder
const baseURL = process.env.BASE_URL || "http://127.0.0.1:4173/";

module.exports = defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    reducedMotion: "reduce",
    trace: "on-first-retry"
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, channel } },
    { name: "phone", use: { ...devices["Pixel 7"], channel } }
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npx http-server . -p 4173 -c-1 --silent",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI
      }
});
