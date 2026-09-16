import { test, expect, type Page } from "@playwright/test";
import { BrowserTestDatabase } from "./database";
import { mkdir } from "node:fs/promises";
const origin = "http://localhost:3101";
const db = new BrowserTestDatabase();
async function login(page: Page, key: "mom" | "mia" | "dad" = "mia") {
  const request = page.context().request;
  await request.post(origin + "/api/auth/family", {
    headers: { Origin: origin },
    data: { phrase: "testonly" },
  });
  const r = await request.post(origin + "/api/auth/profile", {
    headers: { Origin: origin },
    data: { key, remember: false },
  });
  expect(r.ok()).toBe(true);
  await page.goto(origin + "/our-story");
  await expect(
    page.getByRole("heading", { name: "Our Story", exact: true }),
  ).toBeVisible();
}
async function snapshot(page: Page, name: string, project: string) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await mkdir("docs/reviews/our-story", { recursive: true });
  await page.screenshot({
    path: `docs/reviews/our-story/${project}-${name}.png`,
    fullPage: true,
  });
}
async function beginNightStory(page: Page, project?: string) {
  await page.getByRole("button", { name: "Start a new story" }).click();
  await expect(page.getByText("What are we telling tonight?")).toBeVisible();
  if (project) await snapshot(page, "setup", project);
  await page.getByRole("button", { name: "Mystery", exact: true }).click();
  await page.getByRole("button", { name: "Everyone", exact: true }).click();
  await page.getByRole("button", { name: "Funny", exact: true }).click();
  await page.getByRole("button", { name: "Story Night", exact: true }).click();
  await page.getByRole("button", { name: "Begin our story" }).click();
  await expect(page.locator(".opening-title")).toBeVisible({ timeout: 15000 });
}
test.beforeEach(async () => {
  await db.query("DELETE FROM story_pages; DELETE FROM story_books;");
});
test.afterAll(() => db.end());
test("the Clubhouse enters Our Story, and the storybook returns to it", async ({
  page,
}) => {
  await login(page);
  // Return affordance points back to the Clubhouse.
  await expect(
    page.getByRole("link", { name: "THE CLUBHOUSE" }),
  ).toHaveAttribute("href", "/home");
  // The clubhouse's storybook hotspot opens Our Story.
  await page.goto(origin + "/home");
  const entry = page.getByRole("button", { name: /storybook/i }).first();
  await expect(entry).toBeVisible();
  await entry.click();
  await page.waitForURL("**/our-story", { timeout: 15000 });
  await expect(page.getByText("A story only we could tell.")).toBeVisible();
});
test("a full storybook flows from setup to a finished book on the shelf", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await expect(page.getByText("A story only we could tell.")).toBeVisible();
  await snapshot(page, "landing", info.project.name);
  await beginNightStory(page, info.project.name);
  await snapshot(page, "opening", info.project.name);
  // Opening choice turn.
  await expect(page.locator(".story-choice")).toHaveCount(3);
  await snapshot(page, "choice-turn", info.project.name);
  await page
    .getByRole("button", { name: /climb in through a window/i })
    .click();
  // Family-input turn.
  const field = page.getByLabel("Add to the story");
  await expect(field).toBeVisible({ timeout: 15000 });
  await snapshot(page, "input-turn", info.project.name);
  const item = "a wind-up dinosaur that only walks backward";
  await field.fill(item);
  await page.getByRole("button", { name: /add it to the story/i }).click();
  // Chapter divider.
  await expect(page.locator(".chapter-divider")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("CHAPTER 2", { exact: true })).toBeVisible();
  await snapshot(page, "chapter", info.project.name);
  await page.getByRole("button", { name: /turn the page/i }).click();
  // The family's exact words are woven into the next page.
  await expect(page.locator(".story-book")).toContainText(item, {
    timeout: 15000,
  });
  await page.getByRole("button", { name: /eat the suspicious/i }).click();
  // Ending.
  await expect(page.getByRole("heading", { name: "The End" })).toBeVisible({
    timeout: 15000,
  });
  await snapshot(page, "ending", info.project.name);
  await page
    .getByRole("button", { name: "Put this book on our shelf" })
    .click();
  // Our Books shelf.
  await expect(page.getByText("OUR BOOKS")).toBeVisible();
  await expect(page.locator(".book-cover")).toHaveCount(1);
  await snapshot(page, "books", info.project.name);
  // Reread is read-only: choices become recollections, not live buttons.
  await page.locator(".book-cover").first().click();
  await expect(page.locator(".story-book")).toBeVisible();
  await expect(page.locator(".story-choice")).toHaveCount(0);
  // Flip through and confirm the family's words survived.
  for (let i = 0; i < 5; i++) {
    if (
      await page
        .getByText(item)
        .isVisible()
        .catch(() => false)
    )
      break;
    await page.getByRole("button", { name: /next page/i }).click();
  }
  await expect(page.getByText(item)).toBeVisible();
  await snapshot(page, "reread", info.project.name);
  expect(errors).toEqual([]);
});
test("an unfinished story resumes and shows under Still Being Written", async ({
  page,
}) => {
  await login(page);
  await beginNightStory(page);
  await page.getByRole("button", { name: /knock politely/i }).click();
  await expect(page.getByLabel("Add to the story")).toBeVisible({
    timeout: 15000,
  });
  // Leave and come back: Continue resumes at the latest page.
  await page.goto(origin + "/our-story");
  await expect(
    page.getByRole("button", { name: /Continue our story/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Continue our story/i }).click();
  await expect(page.getByLabel("Add to the story")).toBeVisible({
    timeout: 15000,
  });
  // It is also listed as in progress under Our Books.
  await page.goto(origin + "/our-story");
  await page.getByRole("button", { name: /Our books/i }).click();
  await expect(
    page.getByRole("region", { name: "Still being written" }),
  ).toBeVisible();
});
test("iPad landscape uses an open-book spread; phone uses a single page", async ({
  page,
}, info) => {
  await login(page);
  await beginNightStory(page);
  const layout = async () =>
    page.evaluate(() => {
      const leaves = document.querySelectorAll<HTMLElement>(
        ".book-spread .book-leaf",
      );
      const a = leaves[0].getBoundingClientRect();
      const b = leaves[1].getBoundingClientRect();
      return {
        sideBySide: Math.abs(a.top - b.top) < 4 && b.left > a.right - 2,
      };
    });
  await page.setViewportSize({ width: 1194, height: 834 });
  await expect(page.locator(".book-spread")).toBeVisible();
  expect((await layout()).sideBySide).toBe(true);
  await snapshot(page, "landscape-open-book", info.project.name);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".book-spread")).toBeVisible();
  expect((await layout()).sideBySide).toBe(false);
  // No horizontal body overflow on the reading screen.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await snapshot(page, "phone-page", info.project.name);
});
