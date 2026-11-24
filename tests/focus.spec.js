// the pomodoro focus timer, using a fake clock so tests do not wait 25 minutes
const { test, expect } = require("@playwright/test");
const { openApp, goTo, localDate } = require("./helpers");

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test("start, pause and reset", async ({ page }) => {
  await openApp(page);
  await goTo(page, "focus");
  await expect(page.locator("#timer-time")).toHaveText("25:00");

  await page.click("#timer-toggle");
  await page.clock.fastForward("01:05");
  await expect(page.locator("#timer-time")).toHaveText("23:55");
  await expect(page.locator("#timer-toggle-text")).toHaveText("Pause");

  await page.click("#timer-toggle");
  await page.clock.fastForward("02:00");
  await expect(page.locator("#timer-time")).toHaveText("23:55");
  await expect(page.locator("#timer-toggle-text")).toHaveText("Resume");

  await page.click("#timer-reset");
  await expect(page.locator("#timer-time")).toHaveText("25:00");
});

test("a finished session is counted and a break follows", async ({ page }) => {
  await openApp(page);
  await goTo(page, "focus");
  await page.click("#timer-toggle");
  await page.clock.fastForward("25:01");
  await expect(page.locator("#timer-label")).toHaveText(/short break/i);
  await expect(page.locator("#focus-today")).toHaveText("Today: 1 session · 25 min focused");
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem("HazFocus-focus-history")));
  expect(history[localDate(0)]).toBe(25);
});

test("a long break comes after the fourth focus session", async ({ page }) => {
  await openApp(page, { "HazFocus-focus-settings": { focus: 1, short: 1, long: 2, sound: false } });
  await goTo(page, "focus");
  for (let i = 0; i < 4; i++) {
    await page.click("#timer-toggle");
    await page.clock.fastForward("01:01");
    if (i < 3) {
      await page.click("#timer-toggle");
      await page.clock.fastForward("01:01");
    }
  }
  await expect(page.locator("#timer-label")).toHaveText(/long break/i);
  await expect(page.locator("#cycle-dots .is-done")).toHaveCount(4);
});

test("skipping a session does not count it", async ({ page }) => {
  await openApp(page);
  await goTo(page, "focus");
  await page.click("#timer-skip");
  await expect(page.locator("#timer-label")).toHaveText(/short break/i);
  await expect(page.locator("#focus-today")).toHaveText("No focus sessions finished today yet.");
});

test("keyboard shortcuts control the timer", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones have no keyboard shortcuts");
  await openApp(page);
  await page.keyboard.press("6");
  await page.keyboard.press("Space");
  await expect(page.locator("#timer-toggle-text")).toHaveText("Pause");
  await page.keyboard.press("r");
  await expect(page.locator("#timer-toggle-text")).toHaveText("Start");
  await page.keyboard.press("f");
  await expect(page.locator("body")).toHaveClass(/immersive/);
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveClass(/immersive/);
});

test("session lengths in settings are kept within limits", async ({ page }) => {
  await openApp(page);
  await goTo(page, "settings");
  await page.fill("#focus-minutes", "500");
  await page.locator("#focus-minutes").dispatchEvent("change");
  await expect(page.locator("#focus-minutes")).toHaveValue("120");
});
