import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { Pool } from "pg";
const origin = "http://localhost:3101";
const db = new Pool({
  connectionString: "postgresql://postgres:postgres@127.0.0.1:54329/postgres",
  max: 1,
});
test.beforeEach(async () => {
  await db.query("DELETE FROM auth_rate_limits");
});
test.afterAll(() => db.end());
async function shot(page: Page, device: string, state: string) {
  await mkdir("docs/reviews/entry", { recursive: true });
  await page.screenshot({
    path: `docs/reviews/entry/${device}-${state}.png`,
    fullPage: true,
  });
}
async function unlock(page: Page) {
  await page.goto(origin + "/enter");
  await page.getByRole("button", { name: "Open the cottage door" }).click();
  await page.getByLabel("Our family’s magic word").fill("testonly");
  await page
    .getByRole("button", { name: "Open the door", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Who’s coming home?" }),
  ).toBeVisible();
}
test("cottage door stays aligned and opens a private magic-word prompt, then one-tap profiles", async ({
  page,
}, info) => {
  await page.goto(origin);
  await expect(page.locator(".cottage-art")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".cottage-art")
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.locator("input:visible")).toHaveCount(0);
  await expect(
    page.getByText("No matter where we are,", { exact: false }),
  ).toBeVisible();
  const art = (await page.locator(".cottage-art").boundingBox())!;
  const door = (await page
    .getByRole("button", { name: "Open the cottage door" })
    .boundingBox())!;
  expect((door.x - art.x) / art.width).toBeCloseTo(0.409, 2);
  expect((door.y - art.y) / art.height).toBeCloseTo(0.302, 2);
  expect(door.width / art.width).toBeCloseTo(0.14, 2);
  const viewport = page.viewportSize()!;
  expect(door.x).toBeGreaterThanOrEqual(0);
  expect(door.x + door.width).toBeLessThanOrEqual(viewport.width);
  expect(door.y + door.height).toBeLessThanOrEqual(viewport.height);
  await shot(page, info.project.name, "cottage");
  // Hit the artwork's real door center, not a detached navigation control.
  if (info.project.name === "laptop")
    await page.mouse.click(door.x + door.width / 2, door.y + door.height / 2);
  else
    await page.touchscreen.tap(
      door.x + door.width / 2,
      door.y + door.height / 2,
    );
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Our family’s magic word")).toBeFocused();
  await shot(page, info.project.name, "magic-word");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open the cottage door" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByLabel("Our family’s magic word").fill("wrong-word");
  await page
    .getByRole("button", { name: "Open the door", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "door is still dreaming",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Our family’s magic word").fill("testonly");
  await page
    .getByRole("button", { name: "Open the door", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Who’s coming home?" }),
  ).toBeVisible();
  await expect(page.locator(".homecoming-profiles button")).toHaveCount(3);
  for (const name of ["Mom", "Dad", "Mia"])
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await expect(page.locator("input[type=password]:visible")).toHaveCount(0);
  await shot(page, info.project.name, "profiles");
  await page.getByRole("button", { name: "Mom", exact: true }).click();
  await expect(page).toHaveURL(origin + "/home");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Mom");
  await shot(page, info.project.name, "home");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("each profile enters without a credential and profile APIs still require the family challenge", async ({
  page,
}) => {
  const post = (data: unknown) =>
    page.request.post(origin + "/api/auth/profile", {
      headers: { Origin: origin },
      data,
    });
  expect((await post({ key: "mom", remember: false })).status()).toBe(401);
  for (const name of ["Mom", "Dad", "Mia"]) {
    await unlock(page);
    await page.getByLabel("Remember me on this device").uncheck();
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page).toHaveURL(origin + "/home");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(origin + "/");
    await expect(page.getByRole("button", { name: "Open the cottage door" })).toBeVisible();
  }
  expect(
    (
      await post({ key: "mom", remember: false, passcode: "obsolete" })
    ).status(),
  ).toBe(400);
});
