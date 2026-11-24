// installable app, offline use and accessibility
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { openApp, goTo } = require("./helpers");

test("the web app manifest is valid", async ({ page, request }) => {
  await openApp(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(href)).json();
  expect(manifest).toMatchObject({ name: "HazFocus", display: "standalone", start_url: "./" });
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok(), icon.src).toBe(true);
  }
  expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
});

test("the app opens offline after the first visit", async ({ page, context }) => {
  await openApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // reload once so the service worker controls the page
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#greeting-text")).not.toBeEmpty();
  await goTo(page, "all");
  await expect(page.locator(".task-card").first()).toBeVisible();
  await context.setOffline(false);
});

test("the focus shortcut opens the timer", async ({ page }) => {
  await openApp(page);
  await page.goto("./#focus");
  await expect(page.locator("#focus-view")).toBeVisible();
});

for (const theme of ["light", "dark"]) {
  for (const view of ["dashboard", "all", "focus", "settings"]) {
    test(`no accessibility problems on ${view} in ${theme}`, async ({ page }) => {
      await openApp(page, { "HazFocus-theme": theme });
      await goTo(page, view);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const problems = results.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0].target.join(" ")})`);
      expect(problems).toEqual([]);
    });
  }
}
