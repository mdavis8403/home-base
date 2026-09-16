import { beforeAll, afterAll, beforeEach, expect, it } from "vitest";
import { TestDatabase } from "./d1";
import { randomUUID } from "node:crypto";
import { StoryService } from "../src/lib/server/story/service";
import { FAMILY_ID, INITIAL_PROFILES } from "../src/lib/shared/profiles";
import type { Session } from "../src/lib/shared/types";
import type { Database } from "../src/lib/server/db";
import type { StoryBookView } from "../src/lib/shared/story/types";
const db = new TestDatabase();
const adapter: Database = {
  batch: (s) => db.batch(s),
  query: async <T>(sql: string, values?: unknown[]) => db.query<T>(sql, values),
};
const service = new StoryService(adapter);
const session = (key: string): Session => ({
  id: randomUUID(),
  profile: {
    ...INITIAL_PROFILES.find((p) => p.key === key)!,
    familyId: FAMILY_ID,
  },
  expiresAt: new Date(Date.now() + 3600000),
  parentVerifiedUntil: null,
});
const mia = session("mia");
const base = {
  adventureType: "mystery" as const,
  mood: "funny" as const,
  cast: ["everyone"] as const,
};
async function newStory(overrides: Record<string, unknown> = {}) {
  const id = randomUUID();
  await service.create(mia, { id, lengthMode: "night", ...base, ...overrides });
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
  await db.exec("DELETE FROM story_pages; DELETE FROM story_books;");
});
afterAll(() => db.close());
it("persists a new story with normalized cast and an opening page", async () => {
  const id = await newStory();
  const b = await service.book(mia, id);
  expect(b.status).toBe("active");
  expect(b.cast).toEqual(["mom", "dad", "mia", "max"]); // Everyone expands
  expect(b.title.length).toBeGreaterThan(0);
  const opening = seq(b, 0);
  expect(opening.kind).toBe("opening");
  expect(opening.choices).toHaveLength(3);
  expect(opening.choices.map((c) => c.tone).sort()).toEqual([
    "bold",
    "sensible",
    "weird",
  ]);
});
it("selecting a specific cast keeps only those characters", async () => {
  const id = await newStory({ cast: ["mia", "max"] });
  const b = await service.book(mia, id);
  expect(b.cast).toEqual(["mia", "max"]);
});
it("a choice advances the story to a family-input turn", async () => {
  const id = await newStory();
  const b = await service.choose(mia, {
    storyId: id,
    sequence: 0,
    choiceId: "window",
  });
  expect(seq(b, 0).selectedChoice).toBe("window");
  const turn = seq(b, 1);
  expect(turn.kind).toBe("input");
  expect(turn.inputPrompt).toContain("backpack");
  expect(b.currentSequence).toBe(1);
});
it("a family answer is stored and echoed verbatim into later narration", async () => {
  const id = await newStory();
  await service.choose(mia, { storyId: id, sequence: 0, choiceId: "window" });
  const item = "a haunted rubber chicken named Gerald";
  const b = await service.input(mia, { storyId: id, sequence: 1, text: item });
  expect(seq(b, 1).inputResponse).toBe(item);
  // Chapter transition, then the pancake page quotes the answer exactly.
  const chapter = seq(b, 2);
  expect(chapter.kind).toBe("chapter");
  expect(chapter.chapter).toBe(2);
  expect(chapter.chapterTitle).toBeTruthy();
  const afterChapter = await service.choose(mia, {
    storyId: id,
    sequence: 2,
    choiceId: "continue",
  });
  const pancake = seq(afterChapter, 3);
  expect(pancake.kind).toBe("choice");
  expect(pancake.narration).toContain(item);
});
it("reaches a real ending, completes the book, and remembers the earlier choice", async () => {
  const id = await newStory();
  await service.choose(mia, { storyId: id, sequence: 0, choiceId: "window" });
  await service.input(mia, {
    storyId: id,
    sequence: 1,
    text: "an expired coupon",
  });
  await service.choose(mia, { storyId: id, sequence: 2, choiceId: "continue" });
  const b = await service.choose(mia, {
    storyId: id,
    sequence: 3,
    choiceId: "eat",
  });
  expect(b.status).toBe("completed");
  expect(b.completedAt).toBeTruthy();
  const ending = seq(b, 4);
  expect(ending.kind).toBe("ending");
  // Consequence of the earlier "window" entry appears in the ending.
  expect(ending.narration.toLowerCase()).toContain("window");
  expect(ending.narration).toContain("an expired coupon");
});
it("a Quick Story stays a single chapter", async () => {
  const id = await newStory({ lengthMode: "quick" });
  await service.choose(mia, { storyId: id, sequence: 0, choiceId: "door" });
  const b = await service.input(mia, {
    storyId: id,
    sequence: 1,
    text: "a spoon",
  });
  const pancake = seq(b, 2);
  expect(pancake.kind).toBe("choice");
  expect(pancake.chapter).toBe(1);
  expect(b.chapterCount).toBe(1);
});
it("resumes at the latest page after leaving and reopening", async () => {
  const id = await newStory();
  await service.choose(mia, { storyId: id, sequence: 0, choiceId: "door" });
  const reopened = await service.book(mia, id);
  expect(reopened.currentSequence).toBe(1);
  expect(seq(reopened, 1).kind).toBe("input");
});
it("does not double-advance when the same page is answered twice", async () => {
  const id = await newStory();
  await service.choose(mia, { storyId: id, sequence: 0, choiceId: "door" });
  const b = await service.choose(mia, {
    storyId: id,
    sequence: 0,
    choiceId: "wait",
  });
  expect(b.pages).toHaveLength(2); // still just opening + the one next page
  expect(seq(b, 0).selectedChoice).toBe("door"); // first answer wins
});
it("does not mutate a completed story when re-read", async () => {
  const id = await newStory({ lengthMode: "quick" });
  await service.choose(mia, { storyId: id, sequence: 0, choiceId: "door" });
  await service.input(mia, { storyId: id, sequence: 1, text: "a sock" });
  const done = await service.choose(mia, {
    storyId: id,
    sequence: 2,
    choiceId: "pocket",
  });
  expect(done.status).toBe("completed");
  const pageCount = done.pages.length;
  // Attempting to advance a finished book is a no-op read.
  const again = await service.choose(mia, {
    storyId: id,
    sequence: 3,
    choiceId: "eat",
  });
  expect(again.pages).toHaveLength(pageCount);
  expect(again.status).toBe("completed");
});
it("landing separates the active story from finished books", async () => {
  const activeId = await newStory();
  const quickId = await newStory({ lengthMode: "quick" });
  await service.choose(mia, {
    storyId: quickId,
    sequence: 0,
    choiceId: "door",
  });
  await service.input(mia, { storyId: quickId, sequence: 1, text: "a map" });
  await service.choose(mia, { storyId: quickId, sequence: 2, choiceId: "eat" });
  const landing = await service.landing(mia);
  expect(landing.books.map((b) => b.id)).toContain(quickId);
  expect(landing.inProgress.map((b) => b.id)).toContain(activeId);
  expect(landing.inProgress.map((b) => b.id)).not.toContain(quickId);
  expect(landing.active).not.toBeNull();
});
it("visiting a world again starts a fresh story with the same setup", async () => {
  const id = await newStory({ adventureType: "space", cast: ["mia", "max"] });
  const fresh = randomUUID();
  const r = await service.revisit(mia, { id: fresh, fromStoryId: id });
  const b = await service.book(mia, r.id);
  expect(b.id).toBe(fresh);
  expect(b.adventureType).toBe("space");
  expect(b.cast).toEqual(["mia", "max"]);
  expect(b.status).toBe("active");
  expect(seq(b, 0).kind).toBe("opening");
});
it("rejects an invalid choice id", async () => {
  const id = await newStory();
  await expect(
    service.choose(mia, { storyId: id, sequence: 0, choiceId: "nope" }),
  ).rejects.toThrow();
});
