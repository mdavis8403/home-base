import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { BrowserTestDatabase } from "./database";
import { mkdir } from "node:fs/promises";
const origin = "http://localhost:3101";
const db = new BrowserTestDatabase();

async function auth(request: APIRequestContext, key: "mom" | "dad" | "mia") {
  await request.post(origin + "/api/auth/family", {
    headers: { Origin: origin },
    data: { phrase: "testonly" },
  });
  const r = await request.post(origin + "/api/auth/profile", {
    headers: { Origin: origin },
    data: { key, remember: false },
  });
  expect(r.ok()).toBe(true);
}
async function login(page: Page, key: "mom" | "dad" | "mia" = "mia") {
  await auth(page.context().request, key);
  await page.goto(origin + "/our-story");
  await expect(
    page.getByRole("heading", { name: "Our Story", exact: true }),
  ).toBeVisible();
}
async function storyGet(request: APIRequestContext, q = "") {
  const r = await request.get(origin + "/api/story" + q);
  return (await r.json()).data;
}
async function storyPost(
  request: APIRequestContext,
  path: string,
  body: unknown,
) {
  const r = await request.post(origin + "/api/story" + path, {
    headers: { Origin: origin },
    data: body,
  });
  return (await r.json()).data;
}
async function answerAllApi(
  request: APIRequestContext,
  sessionId: string,
  customText?: string,
) {
  for (let i = 0; i < 10; i++) {
    const v = await storyGet(request, "?mixer=" + sessionId);
    if (v.me.sealed) break;
    const q = v.me.current;
    const body: Record<string, unknown> = {
      sessionId,
      questionId: q.id,
      optionId: q.options[i % q.options.length].id,
    };
    if (customText && i === 4) {
      body.optionId = "custom";
      body.custom = customText;
    }
    await storyPost(request, "/mixer-answer", body);
  }
}
// Seed a whole finished story through the real API (mixer → reveal → book).
async function buildStory(request: APIRequestContext): Promise<string> {
  await auth(request, "mia");
  const sessionId = (await storyPost(request, "/mixer-start", { id: randomUUID() }))
    .sessionId;
  for (const key of ["mia", "dad", "mom"] as const) {
    await auth(request, key);
    await answerAllApi(request, sessionId);
  }
  const { storyId } = await storyPost(request, "/mixer-reveal", {
    sessionId,
    id: randomUUID(),
  });
  return storyId;
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
// Play from the opening to "The End", taking the first choice at each decision
// and turning the page through the narration scenes.
async function playToEnd(page: Page) {
  for (let i = 0; i < 14; i++) {
    if (
      await page
        .getByRole("heading", { name: "The End" })
        .isVisible()
        .catch(() => false)
    )
      return;
    const choices = page.locator(".story-choice");
    if ((await choices.count()) > 0) await choices.first().click();
    else
      await page
        .getByRole("button", { name: /turn the page/i })
        .first()
        .click();
    await page.waitForTimeout(1100);
  }
}

test.beforeEach(async () => {
  await db.query(
    "DELETE FROM story_pages; DELETE FROM story_books; DELETE FROM story_mixer_answers; DELETE FROM story_mixer_assignments; DELETE FROM story_mixer_sessions;",
  );
});
test.afterAll(() => db.end());

test("the Clubhouse enters Our Story, and the desk invites a new story", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "THE CLUBHOUSE" }),
  ).toHaveAttribute("href", "/home");
  await expect(page.getByText("A story only we could tell.")).toBeVisible();
  await page.goto(origin + "/home");
  const entry = page.getByRole("button", { name: /storybook/i }).first();
  await expect(entry).toBeVisible();
  await entry.click();
  await page.waitForURL("**/our-story", { timeout: 15000 });
});

test("the Story Mixer builds a titled book the family reads to the end", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "mia");
  const project = info.project.name;
  await snapshot(page, "landing", project);

  // Start the mixer and answer Mia's ten cards through the UI.
  await page.getByRole("button", { name: "Start a new story" }).click();
  await expect(page.locator(".mixer-question")).toBeVisible({ timeout: 15000 });
  await snapshot(page, "mixer-card", project);
  for (let i = 0; i < 10; i++) {
    const sealed = await page
      .getByText("YOUR STORY INGREDIENTS ARE SEALED")
      .isVisible()
      .catch(() => false);
    if (sealed) break;
    if (i === 3) {
      // The "make up my own" state.
      await page.getByRole("button", { name: "Make up my own" }).click();
      const field = page.getByLabel("Your own answer");
      await expect(field).toBeVisible();
      await field.fill("a haunted rubber chicken named Gerald");
      await snapshot(page, "mixer-custom", project);
      await page.getByRole("button", { name: /seal it in/i }).click();
    } else {
      await page.locator(".mixer-option").first().click();
    }
    await page.waitForTimeout(200);
  }
  await expect(page.getByText("YOUR STORY INGREDIENTS ARE SEALED")).toBeVisible({
    timeout: 15000,
  });
  await snapshot(page, "sealed-one", project);

  // Seed Dad and Mom through the API; the page becomes Mom.
  const sessionId = (await storyGet(page.context().request)).mixer.sessionId;
  await auth(page.context().request, "dad");
  await answerAllApi(page.context().request, sessionId);
  await auth(page.context().request, "mom");
  await answerAllApi(page.context().request, sessionId);

  await page.goto(origin + "/our-story");
  // The closed book opens the desk's "ready" state; then the reveal begins.
  await page.getByRole("button", { name: "Open Our Story" }).click();
  await expect(page.getByText("ALL THREE ENVELOPES ARE SEALED")).toBeVisible({
    timeout: 15000,
  });
  await snapshot(page, "sealed-all", project);
  await page.getByRole("button", { name: "Open Our Story" }).click();
  await expect(page.locator(".reveal-body")).toBeVisible({ timeout: 15000 });
  await snapshot(page, "reveal", project);
  // Walk the paced reveal to the title.
  for (let i = 0; i < 10; i++) {
    const title = page.getByRole("button", { name: /reveal our title/i });
    if (await title.isVisible().catch(() => false)) {
      await snapshot(page, "reveal-final", project);
      await title.click();
      break;
    }
    await page
      .getByRole("button", { name: /next|and the rest/i })
      .first()
      .click();
    await page.waitForTimeout(120);
  }
  await expect(page.locator(".title-name")).toBeVisible();
  await snapshot(page, "title", project);
  await page.getByRole("button", { name: /bind the book/i }).click();
  await expect(page.locator(".closed-book")).toBeVisible();
  await snapshot(page, "closed-book", project);
  await page.getByRole("button", { name: /open the book/i }).click();

  // The opening spread of the generated book.
  await expect(page.getByText("CHAPTER ONE")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".story-plate-frame")).toHaveCount(0);
  await snapshot(page, "opening", project);
  // Reach the first decision and snapshot it.
  await page.getByRole("button", { name: /turn the page/i }).first().click();
  await page.waitForTimeout(1100);
  await page.getByRole("button", { name: /turn the page/i }).first().click();
  await page.waitForTimeout(1100);
  await expect(page.locator(".story-choice")).toHaveCount(3);
  await snapshot(page, "decision", project);
  await playToEnd(page);
  await expect(page.getByRole("heading", { name: "The End" })).toBeVisible({
    timeout: 15000,
  });
  await snapshot(page, "ending", project);

  // Onto the shelf, then reread as recollections (no live choices).
  await page.getByRole("button", { name: "Put this book on our shelf" }).click();
  await expect(page.getByText("OUR BOOKS")).toBeVisible();
  await expect(page.locator(".book-cover")).toHaveCount(1);
  await snapshot(page, "books", project);
  await page.locator(".book-cover").first().click();
  await expect(page.locator(".story-book")).toBeVisible();
  await expect(page.locator(".story-choice")).toHaveCount(0);
  await snapshot(page, "reread", project);
  expect(errors).toEqual([]);
});

test("a person cannot see another's ingredients before the reveal", async ({
  page,
}) => {
  const request = page.context().request;
  await auth(request, "mia");
  const sessionId = (await storyPost(request, "/mixer-start", { id: randomUUID() }))
    .sessionId;
  // Mia answers one card.
  const mv = await storyGet(request, "?mixer=" + sessionId);
  await storyPost(request, "/mixer-answer", {
    sessionId,
    questionId: mv.me.current.id,
    optionId: mv.me.current.options[0].id,
  });
  // Dad sees only his own (empty) answers and a bare count for Mia.
  await auth(request, "dad");
  const dv = await storyGet(request, "?mixer=" + sessionId);
  expect(dv.me.key).toBe("dad");
  expect(dv.me.answered).toBe(0);
  expect(dv.me.answers).toHaveLength(0);
  expect(dv.family.find((f: { key: string }) => f.key === "mia").answered).toBe(
    1,
  );
  // Cannot reveal before all three are sealed.
  const reveal = await page.context().request.post(
    origin + "/api/story/mixer-reveal",
    { headers: { Origin: origin }, data: { sessionId, id: randomUUID() } },
  );
  expect(reveal.ok()).toBe(false);
});

test("iPad landscape uses an open-book spread; phone uses a single page", async ({
  page,
}, info) => {
  await buildStory(page.context().request);
  await page.goto(origin + "/our-story");
  await page.getByRole("button", { name: /Open Our Story|Continue our story/i }).click();
  await expect(page.locator(".book-leaf").first()).toBeVisible({
    timeout: 15000,
  });
  const layout = async () =>
    page.evaluate(() => {
      const leaves = document.querySelectorAll<HTMLElement>(
        ".book-spread .book-leaf",
      );
      if (leaves.length < 2) return { sideBySide: false };
      const a = leaves[0].getBoundingClientRect();
      const b = leaves[1].getBoundingClientRect();
      return { sideBySide: b.left >= a.right - 4 };
    });
  await page.setViewportSize({ width: 1194, height: 834 });
  await expect(page.locator(".book-leaf").first()).toBeVisible();
  await expect.poll(async () => (await layout()).sideBySide).toBe(true);
  // No body scroll on iPad landscape reading.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight + 1,
    ),
  ).toBe(true);
  await snapshot(page, "landscape-open-book", info.project.name);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".book-leaf").first()).toBeVisible();
  await expect.poll(async () => (await layout()).sideBySide).toBe(false);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await snapshot(page, "phone-page", info.project.name);
});
