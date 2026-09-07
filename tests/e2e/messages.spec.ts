import { test, expect, type Page } from "@playwright/test";
const origin = "http://localhost:3101";
async function login(page: Page, key: "mom" | "mia" | "dad") {
  const request = page.context().request;
  await request.post(origin + "/api/auth/family", {
    headers: { Origin: origin },
    data: { phrase: "isolated-browser-test-family" },
  });
  const result = await request.post(origin + "/api/auth/profile", {
    headers: { Origin: origin },
    data: {
      key,
      passcode: { mom: "222222", mia: "111111", dad: "333333" }[key],
      remember: false,
    },
  });
  expect(result.ok()).toBe(true);
  await page.goto(origin + "/messages");
}
test("personal notes, recipients, scheduled privacy, hearts and keepsakes", async ({
  page,
  browser,
}, info) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const momContext = await browser.newContext();
  const mom = await momContext.newPage();
  await login(mom, "mom");
  await mom.getByRole("button", { name: "Leave something" }).click();
  await expect(
    mom.getByRole("button", { name: "Mom", exact: true }),
  ).toHaveCount(0);
  await mom.getByRole("button", { name: "Mia", exact: true }).click();
  const text = "A little sunshine for " + info.project.name;
  await mom.getByLabel("Your note").fill(text);
  await mom.getByRole("button", { name: "Send this message" }).click();
  await expect(mom.getByRole("status")).toContainText("on its way");

  await login(page, "mia");
  const note = page.locator("article").first();
  await expect(note).toContainText("Something new from Mom");
  await note.getByRole("button", { name: "Open your note" }).click();
  await expect(note).toContainText(text);
  await note.getByRole("button", { name: "Send a heart" }).click();
  await expect(
    note.getByRole("button", { name: "❤️ Loved", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await note.getByRole("button", { name: "Save favorite" }).click();
  await page.getByRole("button", { name: "Our keepsakes" }).click();
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(page.locator("article").filter({ hasText: text })).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("heading", { name: "Something from Mom", exact: true })
      .first(),
  ).toBeVisible();
  await page
    .locator("article")
    .first()
    .getByRole("button", { name: "Open your note" })
    .click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("messages-inbox.png"),
    fullPage: true,
  });

  await mom.getByRole("button", { name: "Leave something" }).click();
  await mom.getByRole("button", { name: "Everyone", exact: true }).click();
  await mom
    .getByLabel("Your note")
    .fill("Tomorrow's secret " + info.project.name);
  await mom.getByRole("button", { name: "Send Later", exact: true }).click();
  const tomorrow = new Date(Date.now() + 86400000);
  await mom
    .getByLabel("Delivery date")
    .fill(tomorrow.toISOString().slice(0, 10));
  await mom.getByLabel("Delivery time").fill("23:45");
  await mom.getByRole("button", { name: "Schedule this message" }).click();
  await expect(mom.getByText("TUCKED AWAY FOR LATER").first()).toBeVisible();
  const sent = await (
    await momContext.request.get(origin + "/api/messages?view=sent")
  ).json();
  const scheduled = sent.data.find(
    (m: { text: string }) =>
      m.text === "Tomorrow's secret " + info.project.name,
  );
  const inbox = await (
    await page.context().request.get(origin + "/api/messages")
  ).json();
  expect(inbox.data.some((m: { id: string }) => m.id === scheduled.id)).toBe(
    false,
  );
  const forbidden = await page
    .context()
    .request.post(origin + "/api/messages/" + scheduled.id, {
      headers: { Origin: origin },
      data: { action: "read", value: true },
    });
  expect(forbidden.status()).toBe(404);
  const csrf = await momContext.request.post(origin + "/api/messages", {
    headers: { Origin: "https://elsewhere.example" },
    data: {},
  });
  expect(csrf.status()).toBe(403);

  await page.getByRole("button", { name: "Leave something" }).click();
  await page.getByRole("button", { name: "Drawing", exact: false }).click();
  const canvas = page.getByLabel("Draw here with your finger or pen");
  await canvas.scrollIntoViewIfNeeded();
  const rect = (await canvas.boundingBox())!;
  if (info.project.name !== "laptop")
    await page.touchscreen.tap(rect.x + 30, rect.y + 40);
  await page.mouse.move(rect.x + 30, rect.y + 40);
  await page.mouse.down();
  await page.mouse.move(rect.x + 150, rect.y + 100);
  await page.mouse.up();
  await page.getByRole("button", { name: "Use this drawing" }).click();
  await expect(page.getByAltText("Your attachment preview")).toBeVisible();
  await page.getByLabel("Describe your picture").fill("A little swoosh");
  await page.getByRole("button", { name: "Mom", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("messages-composer.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Send this message" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Private media storage isn't connected",
  );
  await page.getByRole("button", { name: "Discard attachment" }).click();
  await page.getByRole("button", { name: "Voice", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "Record", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  if (info.project.name === "laptop") {
    // This headless host has no capture device. Exercise native MediaRecorder
    // using generated input streams, and independently cover permission denial.
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException("Denied", "NotAllowedError");
      };
    });
    await page.getByRole("button", { name: "Record", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Voice recorder" }).getByRole("alert"),
    ).toContainText("couldn't start recording");
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const audio = new AudioContext();
        await audio.resume();
        const oscillator = audio.createOscillator();
        const destination = audio.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();
        const stream = destination.stream;
        let cleaned = false;
        let timer: ReturnType<typeof setInterval> | undefined;
        if (constraints?.video) {
          const canvas = document.createElement("canvas");
          canvas.width = 160;
          canvas.height = 120;
          const ctx = canvas.getContext("2d")!;
          const paint = () => {
            ctx.fillStyle = "#e6aa96";
            ctx.fillRect(0, 0, 160, 120);
          };
          paint();
          timer = setInterval(paint, 100);
          canvas
            .captureStream(10)
            .getVideoTracks()
            .forEach((t) => stream.addTrack(t));
        }
        for (const track of stream.getTracks()) {
          const stop = track.stop.bind(track);
          track.stop = () => {
            stop();
            if (
              !cleaned &&
              stream.getTracks().every((t) => t.readyState === "ended")
            ) {
              cleaned = true;
              clearInterval(timer);
              oscillator.stop();
              void audio.close();
            }
          };
        }
        return stream;
      };
    });
    await page.getByRole("button", { name: "Record", exact: true }).click();
    await expect(page.getByText("Up to 5 minutes · 0:01")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send this message" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Stop recording" }).click();
    await expect(page.getByLabel("Preview your voice message")).toBeVisible();
    await page.getByRole("button", { name: "Discard attachment" }).click();
    await page.getByRole("button", { name: "Video", exact: false }).click();
    await page.getByRole("button", { name: "Record", exact: true }).click();
    await expect(page.getByText("Up to 2 minutes · 0:01")).toBeVisible();
    await page.getByRole("button", { name: "Stop recording" }).click();
    await expect(page.getByLabel("Preview your video message")).toBeVisible();
  }
  expect(pageErrors).toEqual([]);
  await momContext.close();
});
