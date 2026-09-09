import { revealInstant } from "../src/lib/server/board-time";
import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
import { TestDatabase } from "./d1";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { BoardService } from "../src/lib/server/board";
import { FAMILY_ID, INITIAL_PROFILES } from "../src/lib/shared/profiles";
import type { Session } from "../src/lib/shared/types";
import type { Database } from "../src/lib/server/db";
const db = new TestDatabase();
const adapter: Database = {
  batch: (statements) => db.batch(statements),
  query: async <T>(sql: string, values?: unknown[]) => db.query<T>(sql, values),
};
const storage = {
  put: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
  signRead: vi.fn(async () => "https://private.example/short-lived"),
};
const service = new BoardService(adapter, storage);
const session = (key: string): Session => ({
  id: randomUUID(),
  profile: {
    ...INITIAL_PROFILES.find((p) => p.key === key)!,
    familyId: FAMILY_ID,
  },
  expiresAt: new Date(Date.now() + 3600000),
  parentVerifiedUntil: null,
});
const mom = session("mom"),
  dad = session("dad"),
  mia = session("mia");
const parent = { ...mom, parentVerifiedUntil: new Date(Date.now() + 3600000) };
const answer = (boardId: string, text = "A flying sofa") => ({
  boardId,
  text,
  attachment: null,
});
async function current(type = "question") {
  const b = (await service.open(mia)).boards[0];
  await db.query(
    "UPDATE board_prompts SET prompt_type=$2 WHERE id=(SELECT prompt_id FROM board_days WHERE id=$1)",
    [b.id, type],
  );
  await db.query(
    "UPDATE board_days SET reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','+1 hour') WHERE id=$1",
    [b.id],
  );
  return b.id;
}
const picture = async (kind = "photo") => ({
  kind,
  data: (await readFile("tests/fixtures/note.png")).toString("base64"),
  altText: "A little family picture",
});
beforeAll(async () => {
  await db.migrate();
  await db.query(
    "INSERT INTO families(id,name,timezone,access_phrase_hash) VALUES($1,'Test','America/Chicago','test')",
    [FAMILY_ID],
  );
  for (const p of INITIAL_PROFILES)
    await db.query(
      "INSERT INTO profiles(id,family_id,profile_key,display_name,role,avatar,profile_color) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [p.id, FAMILY_ID, p.key, p.displayName, p.role, p.avatar, p.color],
    );
});
beforeEach(async () => {
  await db.exec(
    'DELETE FROM board_responses; DELETE FROM media_assets; DELETE FROM board_days; DELETE FROM board_prompts; UPDATE families SET timezone=\'America/Chicago\',board_reveal_time=\'20:00\',board_categories=\'["silly","imaginative","reflective","family planning"]\';',
  );
  vi.clearAllMocks();
});
afterAll(() => db.close());
it("creates one board on simultaneous opens with default family-local 8 PM and built-in variety", async () => {
  const [a, b] = await Promise.all([service.open(mia), service.open(mom)]);
  expect(a.boards).toHaveLength(1);
  expect(b.boards[0].id).toBe(a.boards[0].id);
  expect(a.revealTime).toBe("20:00");
  expect(
    new Date(a.boards[0].revealAt).toLocaleTimeString("en-US", {
      timeZone: "America/Chicago",
      hour12: false,
    }),
  ).toBe("20:00:00");
  expect(
    (await db.query("SELECT DISTINCT prompt_type FROM board_prompts")).rows,
  ).toHaveLength(3);
  expect(
    (await db.query("SELECT DISTINCT category FROM board_prompts")).rows,
  ).toHaveLength(4);
});
it("keeps other text out of every DTO, including for parents who already responded, then reveals atomically at three", async () => {
  const id = await current();
  await service.respond(mom, answer(id, "Mom secret"));
  expect((await service.list(mia)).boards[0].responses).toEqual([]);
  await service.respond(mia, answer(id, "Mia secret"));
  expect(
    (await service.list(mom)).boards[0].responses.map((r) => r.text),
  ).toEqual(["Mom secret"]);
  expect((await service.list(dad)).boards[0].responses).toEqual([]);
  await service.respond(dad, answer(id, "Dad secret"));
  for (const s of [mom, mia, dad]) {
    const b = (await service.list(s)).boards[0];
    expect(b.revealed).toBe(true);
    expect(b.responses).toHaveLength(3);
  }
  expect(
    (
      await db.query<{ revealed_at: unknown }>(
        "SELECT revealed_at FROM board_days",
      )
    ).rows[0].revealed_at,
  ).not.toBeNull();
});
it("reveals at the database deadline with missing answers, allows a late answer today, needs no worker", async () => {
  const id = await current();
  await service.respond(mia, answer(id));
  await db.query(
    "UPDATE board_days SET reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=$1",
    [id],
  );
  const b = (await service.list(mom)).boards[0];
  expect(b.revealed).toBe(true);
  expect(b.responses).toHaveLength(1);
  await service.respond(mom, answer(id, "Late but lovely"));
  expect((await service.list(dad)).boards[0].responses).toHaveLength(2);
});
it("cannot replace a response, double-submit a photo, or miss reveal on concurrent submissions", async () => {
  const id = await current();
  await Promise.all([
    service.respond(mom, answer(id, "First")),
    service.respond(mom, answer(id, "Second")),
    service.respond(mia, answer(id)),
    service.respond(dad, answer(id)),
  ]);
  const b = (await service.list(mom)).boards[0];
  expect(b.responses).toHaveLength(3);
  expect(b.revealed).toBe(true);
  const original = b.responses.find((r) => r.own)?.text;
  await service.respond(mom, answer(id, "Replace"));
  expect(
    (await service.list(mom)).boards[0].responses.find((r) => r.own)?.text,
  ).toBe(original);
});
it("authorizes photo and drawing bytes independently of lists; parents have no early media bypass", async () => {
  for (const type of ["photo", "drawing"]) {
    await db.exec(
      "DELETE FROM board_responses;DELETE FROM media_assets;DELETE FROM board_days;",
    );
    const id = await current(type),
      attachment = await picture(type === "photo" ? "photo" : "doodle");
    await Promise.all([
      service.respond(mia, { boardId: id, text: "", attachment }),
      service.respond(mia, { boardId: id, text: "", attachment }),
    ]);
    const b = (await service.list(mia)).boards[0],
      asset = b.responses[0].media!;
    expect(b.responses).toHaveLength(1);
    expect(asset).not.toHaveProperty("storagePath");
    expect((await service.list(mom)).boards[0].responses).toEqual([]);
    await expect(service.mediaUrl(parent, asset.id)).rejects.toMatchObject({
      status: 403,
    });
    expect(storage.signRead).not.toHaveBeenCalled();
    await expect(service.mediaUrl(mia, asset.id)).resolves.toHaveProperty(
      "expiresIn",
      60,
    );
    await db.query(
      "UPDATE board_days SET reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 second') WHERE id=$1",
      [id],
    );
    await expect(service.mediaUrl(mom, asset.id)).resolves.toHaveProperty(
      "expiresIn",
      60,
    );
    expect((await db.query("SELECT id FROM media_assets")).rows).toHaveLength(
      1,
    );
    vi.clearAllMocks();
  }
});
it("rejects expired sessions, forged fields, cross-family boards and unknown media", async () => {
  const id = await current();
  await expect(
    service.list({ ...mia, expiresAt: new Date(0) }),
  ).rejects.toThrow();
  const stranger = {
    ...mom,
    profile: { ...mom.profile, familyId: randomUUID() },
  };
  await expect(service.respond(stranger, answer(id))).rejects.toThrow();
  await expect(service.mediaUrl(stranger, randomUUID())).rejects.toMatchObject({
    status: 404,
  });
  await expect(
    service.respond(mia, { ...answer(id), profileId: mom.profile.id }),
  ).rejects.toThrow();
});
it("requires fresh parent verification for custom prompts and settings; validates categories and clock values", async () => {
  const p = {
    id: randomUUID(),
    text: "Where would our flying sofa go?",
    category: "imaginative",
    type: "question",
  };
  for (const s of [mia, mom, { ...parent, parentVerifiedUntil: new Date(0) }]) {
    await expect(service.addPrompt(s, p)).rejects.toThrow();
    await expect(
      service.settings(s, { revealTime: "19:30", categories: ["silly"] }),
    ).rejects.toThrow();
  }
  await service.addPrompt(parent, p);
  await service.addPrompt(parent, p);
  await expect(
    service.settings(parent, { revealTime: "25:00", categories: ["silly"] }),
  ).rejects.toThrow();
  await expect(
    service.settings(parent, { revealTime: "20:00", categories: [] }),
  ).rejects.toThrow();
  await service.settings(parent, {
    revealTime: "19:30",
    categories: ["imaginative"],
  });
  const data = await service.open(mia);
  expect(data.boards[0].prompt).toBe(p.text);
  expect(data.customPrompts).toEqual([]);
  expect(data.revealTime).toBe("19:30");
  expect((await service.list(parent)).customPrompts).toHaveLength(1);
  const reveal = data.boards[0].revealAt;
  await service.settings(parent, {
    revealTime: "21:00",
    categories: ["silly"],
  });
  expect((await service.open(mia)).boards[0].revealAt).toBe(reveal);
});
it("retains archives, refuses archived submissions, rotates unused prompts and respects category choices", async () => {
  const id = await current();
  await service.respond(mia, answer(id));
  await db.query(
    "UPDATE board_days SET date=date(date,'-1 day'),reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day') WHERE id=$1",
    [id],
  );
  await expect(service.respond(mom, answer(id))).rejects.toMatchObject({
    code: "ARCHIVED",
  });
  const data = await service.open(mia);
  expect(data.boards).toHaveLength(2);
  expect(data.boards[0].type).toBe("photo");
  expect(data.boards[1].responses).toHaveLength(1);
});
it("uses family-local dates around UTC midnight and explicit timezone rules across DST", async () => {
  await db.query(
    "UPDATE families SET timezone='Pacific/Kiritimati' WHERE id=$1",
    [FAMILY_ID],
  );
  const b = (await service.open(mia)).boards[0];
  const expected = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Kiritimati",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  expect(b.date).toBe(expected);
  expect(revealInstant("2026-03-07", "20:00", "America/Chicago")).toBe(
    "2026-03-08T02:00:00.000Z",
  );
  expect(revealInstant("2026-03-08", "20:00", "America/Chicago")).toBe(
    "2026-03-09T01:00:00.000Z",
  );
  expect(revealInstant("2026-03-08", "02:30", "America/Chicago")).toBe(
    "2026-03-08T08:30:00.000Z",
  );
  expect(revealInstant("2026-11-01", "01:30", "America/Chicago")).toBe(
    "2026-11-01T07:30:00.000Z",
  );
});
it("rejects wrong response types and fails honestly without storage, preserving no partial responses", async () => {
  const id = await current("photo");
  await expect(service.respond(mia, answer(id))).rejects.toThrow();
  const input = { boardId: id, text: "", attachment: await picture() };
  await expect(
    new BoardService(adapter).respond(mia, input),
  ).rejects.toMatchObject({ code: "MEDIA_UNAVAILABLE" });
  await expect(
    service.respond(mia, { ...input, attachment: await picture("audio") }),
  ).rejects.toThrow();
  storage.put.mockRejectedValueOnce(new Error("Upload failed"));
  await expect(service.respond(mia, input)).rejects.toThrow();
  const broken: Database = {
    query: (sql, values) => adapter.query(sql, values),
    batch: async () => {
      throw new Error("DB failed");
    },
  };
  await expect(
    new BoardService(broken, storage).respond(mia, input),
  ).rejects.toThrow("DB failed");
  expect(storage.remove).toHaveBeenCalledTimes(1);
  expect((await service.list(mia)).boards[0].responses).toEqual([]);
  expect((await db.query("SELECT id FROM media_assets")).rows).toEqual([]);
});
it("keeps photo and drawing memories readable after rollover while denying another actual family", async () => {
  const otherFamily = randomUUID();
  await db.query(
    "INSERT INTO families(id,name,timezone,access_phrase_hash) VALUES($1,'Other','UTC','test')",
    [otherFamily],
  );
  const stranger = {
    ...dad,
    profile: { ...dad.profile, familyId: otherFamily },
  };
  for (const type of ["photo", "drawing"]) {
    const id = await current(type);
    await service.respond(mia, {
      boardId: id,
      text: "",
      attachment: await picture(type === "photo" ? "photo" : "doodle"),
    });
    await db.query(
      "UPDATE board_days SET date=date(date,'-1 day'),reveal_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day') WHERE id=$1",
      [id],
    );
    const archived = (await service.list(dad)).boards.find((b) => b.id === id)!;
    expect(archived.today).toBe(false);
    expect(archived.revealed).toBe(true);
    const media = archived.responses[0].media!;
    await expect(service.mediaUrl(dad, media.id)).resolves.toHaveProperty(
      "expiresIn",
      60,
    );
    expect((await service.list(stranger)).boards).toEqual([]);
    await expect(service.mediaUrl(stranger, media.id)).rejects.toMatchObject({
      status: 404,
    });
    if (type === "photo")
      await db.query(
        "UPDATE board_days SET date=date(date,'-1 day') WHERE id=$1",
        [id],
      );
  }
  await db.query("DELETE FROM families WHERE id=$1", [otherFamily]);
});
