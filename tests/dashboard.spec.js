// the dashboard workspace: agenda, areas and the last 7 days
const { test, expect } = require("@playwright/test");
const { openApp, goTo } = require("./helpers");

test("agenda groups open tasks by day and opens a task", async ({ page }) => {
  await openApp(page);
  const headings = await page.locator(".agenda-day").allInnerTexts();
  expect(headings[0]).toMatch(/Overdue/i);
  expect(headings.some((h) => /Today/i.test(h))).toBe(true);
  await page.locator("#agenda .focus-row").first().click();
  await expect(page.locator("#task-modal")).toBeVisible();
});

test("an area opens its category with a summary", async ({ page }) => {
  await openApp(page);
  await page.locator('.area-row[data-area="coding"]').click();
  await expect(page.locator("#area-summary")).toBeVisible();
  expect(await page.evaluate(() => filters.category)).toBe("coding");
});

test("the last 7 days chart shows the sample history on a first visit", async ({ page }) => {
  await openApp(page);
  await expect(page.locator(".week-day")).toHaveCount(7);
  await expect(page.locator("#week-chart")).not.toHaveClass(/is-empty/);
  await expect(page.locator("#week-table tbody tr")).toHaveCount(7);
  await expect(page.locator("#week-summary")).toHaveText(/^6 tasks/);
});

test("the chart only counts tasks with a known completion date", async ({ page }) => {
  await openApp(page, {
    "HazFocus-tasks": [{ id: 1, title: "Old done task", status: "completed" }],
    "HazFocus-focus-history": {}
  });
  await expect(page.locator("#week-chart")).toHaveClass(/is-empty/);
});

test("upcoming is grouped by day when sorted by due date", async ({ page }) => {
  await openApp(page);
  await goTo(page, "upcoming");
  await page.evaluate(() => {
    const select = document.getElementById("sort-select");
    select.value = "due";
    select.dispatchEvent(new Event("change"));
  });
  expect(await page.locator(".schedule-group").count()).toBeGreaterThan(0);
  await page.evaluate(() => {
    const select = document.getElementById("sort-select");
    select.value = "priority";
    select.dispatchEvent(new Event("change"));
  });
  await expect(page.locator(".schedule-group")).toHaveCount(0);
});
