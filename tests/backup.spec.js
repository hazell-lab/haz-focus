// downloading a backup and restoring it
const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const { openApp, goTo, savedTasks } = require("./helpers");

const file = (name, data) => ({ name, mimeType: "application/json", buffer: Buffer.from(typeof data === "string" ? data : JSON.stringify(data)) });

test("download a backup and restore it in a fresh browser", async ({ page, browser }) => {
  await openApp(page, { "HazFocus-name": "Test Person", "HazFocus-focus-settings": { focus: 40, short: 7, long: 20, sound: false } });
  await goTo(page, "settings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#export-btn")]);
  expect(download.suggestedFilename()).toMatch(/^hazfocus-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const text = fs.readFileSync(await download.path(), "utf8");
  const backup = JSON.parse(text);
  expect(backup).toMatchObject({ app: "HazFocus", version: 1, name: "Test Person" });
  expect(backup.tasks).toHaveLength(10);
  expect(backup).not.toHaveProperty("filters");

  // a second browser with only an empty task list
  const context = await browser.newContext();
  const fresh = await context.newPage();
  await openApp(fresh, { "HazFocus-tasks": [] });
  await goTo(fresh, "settings");
  await fresh.setInputFiles("#import-input", file("backup.json", text));
  await expect(fresh.locator("#confirm-message")).toHaveText(/Replace your 0 tasks with the 10 tasks in this backup from/);
  await fresh.click("#confirm-ok-btn");
  await expect(fresh.locator(".toast").last()).toHaveText(/Backup restored/);
  expect(await savedTasks(fresh)).toHaveLength(10);
  await expect(fresh.locator("#profile-name")).toHaveText("Test Person");
  await expect(fresh.locator("#focus-minutes")).toHaveValue("40");
  await context.close();
});

test("cancelling a restore changes nothing", async ({ page }) => {
  await openApp(page);
  await goTo(page, "settings");
  await page.setInputFiles("#import-input", file("b.json", { app: "HazFocus", version: 1, tasks: [] }));
  await page.click("#confirm-cancel-btn");
  expect(await savedTasks(page)).toHaveLength(10);
});

for (const [label, data, message] of [
  ["a file that is not json", "hello", "could not be read"],
  ["json from something else", { hello: 1 }, "not a HazFocus backup"],
  ["a backup from a newer version", { app: "HazFocus", version: 99, tasks: [] }, "newer version"]
]) {
  test(`refuses ${label}`, async ({ page }) => {
    await openApp(page);
    await goTo(page, "settings");
    await page.setInputFiles("#import-input", file("x.json", data));
    await expect(page.locator(".toast").last()).toContainText(message);
    await expect(page.locator("#confirm-modal")).toBeHidden();
    expect(await savedTasks(page)).toHaveLength(10);
  });
}

test("messy backups are cleaned before restoring", async ({ page }) => {
  await openApp(page);
  await goTo(page, "settings");
  await page.setInputFiles("#import-input", file("m.json", {
    app: "HazFocus", version: 1, name: "<b>A very long name that keeps going well past forty</b>", theme: "purple",
    tasks: [{ id: 5, title: "One", priority: "urgent" }, { id: 5, title: "Two" }, null, 42],
    focusSettings: { focus: 999 }, focusHistory: { bad: 1, "2026-11-01": "30" }
  }));
  await page.click("#confirm-ok-btn");
  const tasks = await savedTasks(page);
  expect(tasks).toHaveLength(2);
  expect(new Set(tasks.map((t) => t.id)).size).toBe(2);
  expect(tasks[0].priority).toBe("medium");
  expect((await page.locator("#profile-name").textContent()).length).toBeLessThanOrEqual(40);
  await expect(page.locator("#focus-minutes")).toHaveValue("120");
});
