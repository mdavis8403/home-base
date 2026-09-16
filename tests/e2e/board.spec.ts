import { test, expect, type Page } from "@playwright/test";
import { BrowserTestDatabase } from "./database";
import { mkdir } from "node:fs/promises";
const origin = "http://localhost:3101";
// Isolated browser-test database only. No fixture API is installed in the app.
const db = new BrowserTestDatabase();
async function login(page: Page, key: "mom" | "mia" | "dad") {
  const request = page.context().request;
  await request.post(origin + "/api/auth/family", {
    headers: { Origin: origin },
    data: { phrase: "testonly" },
  });
  const r = await request.post(origin + "/api/auth/profile", {
    headers: { Origin: origin },
    data: {
      key,
      remember: false,
    },
  });
  expect(r.ok()).toBe(true);
  await page.goto(origin + "/family-board");
  await expect(
    page.getByRole("heading", { name: "Family Board", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".prompt-paper")).toBeVisible();
}
async function post(page: Page, path: string, data: unknown) {
  return page.context().request.post(origin + "/api/board/" + path, {
    headers: { Origin: origin },
    data,
  });
}
// The board owns a fixed viewport: force the type, reload, and let auto-refresh settle.
async function forceType(page: Page, type: "question" | "photo") {
  await db.query(
    "UPDATE board_prompts SET prompt_type=$1,prompt_text=$2 WHERE id=(SELECT prompt_id FROM board_days LIMIT 1)",
    [
      type,
      type === "question"
        ? "What is the silliest thing that happened today?"
        : "Find a color you would put in our family theme park.",
    ],
  );
  // Keep the reveal in the future so the board is deterministically composable.
  await db.query(
    "UPDATE board_days SET reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','+2 hours')",
  );
  await page.reload();
  await expect(page.locator(".prompt-paper")).toBeVisible();
}
async function snapshot(page: Page, name: string, project: string) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await mkdir("docs/reviews/family-board", { recursive: true });
  await page.screenshot({
    path: `docs/reviews/family-board/${project}-${name}.png`,
    fullPage: true,
  });
}
// The corkboard must never body-scroll; Today's Board must fit the stage on its own.
async function expectFixedBoard(page: Page) {
  const m = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>(".board-stage")!;
    return {
      docHeight: document.documentElement.scrollHeight,
      docWidth: document.documentElement.scrollWidth,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      stageScroll: stage.scrollHeight,
      stageClient: stage.clientHeight,
    };
  });
  // No vertical or horizontal body overflow.
  expect(m.docHeight).toBeLessThanOrEqual(m.innerHeight + 1);
  expect(m.docWidth).toBeLessThanOrEqual(m.innerWidth + 1);
  // Today's Board content fits the stage without an internal scroll.
  expect(m.stageScroll).toBeLessThanOrEqual(m.stageClient + 1);
}
test.beforeEach(async () => {
  await db.query(
    'DELETE FROM board_responses;DELETE FROM media_assets WHERE related_entity_type=\'board\';DELETE FROM board_days;DELETE FROM board_prompts;DELETE FROM auth_rate_limits;UPDATE families SET board_reveal_time=\'23:59\',board_categories=\'["silly","imaginative","reflective","family planning"]\';',
  );
});
test.afterAll(() => db.end());
test("the corkboard is fixed: nav, tagline, and each activity fit the viewport", async ({
  page,
}, info) => {
  await login(page, "mia");
  // Only two board views; the parent and refresh controls are gone.
  await expect(
    page.getByRole("button", { name: "Today’s Board", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Past Boards", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Parent touches" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Refresh board" })).toHaveCount(
    0,
  );
  // The tagline is pinned to the bottom in the exact configured wording.
  const tagline = page.getByText(
    "A little silly. A little sweet. Entirely Us.",
  );
  await expect(tagline).toBeVisible();
  await expect(tagline).toBeInViewport();
  // Internal category tags never appear on the family-facing card; only the
  // activity label (Question of the Day / Photo Drop) and the date show.
  await forceType(page, "question");
  await expect(page.locator(".prompt-paper")).toContainText(
    "Question of the Day",
  );
  await expect(page.locator(".prompt-paper .note-label")).not.toContainText(
    "·",
  );
  for (const word of ["imaginative", "reflective", "family planning"])
    await expect(page.locator(".prompt-paper")).not.toContainText(word);
  // iPad landscape (primary), then laptop/desktop.
  for (const size of [
    { width: 1194, height: 834 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(size);
    // Question: prompt + answer + submit all visible without scrolling.
    await forceType(page, "question");
    await expect(page.locator(".prompt-paper h2")).toBeInViewport();
    await expect(page.getByLabel("Your answer")).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "Tuck mine away" }),
    ).toBeInViewport();
    await expect(tagline).toBeInViewport();
    await expectFixedBoard(page);
    // Photo: prompt + Choose Photo both visible without scrolling.
    await forceType(page, "photo");
    await expect(page.locator(".prompt-paper h2")).toBeInViewport();
    await expect(page.getByLabel("Choose your photo")).toBeInViewport();
    await expectFixedBoard(page);
  }
  // Drawing is retired: it is never offered as an activity.
  await expect(page.getByRole("button", { name: "Start Drawing" })).toHaveCount(
    0,
  );
  // Capture the primary target (iPad landscape) for visual review.
  if (info.project.name === "ipad") {
    await page.setViewportSize({ width: 1194, height: 834 });
    await forceType(page, "question");
    await snapshot(page, "landscape-question", info.project.name);
  }
});
test("three private answers reveal together and become a revisitable memory", async ({
  page,
  browser,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "mia");
  await forceType(page, "question");
  await db.query(
    "UPDATE board_days SET reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','+1 hour')",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Parent touches" }),
  ).toHaveCount(0);
  await snapshot(page, "question", info.project.name);
  const momContext = await browser.newContext(),
    dadContext = await browser.newContext();
  const mom = await momContext.newPage(),
    dad = await dadContext.newPage();
  await login(mom, "mom");
  await login(dad, "dad");
  const board = (
    await (await page.context().request.get(origin + "/api/board")).json()
  ).data.boards[0];
  await mom.getByLabel("Your answer").fill("Probably Something With Steak");
  await mom.getByRole("button", { name: "Tuck mine away" }).click();
  await expect(
    mom.getByText("Yours is tucked away.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Probably Something With Steak")).toHaveCount(0);
  const privateData = await (
    await page.context().request.get(origin + "/api/board")
  ).json();
  expect(privateData.data.boards[0].responses).toEqual([]);
  await page.getByLabel("Your answer").fill("The Flying Pancake");
  await page.getByRole("button", { name: "Tuck mine away" }).click();
  await expect(
    page.getByText("Yours is tucked away.", { exact: true }),
  ).toBeVisible();
  await snapshot(page, "private-response", info.project.name);
  await expect(page.getByText("Probably Something With Steak")).toHaveCount(0);
  await dad.getByLabel("Your answer").fill("Chez Matthew");
  await dad.getByRole("button", { name: "Tuck mine away" }).click();
  // The open room refreshes by itself, without clicking a reveal button.
  await expect(
    page.getByRole("heading", { name: "The surprise is open!" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".board-answer")).toHaveCount(3);
  await snapshot(page, "revealed", info.project.name);
  await page.reload();
  await expect(page.locator(".board-answer")).toHaveCount(3);
  await db.query(
    "UPDATE board_days SET date=date(date,'-1 day'),reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day') WHERE id=$1",
    [board.id],
  );
  await page.reload();
  await expect(page.locator(".prompt-paper")).toBeVisible();
  await page.getByRole("button", { name: "Past Boards", exact: true }).click();
  await expect(page.locator(".history-board")).toHaveCount(1);
  await snapshot(page, "history", info.project.name);
  await page.locator(".history-board").click();
  await expect(page.locator(".board-answer")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Tuck mine away" }),
  ).toHaveCount(0);
  // Back out to the full history, still inside the fixed board world.
  await page.getByRole("button", { name: "← All Past Boards" }).click();
  await expect(page.locator(".history-board")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // The clubhouse return is still one tap away.
  await expect(
    page.getByRole("link", { name: "THE CLUBHOUSE" }),
  ).toHaveAttribute("href", "/home");
  expect(errors).toEqual([]);
  await momContext.close();
  await dadContext.close();
});
test("time-based reveal opens automatically, and parent APIs stay protected", async ({
  page,
}, info) => {
  await login(page, "mom");
  await forceType(page, "question");
  await db.query(
    "UPDATE board_days SET reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','+1 hour')",
  );
  await page.reload();
  await page.getByLabel("Your answer").fill("A restaurant for dragons");
  await page.getByRole("button", { name: "Tuck mine away" }).click();
  await expect(
    page.getByText("Yours is tucked away.", { exact: true }),
  ).toBeVisible();
  await db.query(
    "UPDATE board_days SET reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 second')",
  );
  await expect(
    page.getByRole("heading", { name: "The surprise is open!" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".board-answer")).toHaveCount(1);
  await snapshot(page, "revealed-single", info.project.name);
  // Parent touches no longer live on the family-facing board.
  await expect(
    page.getByRole("button", { name: "Parent touches" }),
  ).toHaveCount(0);
  // Custom prompts still require an unlocked parent session (backend intact).
  const unverified = await post(page, "prompt", {
    id: crypto.randomUUID(),
    type: "question",
    category: "silly",
    text: "What would our sofa name its spaceship?",
  });
  expect(unverified.status()).toBe(403);
  const reauth = await page
    .context()
    .request.post(origin + "/api/auth/reauth", {
      headers: { Origin: origin },
      data: { adminKey: "test-admin-key-only" },
    });
  expect(reauth.ok()).toBe(true);
  // Drawing is no longer a creatable prompt type, even for a verified parent.
  const drawingPrompt = await post(page, "prompt", {
    id: crypto.randomUUID(),
    type: "drawing",
    category: "silly",
    text: "Draw a home for a very big dragon.",
  });
  expect(drawingPrompt.status()).toBe(400);
  const promptId = crypto.randomUUID();
  const added = await post(page, "prompt", {
    id: promptId,
    type: "question",
    category: "silly",
    text: "What would our sofa name its spaceship?",
  });
  expect(added.ok()).toBe(true);
  const saved = await post(page, "settings", {
    revealTime: "20:00",
    categories: ["silly", "imaginative"],
  });
  expect(saved.ok()).toBe(true);
  const data = await (
    await page.context().request.get(origin + "/api/board")
  ).json();
  expect(data.data.revealTime).toBe("20:00");
  expect(
    data.data.customPrompts.some((p: { id: string }) => p.id === promptId),
  ).toBe(true);
  // Cross-origin writes are still rejected.
  const csrf = await page
    .context()
    .request.post(origin + "/api/board/settings", {
      headers: { Origin: "https://elsewhere.example" },
      data: { revealTime: "19:00", categories: ["silly"] },
    });
  expect(csrf.status()).toBe(403);
});
test("photo preview keeps the board fixed and drawing is gone", async ({
  page,
}, info) => {
  await login(page, "mia");
  await forceType(page, "photo");
  await page
    .getByLabel("Choose your photo")
    .setInputFiles("tests/fixtures/note.png");
  await page
    .getByLabel("Describe your picture")
    .fill("A little picture to make us smile");
  await expect(
    page.getByAltText("A little picture to make us smile"),
  ).toBeVisible();
  // On iPad/laptop, preview + description + submit fit without any scroll;
  // the narrower phone may use the stage's contained scroll.
  if (info.project.name !== "phone") {
    await expect(
      page.getByRole("button", { name: "Tuck mine away" }),
    ).toBeInViewport();
  }
  await snapshot(page, "photo-preview", info.project.name);
  await page.getByRole("button", { name: "Tuck mine away" }).click();
  await expect(
    page.getByText("Yours is tucked away.", { exact: true }),
  ).toBeVisible();
  const child = await post(page, "settings", {
    revealTime: "19:00",
    categories: ["silly"],
  });
  expect(child.status()).toBe(403);
  // Drawing is retired: no Start Drawing control, no doodle canvas, anywhere.
  await forceType(page, "photo");
  await expect(page.getByRole("button", { name: "Start Drawing" })).toHaveCount(
    0,
  );
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
