import { test, expect } from "@playwright/test";
test("entrance is accessible, responsive, and honest about setup", async ({
  page,
  browserName,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".cottage-tagline")).toContainText(
    "No matter where we are",
  );
  await page.screenshot({
    path: testInfo.outputPath("entrance.png"),
    fullPage: true,
  });
  // Touch WebKit does not tab through links by default; desktop checks actual Tab order.
  if (browserName === "chromium") await page.keyboard.press("Tab");
  else await page.getByRole("link", { name: "Skip to content" }).focus();
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open the cottage door" }).click();
  await expect(
    page.getByText("We’re getting your keys ready.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator("input[type=password]")).toHaveCount(0);
});
test("private sections require sign-in", async ({ page }) => {
  for (const route of [
    "/home",
    "/messages",
    "/mystery-club",
    "/our-story",
    "/family-board",
    "/parent-settings",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/enter$/);
  }
});
test("PWA metadata and icons are served", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    const image = await request.get(icon.src);
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
  }
});
test("cross-site mutations are rejected before database access", async ({
  request,
}) => {
  const response = await request.post("/api/auth/family", {
    headers: { Origin: "https://other.example" },
    data: { phrase: "bad" },
  });
  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toBe("no-store");
});
test("offline shell contains no family data and only caches public assets", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Service worker offline emulation is checked in Chromium.",
  );
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
  const keys = await page.evaluate(async () => {
    const names = await caches.keys();
    return (
      await Promise.all(
        names.map(async (n) =>
          (await (await caches.open(n)).keys()).map(
            (r) => new URL(r.url).pathname,
          ),
        ),
      )
    ).flat();
  });
  expect(keys.sort()).toEqual(
    [
      "/offline.html",
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/maskable-512.png",
      "/icons/apple-touch-icon.png",
    ].sort(),
  );
  await context.setOffline(true);
  await page.goto("/home");
  await expect(
    page.getByRole("heading", { name: "Our place will be right here." }),
  ).toBeVisible();
});
