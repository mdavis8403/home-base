import { beforeAll, afterAll, beforeEach, expect, it } from "vitest";
import { TestDatabase } from "./d1";
import { randomUUID } from "node:crypto";
import { StoryService } from "../src/lib/server/story/service";
import { mockStoryEngine } from "../src/lib/server/story/engine";
import { FAMILY_ID, INITIAL_PROFILES } from "../src/lib/shared/profiles";
import type { Session, ProfileKey } from "../src/lib/shared/types";
import type { Database } from "../src/lib/server/db";
import type { StoryBookView } from "../src/lib/shared/story/types";
import {
  assignQuestions,
  toIngredient,
  type MixerIngredient,
} from "../src/lib/shared/story/mixer";
import { questionById } from "../src/lib/shared/story/questions";

const db = new TestDatabase();
const adapter: Database = {
  batch: (s) => db.batch(s),
  query: async <T>(sql: string, values?: unknown[]) => db.query<T>(sql, values),
};
const service = new StoryService(adapter);
const session = (key: ProfileKey): Session => ({
  id: randomUUID(),
  profile: { ...INITIAL_PROFILES.find((p) => p.key === key)!, familyId: FAMILY_ID },
  expiresAt: new Date(Date.now() + 3600000),
  parentVerifiedUntil: null,
});
const mom = session("mom");
const dad = session("dad");
const mia = session("mia");

// Answer all ten of a profile's cards, taking the first option (or a custom
// value at a given index) each time.
async function answerAll(
  s: Session,
  sessionId: string,
  custom?: { at: number; value: string },
) {
  for (let i = 0; i < 10; i++) {
    const v = await service.mixerView(s, sessionId);
    const q = v.me.current!;
    if (custom && custom.at === i)
      await service.mixerAnswer(s, {
        sessionId,
        questionId: q.id,
        optionId: "custom",
        custom: custom.value,
      });
    else
      await service.mixerAnswer(s, {
        sessionId,
        questionId: q.id,
        optionId: q.options[0].id,
      });
  }
}
async function newSealedSession(custom?: {
  s: Session;
  at: number;
  value: string;
}): Promise<string> {
  const id = randomUUID();
  await service.startMixer(mom, { id });
  await answerAll(
    mom,
    id,
    custom?.s === mom ? { at: custom.at, value: custom.value } : undefined,
  );
  await answerAll(
    dad,
    id,
    custom?.s === dad ? { at: custom.at, value: custom.value } : undefined,
  );
  await answerAll(
    mia,
    id,
    custom?.s === mia ? { at: custom.at, value: custom.value } : undefined,
  );
  return id;
}
const seq = (b: StoryBookView, n: number) =>
  b.pages.find((p) => p.sequence === n)!;

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
    "DELETE FROM story_pages; DELETE FROM story_books; DELETE FROM story_mixer_answers; DELETE FROM story_mixer_assignments; DELETE FROM story_mixer_sessions;",
  );
});
afterAll(() => db.close());

it("starting a story creates a mixer session with ten cards per person", async () => {
  const id = randomUUID();
  await service.startMixer(mom, { id });
  const { rows } = await db.query<{ profile_key: string; c: number }>(
    "SELECT profile_key, COUNT(*) AS c FROM story_mixer_assignments WHERE session_id=$1 GROUP BY profile_key",
    [id],
  );
  const byKey = Object.fromEntries(rows.map((r) => [r.profile_key, Number(r.c)]));
  expect(byKey).toEqual({ mom: 10, dad: 10, mia: 10 });
  const v = await service.mixerView(mia, id);
  expect(v.me.total).toBe(10);
  expect(v.me.answered).toBe(0);
  expect(v.me.current).not.toBeNull();
  expect(v.status).toBe("collecting");
});

it("assigned questions are stable across reloads", async () => {
  const id = randomUUID();
  await service.startMixer(mom, { id });
  const a = await service.mixerView(dad, id);
  const b = await service.mixerView(dad, id);
  expect(a.me.current!.id).toBe(b.me.current!.id);
});

it("keeps each person's answers private before the reveal", async () => {
  const id = randomUUID();
  await service.startMixer(mom, { id });
  const dv = await service.mixerView(dad, id);
  await service.mixerAnswer(dad, {
    sessionId: id,
    questionId: dv.me.current!.id,
    optionId: dv.me.current!.options[0].id,
  });
  const momView = await service.mixerView(mom, id);
  // Mom sees only her own (empty) answers and a bare completion count for Dad.
  expect(momView.me.answered).toBe(0);
  expect(momView.me.answers).toHaveLength(0);
  expect(momView.family.find((f) => f.key === "dad")!.answered).toBe(1);
  // Mom cannot answer one of Dad's cards.
  await expect(
    service.mixerAnswer(mom, {
      sessionId: id,
      questionId: dv.me.current!.id,
      optionId: dv.me.current!.options[0].id,
    }),
  ).rejects.toThrow();
});

it("saves answers, keeps custom text exactly, and advances 1→10", async () => {
  const id = randomUUID();
  await service.startMixer(mom, { id });
  await answerAll(mom, id, { at: 2, value: "a wind-up dinosaur, backwards" });
  const v = await service.mixerView(mom, id);
  expect(v.me.answered).toBe(10);
  expect(v.me.sealed).toBe(true);
  expect(v.me.current).toBeNull();
  expect(v.me.answers.map((a) => a.value)).toContain(
    "a wind-up dinosaur, backwards",
  );
});

it("cannot reveal until all three envelopes are sealed", async () => {
  const id = randomUUID();
  await service.startMixer(mom, { id });
  await answerAll(mom, id);
  await expect(
    service.mixerReveal(mom, { sessionId: id, id: randomUUID() }),
  ).rejects.toThrow();
  const landing = await service.landing(dad);
  expect(landing.mixer!.status).toBe("collecting");
});

it("reveals a titled book from 30 ingredients once all three finish", async () => {
  const id = await newSealedSession();
  const complete = await service.landing(mom);
  expect(complete.mixer!.status).toBe("complete");
  const bookId = randomUUID();
  const r = await service.mixerReveal(mia, { sessionId: id, id: bookId });
  expect(r.storyId).toBe(bookId);
  expect(r.reveal.title.length).toBeGreaterThan(0);
  expect(r.reveal.subtitle.length).toBeGreaterThan(0);
  const profiles = new Set(r.reveal.highlights.map((h) => h.profile));
  expect(profiles.size).toBeGreaterThanOrEqual(2);
  // All 30 ingredients remain stored.
  const { rows } = await db.query<{ c: number }>(
    "SELECT COUNT(*) AS c FROM story_mixer_answers WHERE session_id=$1",
    [id],
  );
  expect(Number(rows[0].c)).toBe(30);
  // A fresh active book now leads the landing; reveal is idempotent.
  const after = await service.landing(mom);
  expect(after.active!.id).toBe(bookId);
  const again = await service.mixerReveal(mom, { sessionId: id, id: randomUUID() });
  expect(again.storyId).toBe(bookId);
});

it("plays a ~5-minute story with exactly two decisions and a callback ending", async () => {
  const id = await newSealedSession();
  const bookId = randomUUID();
  await service.mixerReveal(mia, { sessionId: id, id: bookId });
  let b = await service.book(mia, bookId);
  expect(seq(b, 0).kind).toBe("opening");
  // Walk the whole story, always taking the first available choice.
  for (let guard = 0; guard < 12 && b.status === "active"; guard++) {
    const page = seq(b, b.currentSequence);
    const choice = page.choices[0];
    b = await service.choose(mia, {
      storyId: bookId,
      sequence: page.sequence,
      choiceId: choice.id,
    });
  }
  expect(b.status).toBe("completed");
  const ending = b.pages[b.pages.length - 1];
  expect(ending.kind).toBe("ending");
  // Exactly two meaningful decisions (pages offering more than one choice).
  const decisions = b.pages.filter((p) => p.choices.length > 1);
  expect(decisions).toHaveLength(2);
  // No family-input turns are generated for new stories.
  expect(b.pages.some((p) => p.kind === "input")).toBe(false);
  // It appears among finished books.
  const landing = await service.landing(mia);
  expect(landing.books.map((x) => x.id)).toContain(bookId);
  expect(landing.books[0].adventureType).toBe("mixer");
});

it("branches meaningfully: different first decisions change the next page", async () => {
  const ings: MixerIngredient[] = [];
  const a = assignQuestions("branch-seed");
  for (const p of ["mom", "dad", "mia"] as ProfileKey[])
    for (const x of a[p]) {
      const card = questionById.get(x.questionId)!;
      const ing = toIngredient({
        profile: p,
        questionId: x.questionId,
        seq: x.seq,
        value: card.options[0].label,
        custom: false,
      });
      if (ing) ings.push(ing);
    }
  const pkg = { sessionId: "branch-seed", ingredients: ings, targetMinutes: 5 };
  const created = mockStoryEngine.create(pkg);
  const escalate = mockStoryEngine.advance(
    pkg,
    created.continuity,
    { node: "open", kind: "opening", chapter: 1 },
    { choiceId: "begin" },
  );
  const decision1 = mockStoryEngine.advance(
    pkg,
    escalate.continuity,
    { node: "escalate", kind: "choice", chapter: 1 },
    { choiceId: "turn" },
  );
  const talk = mockStoryEngine.advance(
    pkg,
    decision1.continuity,
    { node: "decision1", kind: "choice", chapter: 1 },
    { choiceId: "talk" },
  );
  const run = mockStoryEngine.advance(
    pkg,
    decision1.continuity,
    { node: "decision1", kind: "choice", chapter: 1 },
    { choiceId: "run" },
  );
  expect(talk.page.narration).not.toBe(run.page.narration);
  // The planted callback pays off by the ending.
  const callback = created.continuity.facts.callback;
  const consequence = mockStoryEngine.advance(
    pkg,
    talk.continuity,
    { node: "consequence", kind: "choice", chapter: 1 },
    { choiceId: "turn" },
  );
  const ending = mockStoryEngine.advance(
    pkg,
    consequence.continuity,
    { node: "decision2", kind: "choice", chapter: 1 },
    { choiceId: "chaos" },
  );
  expect(ending.completed).toBe(true);
  const cb = callback.replace(/^(an?|the)\s+/i, "").toLowerCase();
  expect(ending.page.narration.toLowerCase()).toContain(cb);
});

it("re-reads a completed book with decisions as recollections", async () => {
  const id = await newSealedSession();
  const bookId = randomUUID();
  await service.mixerReveal(mia, { sessionId: id, id: bookId });
  let b = await service.book(mia, bookId);
  for (let guard = 0; guard < 12 && b.status === "active"; guard++) {
    const page = seq(b, b.currentSequence);
    b = await service.choose(mia, {
      storyId: bookId,
      sequence: page.sequence,
      choiceId: page.choices[0].id,
    });
  }
  const reread = await service.book(mia, bookId);
  expect(reread.status).toBe("completed");
  // The two decisions recorded which option was taken.
  const chosen = reread.pages.filter((p) => p.selectedChoice);
  expect(chosen.length).toBeGreaterThanOrEqual(2);
});
