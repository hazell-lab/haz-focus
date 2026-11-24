// creating, editing, completing, searching and deleting tasks
const { test, expect } = require("@playwright/test");
const { openApp, localDate, goTo, savedTasks } = require("./helpers");

test("first visit shows the sample tasks", async ({ page }) => {
  const errors = await openApp(page);
  const tasks = await savedTasks(page);
  expect(tasks.length).toBe(10);
  expect(tasks.filter((t) => t.status === "completed").length).toBe(6);
  expect(errors).toEqual([]);
});

test("the task form checks the title and due date", async ({ page }) => {
  await openApp(page);
  await page.keyboard.press("n");
  await expect(page.locator("#task-modal")).toBeVisible();

  await page.fill("#task-title", "ab");
  await page.fill("#task-due", localDate(-3));
  await page.click("#submit-btn");
  await expect(page.locator("#title-error")).toHaveText("Title must be at least 3 characters.");
  await expect(page.locator("#due-error")).toHaveText("Due date cannot be in the past.");
  await expect(page.locator("#task-title")).toHaveAttribute("aria-invalid", "true");
});

test("add, complete, search and delete a task", async ({ page }) => {
  const errors = await openApp(page, { "HazFocus-tasks": [] });

  // add
  await page.keyboard.press("n");
  await page.fill("#task-title", "Write the test plan");
  await page.selectOption("#task-priority", "high");
  await page.fill("#task-due", localDate(0));
  await page.click("#submit-btn");
  await expect(page.locator("#task-modal")).toBeHidden();
  let tasks = await savedTasks(page);
  expect(tasks).toHaveLength(1);
  expect(tasks[0]).toMatchObject({ title: "Write the test plan", priority: "high", dueDate: localDate(0), status: "todo" });

  // complete from the card
  await goTo(page, "all");
  await page.getByRole("button", { name: "Complete task: Write the test plan" }).click();
  tasks = await savedTasks(page);
  expect(tasks[0].status).toBe("completed");
  expect(tasks[0].completedAt).toBe(localDate(0));

  // search
  await page.fill("#search-input", "test plan");
  await expect(page.locator(".task-card:visible")).toHaveCount(1);
  await page.fill("#search-input", "nothing matches this");
  await expect(page.locator(".task-card:visible")).toHaveCount(0);
  await expect(page.getByText("No matching tasks found.")).toBeVisible();
  await page.fill("#search-input", "");

  // delete with confirmation
  await page.getByRole("button", { name: "Delete task: Write the test plan" }).click();
  await page.click("#confirm-ok-btn");
  expect(await savedTasks(page)).toHaveLength(0);
  expect(errors).toEqual([]);
});

test("the status menu on a card moves it between lanes", async ({ page }) => {
  await openApp(page);
  await goTo(page, "all");
  const card = page.locator("#list-todo .task-card").first();
  const id = Number(await card.getAttribute("data-id"));
  await card.locator("select").selectOption("inprogress");
  await expect(page.locator(`#list-inprogress .task-card[data-id="${id}"]`)).toHaveCount(1);
  const tasks = await savedTasks(page);
  expect(tasks.find((t) => t.id === id).status).toBe("inprogress");
});

test("broken saved data does not break the app", async ({ page }) => {
  const errors = await openApp(page, {
    "HazFocus-tasks": [{ id: 1, title: "<img src=x onerror=alert(1)>", status: "nope", priority: "urgent" }, null, "text"],
    "HazFocus-filters": "{broken",
    "HazFocus-focus": "{broken"
  });
  await goTo(page, "all");
  await expect(page.locator(".task-card")).toHaveCount(1);
  await expect(page.locator(".task-card img")).toHaveCount(0);
  await expect(page.locator(".task-card .task-title")).toHaveText("<img src=x onerror=alert(1)>");
  expect(errors).toEqual([]);
});

test("the page never scrolls sideways", async ({ page }) => {
  await openApp(page);
  for (const view of ["dashboard", "all", "today", "upcoming", "completed", "focus", "settings"]) {
    await goTo(page, view);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${view} overflows`).toBeLessThanOrEqual(0);
  }
});

test("the theme switch is remembered", async ({ page }) => {
  await openApp(page, { "HazFocus-theme": "light" });
  await page.click("#theme-btn");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
