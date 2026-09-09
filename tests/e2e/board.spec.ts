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
test.beforeEach(async () => {
  await db.query(
    'DELETE FROM board_responses;DELETE FROM media_assets WHERE related_entity_type=\'board\';DELETE FROM board_days;DELETE FROM board_prompts;DELETE FROM auth_rate_limits;UPDATE families SET board_reveal_time=\'23:59\',board_categories=\'["silly","imaginative","reflective","family planning"]\';',
  );
});
test.afterAll(() => db.end());
test("three private answers reveal together and become a revisitable memory", async ({
  page,
  browser,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "mia");
  await db.query(
    "UPDATE board_days SET reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','+1 hour')",
  );
  await page.getByRole("button", { name: "Refresh board" }).click();
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
  await page.getByRole("button", { name: "Refresh board" }).click();
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
  await expect(
    page.getByText("Photo Drop", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Past Boards", exact: true }).click();
  await expect(page.locator(".history-board")).toHaveCount(1);
  await snapshot(page, "history", info.project.name);
  await page.locator(".history-board").click();
  await expect(page.locator(".board-answer")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Tuck mine away" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await momContext.close();
  await dadContext.close();
});
test("time-based reveal opens automatically with one answer and protects parent controls", async ({
  page,
}, info) => {
  await login(page, "mom");
  await db.query(
    "UPDATE board_days SET reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','+1 hour')",
  );
  await page.getByRole("button", { name: "Refresh board" }).click();
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
  await page.getByRole("button", { name: "Parent touches" }).click();
  await page
    .getByLabel("Your custom prompt")
    .fill("What would our sofa name its spaceship?");
  await page.getByRole("button", { name: "Add custom prompt" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "confirm the administration key",
  );
  await page.getByLabel("Administration key").fill("test-admin-key-only");
  await page
    .getByRole("button", { name: "Confirm administration key" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Administration key confirmed",
  );
  await page.getByRole("button", { name: "Add custom prompt" }).click();
  await expect(page.locator(".custom-prompts")).toContainText(
    "What would our sofa name its spaceship?",
  );
  await page.getByLabel("Reveal time", { exact: true }).fill("20:00");
  await page.getByRole("button", { name: "Save board preferences" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Saved for the next board",
  );
  await snapshot(page, "parent-settings", info.project.name);
  const csrf = await page
    .context()
    .request.post(origin + "/api/board/settings", {
      headers: { Origin: "https://elsewhere.example" },
      data: { revealTime: "19:00", categories: ["silly"] },
    });
  expect(csrf.status()).toBe(403);
});
test("photo preview and shared drawing canvas, optional gentle timer, private R2 storage", async ({
  page,
}, info) => {
  await login(page, "mia");
  const setType = async (type: string) => {
    await db.query(
      "UPDATE board_prompts SET prompt_type=$1,prompt_text=$2 WHERE id=(SELECT prompt_id FROM board_days LIMIT 1)",
      [
        type,
        type === "photo"
          ? "Take a picture of something that made you smile."
          : "Draw a tiny home for a very big dragon.",
      ],
    );
    await page.reload();
  };
  await setType("photo");
  await page
    .getByLabel("Choose your photo")
    .setInputFiles("tests/fixtures/note.png");
  await page
    .getByLabel("Describe your picture")
    .fill("A little picture to make us smile");
  await expect(
    page.getByAltText("A little picture to make us smile"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tuck mine away" }).click();
  await expect(
    page.getByText("Yours is tucked away.", { exact: true }),
  ).toBeVisible();
  await snapshot(page, "photo-preview", info.project.name);
  const child = await post(page, "settings", {
    revealTime: "19:00",
    categories: ["silly"],
  });
  expect(child.status()).toBe(403);
  await db.query(
    "DELETE FROM board_responses; DELETE FROM media_assets WHERE related_entity_type='board'",
  );
  await setType("drawing");
  await expect(page.getByLabel("Play with a 60-second timer")).toBeChecked();
  await page.clock.install();
  await page.getByRole("button", { name: "Start timer", exact: true }).click();
  await page.clock.fastForward(60_100);
  await expect(
    page.getByText("Ding! Keep drawing if you like. This is just for fun."),
  ).toBeVisible();
  await page.getByLabel("Play with a 60-second timer").uncheck();
  await expect(page.getByRole("timer")).toHaveCount(0);
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 70, { steps: 5 });
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeEnabled();
  await snapshot(page, "drawing", info.project.name);
  await page.getByRole("button", { name: "Use this drawing" }).click();
  await page
    .getByLabel("Describe your picture")
    .fill("A very small dragon house");
  await expect(page.getByAltText("A very small dragon house")).toBeVisible();
  await page.getByRole("button", { name: "Choose again" }).click();
  await page
    .getByLabel("Or choose a drawing file")
    .setInputFiles("tests/fixtures/note.png");
  await expect(page.getByAltText("A very small dragon house")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
