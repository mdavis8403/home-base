import { beforeAll, beforeEach, afterAll, expect, it } from "vitest";
import { TestDatabase } from "./d1";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { MysteryService } from "../src/lib/server/mystery/service";
import { checkAnswer } from "../src/lib/server/mystery/engine";
import {
  validateMystery,
  type MysteryPackage,
} from "../src/lib/shared/mystery/schema";
import { FAMILY_ID, INITIAL_PROFILES } from "../src/lib/shared/profiles";
import type { Session } from "../src/lib/shared/types";
const db = new TestDatabase();
const service = new MysteryService({
  batch: (statements) => db.batch(statements),
  query: async <T>(sql: string, values?: unknown[]) => db.query<T>(sql, values),
});
const people = INITIAL_PROFILES.map(
  (p) =>
    ({
      id: randomUUID(),
      profile: { ...p, familyId: FAMILY_ID },
      expiresAt: new Date(Date.now() + 3600000),
      parentVerifiedUntil: null,
    }) as Session,
);
const mia = people.find((s) => s.profile.key === "mia")!,
  mom = people.find((s) => s.profile.key === "mom")!,
  dad = people.find((s) => s.profile.key === "dad")!;
const parent = { ...mom, parentVerifiedUntil: new Date(Date.now() + 3600000) };
const cases: MysteryPackage[] = [];
async function send(
  s: Session,
  id: string,
  action: string,
  extra: Record<string, unknown> = {},
) {
  const v = await service.view(s, id);
  return service.event(s, {
    id: randomUUID(),
    sessionId: id,
    revision: v.revision,
    action,
    ...(v.scene ? { sceneId: v.scene.id } : {}),
    ...extra,
  });
}
async function start(index = 0) {
  const library = await service.install(mia, cases);
  const { id } = await service.newGame(mia, {
    id: randomUUID(),
    caseId: library[index].id,
  });
  for (const s of people) {
    await send(s, id, "join");
    await send(s, id, "ready", { ready: true });
  }
  await send(mia, id, "start");
  return id;
}
beforeAll(async () => {
  await db.migrate();
  for (const f of (await readdir("content/mysteries"))
    .filter((f) => /^\d.*json$/.test(f))
    .sort())
    cases.push(
      validateMystery(
        JSON.parse(await readFile("content/mysteries/" + f, "utf8")),
      ),
    );
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
beforeEach(() =>
  db.exec(
    "DELETE FROM mystery_events;DELETE FROM mystery_session_players;DELETE FROM mystery_sessions;DELETE FROM mysteries;",
  ),
);
afterAll(() => db.close());
it("validates five original packages, every puzzle family and rejects malformed transitions/answers", () => {
  expect(cases).toHaveLength(5);
  expect(
    new Set(cases.flatMap((c) => c.scenes.map((s) => s.puzzle.type))).size,
  ).toBe(8);
  for (const c of cases) {
    expect(validateMystery(c)).toEqual(c);
    for (const s of c.scenes) {
      expect(checkAnswer(s.puzzle, s.puzzle.solution)).toBe(true);
      expect(checkAnswer(s.puzzle, "wrong")).toBe(false);
      expect(
        new Set(Object.values(s.private).map((a) => JSON.stringify(a))).size,
      ).toBe(3);
    }
  }
  for (const change of [
    (c: MysteryPackage) => {
      c.scenes[0].next = "missing";
    },
    (c: MysteryPackage) => {
      c.scenes[0].next = c.start;
    },
    (c: MysteryPackage) => {
      c.scenes[1].id = c.start;
    },
    (c: MysteryPackage) => {
      c.scenes.at(-1)!.finale = false;
    },
    (c: MysteryPackage) => {
      c.scenes[0].private.mia = [];
    },
    (c: MysteryPackage) => {
      c.scenes[0].puzzle.hints = [] as never;
    },
    (c: MysteryPackage) => {
      if (c.scenes[0].puzzle.type === "hotspot")
        c.scenes[0].puzzle.solution = "not-a-star";
    },
  ]) {
    const c = structuredClone(cases[0]);
    change(c);
    expect(() => validateMystery(c)).toThrow();
  }
  const bad = structuredClone(cases[0]);
  bad.scenes[0].private = { ...bad.scenes[0].private, outsider: [] } as never;
  expect(() => validateMystery(bad)).toThrow();
});
it("requires deliberate joins and all-three readiness; no clue payload in lobby or for nonmembers", async () => {
  const lib = await service.install(mia, cases);
  expect(JSON.stringify(lib)).not.toContain('"solution":');
  expect(JSON.stringify(lib)).not.toContain("TH__D");
  const a = await service.newGame(mia, { id: randomUUID(), caseId: lib[0].id });
  const b = await service.newGame(mom, { id: randomUUID(), caseId: lib[0].id });
  expect(a.id).toBe(b.id);
  const lobby = await service.view(mia, a.id);
  expect(lobby.players).toEqual([]);
  expect(lobby.scene).toBeNull();
  expect(lobby.notebook).toEqual([]);
  await expect(send(mia, a.id, "start")).rejects.toMatchObject({ status: 403 });
  await send(mia, a.id, "join");
  await expect(send(mia, a.id, "start")).rejects.toThrow();
  await send(mia, a.id, "ready", { ready: true });
  for (const s of [mom, dad]) {
    await send(s, a.id, "join");
    await send(s, a.id, "ready", { ready: true });
  }
  await send(mom, a.id, "ready", { ready: false });
  await expect(send(mia, a.id, "start")).rejects.toThrow();
  await send(mom, a.id, "ready", { ready: true });
  await send(mia, a.id, "start");
  expect((await service.view(mia, a.id)).scene?.private).toEqual(
    cases[0].scenes[0].private.mia,
  );
  await db.query(
    "DELETE FROM mystery_session_players WHERE mystery_session_id=$1 AND profile_id=$2",
    [a.id, dad.profile.id],
  );
  expect((await service.view(dad, a.id)).scene).toBeNull();
  await expect(send(dad, a.id, "hint")).rejects.toThrow();
});
it("keeps other players clues, solutions and unopened scenes out of every normal response, including parents", async () => {
  const id = await start();
  for (const s of people) {
    const view = await service.view(s, id);
    const payload = JSON.stringify(view);
    expect(payload).not.toContain('"solution":');
    expect(view.scene?.private).toEqual(
      cases[0].scenes[0].private[s.profile.key],
    );
    for (const other of people.filter((p) => p.profile.key !== s.profile.key))
      expect(payload).not.toContain(
        cases[0].scenes[0].private[other.profile.key][0].text,
      );
    expect(payload).not.toContain(cases[0].ending);
    expect(view.scene?.hints).toEqual([]);
  }
  expect((await service.view(mom, id)).scene?.puzzle).toBeNull();
  await expect(
    send(mom, id, "answer", { answer: "star-3" }),
  ).rejects.toMatchObject({ status: 403 });
  await send(mia, id, "answer", { answer: "star-3" });
  await send(mia, id, "advance");
  await send(mia, id, "answer", { answer: ["8", "11", "13"] });
  await send(mia, id, "advance");
  const momView = await service.view(parent, id);
  expect(JSON.stringify(momView)).not.toContain("dixie-portrait");
});
it("serializes scene progress, preserves hints and handles stale/double submissions safely", async () => {
  const id = await start();
  const v = await service.view(mia, id);
  const event = {
    id: randomUUID(),
    sessionId: id,
    revision: v.revision,
    sceneId: v.scene!.id,
    action: "answer",
    answer: "star-3",
  };
  await Promise.all([service.event(mia, event), service.event(mia, event)]);
  expect((await service.view(mia, id)).revision).toBe(v.revision + 1);
  await expect(
    service.event(mia, { ...event, id: randomUUID() }),
  ).rejects.toMatchObject({ status: 409 });
  await send(mom, id, "hint");
  await send(dad, id, "hint");
  await send(mia, id, "hint");
  await send(mia, id, "hint");
  expect((await service.view(mom, id)).scene?.hints).toHaveLength(3);
  const current = await service.view(mia, id);
  const events = people.slice(0, 2).map((s) =>
    service.event(s, {
      id: randomUUID(),
      sessionId: id,
      revision: current.revision,
      sceneId: current.scene!.id,
      action: "advance",
    }),
  );
  const results = await Promise.allSettled(events);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect((await service.view(mia, id)).scene?.id).toBe(cases[0].scenes[1].id);
  await expect(send(mia, id, "advance")).rejects.toMatchObject({ status: 409 });
  const fresh = new MysteryService({
    batch: (s) => db.batch(s),
    query: async <T>(sql: string, values?: unknown[]) =>
      db.query<T>(sql, values),
  });
  expect((await fresh.view(mia, id)).notebook).toHaveLength(1);
});
it("plays all five complete cases with three authenticated identities and saves their endings and achievements", async () => {
  for (let i = 0; i < 5; i++) {
    const id = await start(i);
    for (const scene of cases[i].scenes) {
      const actor = scene.puzzle.actor
        ? people.find((s) => s.profile.key === scene.puzzle.actor)!
        : people[i % 3];
      expect((await service.view(actor, id)).scene?.id).toBe(scene.id);
      expect(
        (await send(actor, id, "answer", { answer: scene.puzzle.solution }))
          .accepted,
      ).toBe(true);
      await send(mom, id, "advance");
    }
    for (const s of people) {
      const v = await service.view(s, id);
      expect(v.status).toBe("completed");
      expect(v.summary?.ending).toBe(cases[i].ending);
      expect(v.summary?.achievement).toBe(cases[i].achievement);
      expect(v.summary?.puzzles).toBe(cases[i].scenes.length);
    }
  }
  expect(
    (await service.library(mia)).every((c) => c.solved && !c.activeId),
  ).toBe(true);
});
it("protects import/publish with fresh parent permission, validates packages and freezes active versions", async () => {
  for (const s of [mia, mom, { ...parent, parentVerifiedUntil: new Date(0) }]) {
    expect(() => service.preview(s, cases[0])).toThrow();
    await expect(
      service.publish(s, { package: cases[0], published: true }),
    ).rejects.toThrow();
  }
  expect(() => service.preview(parent, { ...cases[0], scenes: [] })).toThrow();
  const id = await start();
  const revised = { ...cases[0], version: 2, title: "Revised test title" };
  await service.publish(parent, { package: revised, published: true });
  expect((await service.view(mia, id)).title).toBe(cases[0].title);
  await expect(
    service.publish(parent, {
      package: { ...revised, title: "Same version changed" },
      published: true,
    }),
  ).rejects.toMatchObject({ status: 409 });
  const entry = (await service.library(mia))[0];
  await service.publication(parent, { id: entry.id, published: false });
  await service.install(mia, cases);
  expect((await service.library(mia))[0].published).toBe(false);
  expect((await service.view(mia, id)).scene).not.toBeNull();
});
it("rejects expired/cross-family access and forged identities without exposing game content", async () => {
  const id = await start();
  await expect(
    service.view({ ...mia, expiresAt: new Date(0) }, id),
  ).rejects.toThrow();
  const stranger = {
    ...mom,
    profile: { ...mom.profile, familyId: randomUUID() },
  };
  await expect(service.view(stranger, id)).rejects.toMatchObject({
    status: 404,
  });
  expect(await service.library(stranger)).toEqual([]);
  await expect(
    service.event(mia, {
      id: randomUUID(),
      sessionId: id,
      revision: 0,
      action: "join",
      profileId: dad.profile.id,
    }),
  ).rejects.toThrow();
});
it("normalizes codes only according to their declared rules", () => {
  const code = cases[4].scenes.at(-1)!.puzzle;
  expect(checkAnswer(code, "  open  WITH three hearts ")).toBe(true);
  const exact = { ...code, normalization: "exact" as const };
  expect(checkAnswer(exact, "open with three hearts")).toBe(false);
});
