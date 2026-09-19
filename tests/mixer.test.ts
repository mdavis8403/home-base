import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  assignQuestions,
  buildReveal,
  generateTitle,
  MIXER_PROFILES,
  QUESTIONS_PER_PERSON,
  resolveAnswer,
  surpriseValue,
  toIngredient,
  type MixerIngredient,
} from "../src/lib/shared/story/mixer";
import {
  ingredientTypes,
  questionBank,
  questionById,
} from "../src/lib/shared/story/questions";
import type { ProfileKey } from "../src/lib/shared/types";

const CORE = Object.entries(ingredientTypes)
  .filter(([, m]) => m.tier === "core")
  .map(([t]) => t);

it("the question bank has at least 60 distinct cards", () => {
  expect(questionBank.length).toBeGreaterThanOrEqual(60);
  expect(new Set(questionBank.map((q) => q.id)).size).toBe(questionBank.length);
});

it("assigns exactly ten cards to each of Mom, Dad, and Mia", () => {
  const a = assignQuestions(randomUUID());
  for (const p of MIXER_PROFILES)
    expect(a[p]).toHaveLength(QUESTIONS_PER_PERSON);
});

it("gives all thirty cards to different people with no repeats", () => {
  const a = assignQuestions(randomUUID());
  const all = MIXER_PROFILES.flatMap((p) => a[p].map((x) => x.questionId));
  expect(all).toHaveLength(30);
  expect(new Set(all).size).toBe(30);
  // No profile shares a question id with another profile.
  const mom = new Set(a.mom.map((x) => x.questionId));
  for (const p of ["dad", "mia"] as ProfileKey[])
    for (const x of a[p]) expect(mom.has(x.questionId)).toBe(false);
});

it("covers every core plot ingredient across the thirty", () => {
  const a = assignQuestions(randomUUID());
  const types = new Set(
    MIXER_PROFILES.flatMap((p) => a[p].map((x) => x.type)),
  );
  for (const core of CORE) expect(types.has(core as never)).toBe(true);
});

it("is deterministic for a session and varies between sessions", () => {
  const id = randomUUID();
  expect(assignQuestions(id)).toEqual(assignQuestions(id));
  const other = assignQuestions(randomUUID());
  const sig = (a: ReturnType<typeof assignQuestions>) =>
    MIXER_PROFILES.map((p) => a[p].map((x) => x.questionId).join(",")).join("|");
  // Extremely unlikely to match; guards against a fixed (non-seeded) shuffle.
  expect(sig(assignQuestions(id))).not.toBe(sig(other));
});

it("resolves curated, custom, and surprise answers correctly", () => {
  const card = questionBank[0];
  const opt = card.options[1];
  expect(resolveAnswer("s", card, opt.id).value).toBe(opt.label);
  expect(resolveAnswer("s", card, "custom", "  my thing  ")).toEqual({
    value: "my thing",
    custom: true,
  });
  const surprise = resolveAnswer("s", card, "surprise");
  expect(surprise.custom).toBe(false);
  // Deterministic for a session + card.
  expect(surprise.value).toBe(surpriseValue("s", card));
  expect(surpriseValue("s", card)).toBe(surpriseValue("s", card));
});

// Build a full set of 30 ingredients by taking each assigned card's first option.
function fullIngredients(sessionId: string): MixerIngredient[] {
  const a = assignQuestions(sessionId);
  const out: MixerIngredient[] = [];
  for (const p of MIXER_PROFILES)
    for (const x of a[p]) {
      const card = questionById.get(x.questionId)!;
      const value = card.options[0].label;
      const ing = toIngredient({
        profile: p,
        questionId: x.questionId,
        seq: x.seq,
        value,
        custom: false,
      });
      if (ing) out.push(ing);
    }
  return out;
}

it("reveal highlights represent all three family members", () => {
  const id = randomUUID();
  const reveal = buildReveal(fullIngredients(id), id);
  expect(reveal.highlights.length).toBeGreaterThanOrEqual(3);
  expect(reveal.highlights.length).toBeLessThanOrEqual(7);
  const profiles = new Set(reveal.highlights.map((h) => h.profile));
  for (const p of MIXER_PROFILES) expect(profiles.has(p)).toBe(true);
  expect(reveal.moreCount).toBe(30 - reveal.highlights.length);
});

it("mints a non-empty title and premise deterministically", () => {
  const id = randomUUID();
  const ings = fullIngredients(id);
  const t = generateTitle(ings, id);
  expect(t.title.length).toBeGreaterThan(0);
  expect(t.subtitle.length).toBeGreaterThan(0);
  expect(generateTitle(ings, id)).toEqual(t);
});
