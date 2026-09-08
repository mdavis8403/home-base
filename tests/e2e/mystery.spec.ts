import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { Pool } from "pg";
import { readdir, readFile, mkdir } from "node:fs/promises";
import type { MysteryPackage } from "../../src/lib/shared/mystery/schema";
import type { GameView, CaseCard } from "../../src/lib/shared/mystery/types";
const origin = "http://localhost:3101";
const db = new Pool({
  connectionString: "postgresql://postgres:postgres@127.0.0.1:54329/postgres",
  max: 1,
});
const cases: MysteryPackage[] = [];
test.beforeAll(async () => {
  for (const f of (await readdir("content/mysteries"))
    .filter((f) => /^\d.*json$/.test(f))
    .sort())
    cases.push(JSON.parse(await readFile("content/mysteries/" + f, "utf8")));
});
test.beforeEach(async () => {
  await db.query(
    "DELETE FROM mystery_events;DELETE FROM mystery_session_players;DELETE FROM mystery_sessions;DELETE FROM mysteries;DELETE FROM auth_rate_limits;",
  );
});
test.afterAll(() => db.end());
async function login(page: Page, key: "mia" | "mom" | "dad") {
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
  await page.goto(origin + "/mystery-club");
  await expect(page.locator(".case-file")).toHaveCount(5);
}
async function post(page: Page, action: string, body: unknown) {
  return page.context().request.post(origin + "/api/mystery/" + action, {
    headers: { Origin: origin },
    data: body,
  });
}
async function game(page: Page, id: string): Promise<GameView> {
  return (
    await (
      await page.context().request.get(origin + "/api/mystery?session=" + id)
    ).json()
  ).data;
}
async function shot(page: Page, project: string, name: string) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await mkdir("docs/reviews/mystery-club", { recursive: true });
  await page.screenshot({
    path: `docs/reviews/mystery-club/${project}-${name}.png`,
    fullPage: true,
  });
}
async function solveUI(page: Page, scene: MysteryPackage["scenes"][number]) {
  await expect(page.locator(".scene-page .section-heading h2")).toHaveText(
    scene.title,
    { timeout: 10000 },
  );
  const p = scene.puzzle;
  if (p.type === "choice")
    await page
      .getByRole("radio", {
        name: p.options.find((o) => o.id === p.solution)!.label,
        exact: true,
      })
      .check();
  if (p.type === "hotspot")
    await page
      .getByRole("radio", {
        name: p.art.objects.find((o) => o.id === p.solution)!.label,
        exact: true,
      })
      .check();
  if (p.type === "code" || p.type === "cipher")
    await page
      .getByRole("textbox", { name: "Your answer", exact: true })
      .fill(p.solution);
  if (p.type === "combination")
    for (const [i, label] of p.fields.entries())
      await page.getByLabel(label, { exact: true }).fill(p.solution[i]);
  if (p.type === "matching")
    for (const [i, item] of p.left.entries())
      await page
        .getByLabel(item.label, { exact: true })
        .selectOption(p.solution[i]);
  if (p.type === "ordering" || p.type === "tiles") {
    // Touch-friendly select-and-swap controls solve the same visual arrangement as dragging.
    const ids = p.options.map((o) => o.id);
    for (let i = 0; i < p.solution.length; i++) {
      const target = ids.indexOf(p.solution[i]);
      if (i === target) continue;
      await page
        .getByRole("button", {
          name: "Select " + p.options.find((o) => o.id === ids[i])!.label,
          exact: true,
        })
        .click();
      await page
        .getByRole("button", {
          name: "Select " + p.options.find((o) => o.id === ids[target])!.label,
          exact: true,
        })
        .click();
      [ids[i], ids[target]] = [ids[target], ids[i]];
    }
  }
  await page
    .getByRole("button", { name: "Try our answer", exact: false })
    .click();
  await expect(page.locator(".case-resolution")).toBeVisible();
}
for (let index = 0; index < 5; index++)
  test(`launch case ${index + 1} plays through with three distinct screens`, async ({
    page,
    browser,
  }, info) => {
    test.setTimeout(180000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const contexts: BrowserContext[] = [];
    try {
      await login(page, "mia");
      if (index === 0) await shot(page, info.project.name, "library");
      const momContext = await browser.newContext(),
        dadContext = await browser.newContext();
      contexts.push(momContext, dadContext);
      const mom = await momContext.newPage(),
        dad = await dadContext.newPage();
      await login(mom, "mom");
      await login(dad, "dad");
      const cards = (
        await (await page.context().request.get(origin + "/api/mystery")).json()
      ).data as CaseCard[];
      const card = cards.find((c) => c.slug === cases[index].slug)!;
      await page
        .locator(".case-file")
        .filter({
          has: page.getByRole("heading", { name: card.title, exact: true }),
        })
        .getByRole("button", { name: "New Case", exact: true })
        .click();
      await expect(page.locator(".game-lobby")).toBeVisible();
      const id = new URL(page.url()).searchParams.get("session")!;
      await page.getByRole("button", { name: "Join this case" }).click();
      await expect(
        page.getByRole("button", { name: "I’m Ready" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "I’m Ready" }).click();
      for (const other of [mom, dad]) {
        await other.goto(origin + "/mystery-club?session=" + id);
        await other.getByRole("button", { name: "Join this case" }).click();
        await expect(
          other.getByRole("button", { name: "I’m Ready" }),
        ).toBeVisible();
        await other.getByRole("button", { name: "I’m Ready" }).click();
      }
      await expect(
        page.getByRole("button", { name: "Begin case" }),
      ).toBeEnabled({ timeout: 10000 });
      if (index === 0) await shot(page, info.project.name, "lobby");
      await page.getByRole("button", { name: "Begin case" }).click();
      for (const [sceneIndex, scene] of cases[index].scenes.entries()) {
        await expect(
          page.locator(".scene-page .section-heading h2"),
        ).toHaveText(scene.title, { timeout: 10000 });
        const miaView = await game(page, id),
          momView = await game(mom, id),
          dadView = await game(dad, id);
        expect(miaView.scene?.private).toEqual(scene.private.mia);
        expect(momView.scene?.private).toEqual(scene.private.mom);
        expect(dadView.scene?.private).toEqual(scene.private.dad);
        expect(JSON.stringify(miaView)).not.toContain('"solution":');
        expect(JSON.stringify(miaView)).not.toContain(
          scene.private.mom[0].text,
        );
        expect(JSON.stringify(momView)).not.toContain(
          scene.private.dad[0].text,
        );
        if (index === 0 && sceneIndex === 0) {
          await shot(page, info.project.name, "private-clue");
          await page.getByRole("button", { name: "Ask for Hint 1" }).click();
          await expect(
            page.getByText(scene.puzzle.hints[0], { exact: true }),
          ).toBeVisible();
          await shot(page, info.project.name, "hints");
          const before = (await game(page, id)).revision;
          await page.reload();
          await expect(
            page.getByText(scene.puzzle.hints[0], { exact: true }),
          ).toBeVisible();
          expect((await game(page, id)).revision).toBe(before);
        }
        if (index === 0 && sceneIndex === 1)
          await shot(page, info.project.name, "shared-puzzle");
        if (
          [...scene.shared, ...scene.private.mia].some((clue) => clue.tones)
        ) {
          await page
            .getByRole("button", { name: "Play original clue" })
            .click();
          await expect(
            page.getByRole("button", { name: "Stop sound" }),
          ).toBeVisible();
          await page.getByRole("button", { name: "Stop sound" }).click();
          await expect(
            page.getByRole("button", { name: "Play original clue" }),
          ).toBeVisible();
        }
        await solveUI(page, scene);
        // Everyone sees the resolution without manually refreshing. Mom advances the shared scene.
        await expect(mom.locator(".case-resolution")).toBeVisible({
          timeout: 10000,
        });
        await mom
          .getByRole("button", {
            name: scene.finale ? "Close the case" : "Turn the page",
            exact: false,
          })
          .click();
      }
      await expect(
        page.getByRole("heading", { name: "Case solved!", exact: true }),
      ).toBeVisible({ timeout: 10000 });
      expect((await game(dad, id)).summary?.ending).toBe(cases[index].ending);
      if (index === 0) await shot(page, info.project.name, "complete");
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Case solved!", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Back to our case library" })
        .click();
      await page
        .getByRole("button", { name: "Solved Cases", exact: true })
        .click();
      await expect(page.locator(".case-file")).toHaveCount(1);
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    } finally {
      for (const c of contexts) await c.close();
    }
  });
test("parent imports validate before publish and child requests cannot bypass permissions", async ({
  page,
}) => {
  await login(page, "mia");
  expect((await post(page, "preview", cases[0])).status()).toBe(403);
  expect(
    (
      await post(page, "publish", { package: cases[0], published: true })
    ).status(),
  ).toBe(403);
  await login(page, "mom");
  await page.getByRole("button", { name: "Parent case desk" }).click();
  await page.getByLabel("Administration key").fill("test-admin-key-only");
  await page
    .getByRole("button", { name: "Confirm administration key" })
    .click();
  await expect(page.getByRole("status")).toContainText("confirmed");
  const malformed = { ...cases[0], scenes: [] };
  await page.getByLabel("Import Mystery File").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(malformed)),
  });
  await page.getByRole("button", { name: "Validate and preview" }).click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish this mystery" }),
  ).toHaveCount(0);
  const custom = {
    ...cases[0],
    slug: "parent-preview-test",
    title: "Our imported practice case",
  };
  await page.getByLabel("Import Mystery File").setInputFiles({
    name: "case.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(custom)),
  });
  await page.getByRole("button", { name: "Validate and preview" }).click();
  await expect(page.getByRole("status")).toContainText("passed validation");
  await page.getByLabel("Preview player").selectOption("dad");
  await expect(page.locator(".import-preview")).toContainText(
    custom.scenes[0].private.dad[0].text,
  );
  await page.getByRole("button", { name: "Publish this mystery" }).click();
  await expect(page.getByRole("status")).toContainText("Published.");
  const csrf = await page.context().request.post(origin + "/api/mystery/new", {
    headers: { Origin: "https://elsewhere.example" },
    data: {},
  });
  expect(csrf.status()).toBe(403);
});
