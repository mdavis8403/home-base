import { test, expect, type Page } from "@playwright/test";
const origin = "http://localhost:3101";
async function signIn(page: Page, name: "Mia" | "Mom" | "Dad") {
  await page.goto(`${origin}/enter`);
  await page.getByRole("button", { name: "Open the cottage door" }).click();
  await page.getByLabel("Our family’s magic word").fill("testonly");
  await page
    .getByRole("button", { name: "Open the door", exact: true })
    .click();
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page).toHaveURL(`${origin}/home`);
}
test("Mia can navigate placeholders and is protected from parent settings", async ({
  page,
  context,
}, testInfo) => {
  await signIn(page, "Mia");
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
  });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Mia");
  await expect(page.getByRole("link", { name: "Parent Settings" })).toHaveCount(
    0,
  );
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === "hb-session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Strict");
  expect(session!.expires).toBeGreaterThan(Date.now() / 1000);
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "hb-session",
  );
  for (const label of ["Our Story"]) {
    await page
      .getByRole("navigation")
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(label);
    await expect(
      page.getByText("This is a placeholder for a future phase.", {
        exact: false,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto(`${origin}/parent-settings`);
  await expect(page.getByText("This door doesn’t open here.")).toBeVisible();
  const denied = await context.request.post(`${origin}/api/auth/reauth`, {
    headers: { Origin: origin },
    data: { adminKey: "test-admin-key-only" },
  });
  expect(denied.status()).toBe(403);
  await page.goto(origin + "/home");
  await expect(page).toHaveURL(`${origin}/home`);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/`);
  await page.goto(`${origin}/home`);
  await expect(page).toHaveURL(`${origin}/enter`);
});
test("parent reauthentication and device revocation work end to end", async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const childPage = await other.newPage();
  await signIn(childPage, "Dad");
  await signIn(page, "Mom");
  await page.getByRole("link", { name: "Parent Settings" }).click();
  await page
    .getByRole("button", { name: "Sign out all other devices" })
    .click();
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
  await page
    .getByRole("button", { name: "Sign out all other devices" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "All other family devices have been signed out",
  );
  await childPage.goto(`${origin}/home`);
  await expect(childPage).toHaveURL(`${origin}/enter`);
  await page.goto(`${origin}/home`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Mom");
  await other.close();
});
