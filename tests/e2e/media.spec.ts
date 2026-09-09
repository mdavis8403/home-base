import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { BrowserTestDatabase } from "./database";
const origin = "http://localhost:3101",
  db = new BrowserTestDatabase();
async function login(request: APIRequestContext, key: string) {
  expect(
    (
      await request.post(origin + "/api/auth/family", {
        headers: { Origin: origin },
        data: { phrase: "testonly" },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post(origin + "/api/auth/profile", {
        headers: { Origin: origin },
        data: { key, remember: false },
      })
    ).ok(),
  ).toBe(true);
}
test.beforeEach(async () => {
  await db.query("DELETE FROM auth_rate_limits");
});
test("private R2 bytes, real media formats, scheduled access, range reads and session revocation", async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ]);
  const [mom, mia, dad, anonymous] = contexts.map((c) => c.request);
  try {
    await login(mom, "mom");
    await login(mia, "mia");
    await login(dad, "dad");
    for (const [kind, file, type] of [
      ["photo", "note.png", "image/png"],
      ["doodle", "note.png", "image/png"],
      ["audio", "voice.webm", "audio/webm"],
      ["video", "video.mp4", "video/mp4"],
    ]) {
      const bytes = await readFile("tests/fixtures/" + file),
        id = randomUUID();
      const sent = await mom.post(origin + "/api/messages", {
        headers: { Origin: origin },
        data: {
          id,
          recipients: ["mia"],
          everyone: false,
          text: "A private cloud memory",
          sendAt: new Date(Date.now() + 86400000).toISOString(),
          attachment: {
            kind,
            data: bytes.toString("base64"),
            altText: "A family test memory",
          },
        },
      });
      expect(sent.ok(), await sent.text()).toBe(true);
      const out = (
        await (await mom.get(origin + "/api/messages?view=sent")).json()
      ).data.find((m: { id: string }) => m.id === id);
      const asset = out.media[0].id,
        url = origin + "/api/private-media/messages/" + asset;
      expect((await anonymous.get(url)).status()).toBe(401);
      expect((await mia.get(url)).status()).toBe(403);
      expect((await dad.get(url)).status()).toBe(403);
      expect((await mom.get(url)).ok()).toBe(true);
      await db.query(
        "UPDATE messages SET send_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 second') WHERE id=$1",
        [id],
      );
      const received = await mia.get(url);
      expect(received.status()).toBe(200);
      expect(received.headers()["cache-control"]).toContain("no-store");
      expect(received.headers()["content-type"]).toBe(type);
      expect(await received.body()).toEqual(bytes);
      const range = await mia.get(url, { headers: { Range: "bytes=0-15" } });
      expect(range.status()).toBe(206);
      expect(await range.body()).toEqual(bytes.subarray(0, 16));
      expect((await dad.get(url)).status()).toBe(403);
      await mia.post(origin + "/api/auth/sign-out", {
        headers: { Origin: origin },
        data: {},
      });
      expect((await mia.get(url)).status()).toBe(401);
      await login(mia, "mia");
    }
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
test("R2 Board pictures remain private until reveal and survive in Past Boards", async ({
  browser,
}) => {
  await db.query(
    "DELETE FROM board_responses; DELETE FROM media_assets WHERE related_entity_type='board'; DELETE FROM board_days; DELETE FROM board_prompts;",
  );
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [mia, mom] = contexts.map((c) => c.request);
  try {
    await login(mia, "mia");
    await login(mom, "mom");
    await mia.post(origin + "/api/board/open", {
      headers: { Origin: origin },
      data: {},
    });
    await db.query(
      "UPDATE board_prompts SET prompt_type='photo'; UPDATE board_days SET reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','+1 hour')",
    );
    const board = (await (await mia.get(origin + "/api/board")).json()).data
      .boards[0];
    const bytes = await readFile("tests/fixtures/note.png");
    const saved = await mia.post(origin + "/api/board/respond", {
      headers: { Origin: origin },
      data: {
        boardId: board.id,
        text: "",
        attachment: {
          kind: "photo",
          data: bytes.toString("base64"),
          altText: "Our private picture",
        },
      },
    });
    expect(saved.ok(), await saved.text()).toBe(true);
    const own = (await (await mia.get(origin + "/api/board")).json()).data
      .boards[0];
    const url =
      origin + "/api/private-media/board/" + own.responses[0].media.id;
    expect((await mom.get(url)).status()).toBe(403);
    expect(
      (await (await mom.get(origin + "/api/board")).json()).data.boards[0]
        .responses,
    ).toEqual([]);
    await db.query(
      "UPDATE board_days SET date=date(date,'-1 day'),reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour')",
    );
    expect(await (await mom.get(url)).body()).toEqual(bytes);
    const past = (await (await mom.get(origin + "/api/board")).json()).data
      .boards[0];
    expect(past.today).toBe(false);
    expect(past.responses).toHaveLength(1);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
