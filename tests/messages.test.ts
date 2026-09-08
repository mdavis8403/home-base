import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { MessagesService } from "../src/lib/server/messages";
import { inspectAttachment } from "../src/lib/server/message-media";
import { FAMILY_ID, INITIAL_PROFILES } from "../src/lib/shared/profiles";
import type { Database } from "../src/lib/server/db";
import type { Session } from "../src/lib/shared/types";
const db = new PGlite();
const adapter: Database = {
  query: async <T>(sql: string, values?: unknown[]) => db.query<T>(sql, values),
};
const storage = {
  put: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
  signRead: vi.fn(async () => "https://private.example/short-lived"),
};
const service = new MessagesService(adapter, storage);
const session = (key: string): Session => ({
  id: randomUUID(),
  profile: {
    ...INITIAL_PROFILES.find((p) => p.key === key)!,
    familyId: FAMILY_ID,
  },
  expiresAt: new Date(Date.now() + 60000),
  parentVerifiedUntil: null,
});
const mom = session("mom"),
  dad = session("dad"),
  mia = session("mia");
const note = (extra: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  recipients: ["mia"],
  everyone: false,
  text: "A special note",
  sendAt: null,
  attachment: null,
  ...extra,
});
beforeAll(async () => {
  for (const name of [
    "001_foundation",
    "002_messages",
    "003_family_board",
    "004_mystery_club",
    "005_family_entry",
  ])
    await db.exec(await readFile("db/migrations/" + name + ".sql", "utf8"));
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
    "DELETE FROM media_assets;DELETE FROM message_recipients;DELETE FROM messages",
  );
  vi.clearAllMocks();
});
afterAll(() => db.close());
it("delivers text to chosen recipients and keeps nonrecipients out, even parents", async () => {
  const { id } = await service.send(mom, note());
  expect((await service.list(mia))[0]).toMatchObject({
    id,
    text: "A special note",
    read: false,
    favorite: false,
    sender: "mom",
  });
  expect(await service.list(dad)).toEqual([]);
  expect(await service.list(mom)).toEqual([]);
  expect((await service.list(mom, true))[0].id).toBe(id);
  await expect(
    service.update(dad, id, { action: "love", value: true }),
  ).rejects.toMatchObject({ status: 404 });
});
it("enforces scheduled visibility for lists, mutations and media until database delivery time", async () => {
  const { id } = await service.send(
    mom,
    note({ sendAt: new Date(Date.now() + 86400000).toISOString() }),
  );
  const asset = randomUUID();
  await db.query(
    "INSERT INTO media_assets(id,family_id,owner_profile_id,related_entity_type,related_entity_id,storage_path,media_type) VALUES($1,$2,$3,'messages',$4,$5,'photo')",
    [
      asset,
      FAMILY_ID,
      mom.profile.id,
      id,
      `family/${FAMILY_ID}/messages/${id}/${asset}`,
    ],
  );
  expect(await service.list(mia)).toEqual([]);
  expect((await service.list(mom, true))[0].scheduled).toBe(true);
  await expect(
    service.update(mia, id, { action: "read", value: true }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(service.mediaUrl(mia, asset)).rejects.toMatchObject({
    status: 403,
  });
  expect(storage.signRead).not.toHaveBeenCalled();
  await expect(service.mediaUrl(mom, asset)).resolves.toHaveProperty(
    "expiresIn",
    60,
  );
  await db.query(
    "UPDATE messages SET send_at=now()-interval '1 second' WHERE id=$1",
    [id],
  );
  expect((await service.list(mia))[0].id).toBe(id);
  await expect(service.mediaUrl(mia, asset)).resolves.toHaveProperty(
    "expiresIn",
    60,
  );
  await expect(service.mediaUrl(dad, asset)).rejects.toMatchObject({
    status: 403,
  });
});
it("keeps favorites and unread state private and exposes only deliberate hearts", async () => {
  const { id } = await service.send(mom, note({ recipients: ["mia", "dad"] }));
  await service.update(mia, id, { action: "read", value: true });
  await service.update(mia, id, { action: "favorite", value: true });
  await service.update(mia, id, { action: "love", value: true });
  expect((await service.list(mia))[0]).toMatchObject({
    read: true,
    favorite: true,
    loved: true,
    hearts: ["Mia"],
  });
  expect((await service.list(dad))[0]).toMatchObject({
    read: false,
    favorite: false,
    loved: false,
    hearts: ["Mia"],
  });
  expect((await service.list(mom, true))[0].favorite).toBe(false);
  await service.update(mia, id, { action: "love", value: false });
  expect((await service.list(mom, true))[0].hearts).toEqual([]);
});
it("supports Everyone, excludes self otherwise, rejects malformed input and duplicates", async () => {
  await expect(
    service.send(mom, note({ recipients: ["mom"] })),
  ).rejects.toThrow();
  await expect(
    service.send(mom, note({ recipients: ["mia", "mia"] })),
  ).rejects.toThrow();
  await expect(service.send(mom, note({ text: " " }))).rejects.toThrow();
  await expect(
    service.send(mom, note({ senderProfileId: dad.profile.id })),
  ).rejects.toThrow();
  await expect(
    service.send(mom, note({ sendAt: new Date(0).toISOString() })),
  ).rejects.toThrow();
  const input = note({ everyone: true, recipients: ["mia", "mom", "dad"] });
  await Promise.all([service.send(mom, input), service.send(mom, input)]);
  for (const s of [mom, dad, mia])
    expect(await service.list(s)).toHaveLength(1);
});
it("rejects expired sessions and cross-family reads, mutations and asset signing", async () => {
  const { id } = await service.send(mom, note());
  await expect(
    service.list({ ...mia, expiresAt: new Date(0) }),
  ).rejects.toThrow();
  const stranger = {
    ...mia,
    profile: { ...mia.profile, familyId: randomUUID() },
  };
  expect(await service.list(stranger)).toEqual([]);
  await expect(
    service.update(stranger, id, { action: "favorite", value: true }),
  ).rejects.toThrow();
  await expect(service.mediaUrl(stranger, randomUUID())).rejects.toThrow();
});
it("does not simulate storage success when storage is disconnected", async () => {
  await expect(
    new MessagesService(adapter).send(
      mom,
      note({
        attachment: { kind: "photo", data: "aGVsbG8=", altText: "Photo" },
      }),
    ),
  ).rejects.toMatchObject({ code: "MEDIA_UNAVAILABLE" });
  expect(await service.list(mia)).toEqual([]);
});
it("rejects renamed text/SVG, invalid base64 and oversized media before upload", async () => {
  for (const data of [
    Buffer.from("<svg>unsafe</svg>").toString("base64"),
    "!!!",
    "A".repeat(12 * 1024 * 1024),
  ])
    await expect(
      inspectAttachment({ kind: "photo", data, altText: "Photo" }),
    ).rejects.toThrow();
});
it("checks real photo, drawing, voice and video bytes, then saves private assets atomically", async () => {
  for (const [kind, file] of [
    ["photo", "note.png"],
    ["doodle", "note.png"],
    ["audio", "voice.webm"],
    ["video", "video.mp4"],
  ] as const) {
    const data = (await readFile("tests/fixtures/" + file)).toString("base64");
    const { id } = await service.send(
      mom,
      note({
        text: "",
        attachment: { kind, data, altText: "A family moment" },
      }),
    );
    const message = (await service.list(mia)).find((m) => m.id === id)!;
    expect(message.media[0].mediaType).toBe(kind);
    expect(message.media[0].metadata.altText).toBe("A family moment");
    expect(message.media[0]).not.toHaveProperty("storagePath");
    await expect(
      service.mediaUrl(mia, message.media[0].id),
    ).resolves.toHaveProperty("expiresIn", 60);
  }
  expect(storage.put).toHaveBeenCalledTimes(4);
});
it("enforces duration limits using actual files, rejects video disguised as audio", async () => {
  for (const [kind, file] of [
    ["video", "too-long.mp4"],
    ["audio", "too-long.webm"],
    ["audio", "video.mp4"],
    ["photo", "voice.webm"],
  ] as const) {
    await expect(
      inspectAttachment({
        kind,
        data: (await readFile("tests/fixtures/" + file)).toString("base64"),
        altText: "Test",
      }),
    ).rejects.toMatchObject({ code: "INVALID_MEDIA" });
  }
});
it("never creates a delivered note when private upload fails", async () => {
  storage.put.mockRejectedValueOnce(new Error("Disconnected"));
  await expect(
    service.send(
      mom,
      note({
        attachment: {
          kind: "photo",
          data: (await readFile("tests/fixtures/note.png")).toString("base64"),
          altText: "Photo",
        },
      }),
    ),
  ).rejects.toThrow("Disconnected");
  expect(await service.list(mia)).toEqual([]);
  expect((await db.query("SELECT id FROM media_assets")).rows).toEqual([]);
});
it("removes the private object if the atomic database write fails", async () => {
  const broken: Database = {
    async query<T>(sql: string, values?: unknown[]) {
      if (sql.includes("WITH msg")) throw new Error("Database failed");
      return adapter.query<T>(sql, values);
    },
  };
  await expect(
    new MessagesService(broken, storage).send(
      mom,
      note({
        attachment: {
          kind: "photo",
          data: (await readFile("tests/fixtures/note.png")).toString("base64"),
          altText: "Photo",
        },
      }),
    ),
  ).rejects.toThrow("Database failed");
  expect(storage.remove).toHaveBeenCalledTimes(1);
  expect(await service.list(mia)).toEqual([]);
});
