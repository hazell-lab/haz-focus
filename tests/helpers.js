// shared helpers for the tests
const { expect } = require("@playwright/test");

// open the app with empty storage, plus optional saved values
async function openApp(page, saved = {}) {
  await page.addInitScript((values) => {
    // only on the first load, so reloads keep what the test saved
    if (sessionStorage.getItem("test-started")) return;
    sessionStorage.setItem("test-started", "1");
    localStorage.clear();
    for (const [key, value] of Object.entries(values)) {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    }
  }, saved);

  // fail the test on any script error
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("./");
  await expect(page.locator("#greeting-text")).not.toBeEmpty();
  return errors;
}

// today as yyyy-mm-dd in local time, like the app
function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

// go to a view through the app, works on desktop and phone
async function goTo(page, view) {
  await page.evaluate((name) => setView(name), view);
}

// read the saved tasks
function savedTasks(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("HazFocus-tasks") || "[]"));
}

module.exports = { openApp, localDate, goTo, savedTasks };
