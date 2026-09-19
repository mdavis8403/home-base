// The Story Mixer: pure, deterministic logic shared by the server and the future
// AI provider. Nothing here touches the DB or React — it assigns each family
// member their ten secret cards, resolves answers into ingredients, picks the
// reveal highlights, and mints a title/premise from the mashup. Deterministic so
// the same session always produces the same questions, reveal, and title.
import type { ProfileKey } from "../types";
import {
  ingredientTypes,
  questionBank,
  questionById,
  type IngredientTier,
  type IngredientType,
  type QuestionCard,
  type QuestionOption,
} from "./questions";

export const MIXER_PROFILES: ProfileKey[] = ["mom", "dad", "mia"];
export const QUESTIONS_PER_PERSON = 10;
export type MixerStatus = "collecting" | "complete" | "revealed";

// Core plot ingredient types that must be represented across the 30 answers.
const CORE_TYPES: IngredientType[] = [
  "setting",
  "problem",
  "flavor",
  "hero",
  "villain",
  "goal",
  "obstacle",
  "rule",
  "twist",
  "ending",
];
// Callback types guaranteed so the story always has a payoff to plant early.
const GUARANTEED_CALLBACKS: IngredientType[] = ["lucky", "dadHas"];

// ---- Deterministic PRNG (mulberry32 seeded from a string) ----------------
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rngFrom(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---- Assignment ----------------------------------------------------------
export interface MixerAssignment {
  profile: ProfileKey;
  questionId: string;
  seq: number; // 1..10
  type: IngredientType;
  tier: IngredientTier;
}

// Deterministically assign ten distinct cards to each of Mom, Dad, and Mia.
// Guarantees: the combined 30 cover every core plot type plus a callback payoff,
// no card is used twice, and responsibilities are shuffled across people.
export function assignQuestions(
  sessionId: string,
): Record<ProfileKey, MixerAssignment[]> {
  const rng = rngFrom(`${sessionId}:assign`);
  const byType = new Map<IngredientType, QuestionCard[]>();
  for (const card of questionBank) {
    const list = byType.get(card.type) ?? [];
    list.push(card);
    byType.set(card.type, list);
  }
  const used = new Set<string>();
  const chosen: QuestionCard[] = [];
  const pickOfType = (type: IngredientType) => {
    const pool = (byType.get(type) ?? []).filter((c) => !used.has(c.id));
    if (pool.length === 0) return;
    const card = pool[Math.floor(rng() * pool.length)];
    used.add(card.id);
    chosen.push(card);
  };
  for (const t of CORE_TYPES) pickOfType(t);
  for (const t of GUARANTEED_CALLBACKS) pickOfType(t);
  // Fill the remainder to 30 from the rest of the bank, shuffled for variety.
  const total = MIXER_PROFILES.length * QUESTIONS_PER_PERSON;
  for (const card of shuffle(
    questionBank.filter((c) => !used.has(c.id)),
    rng,
  )) {
    if (chosen.length >= total) break;
    used.add(card.id);
    chosen.push(card);
  }
  // Shuffle then deal 10 to each person so who-owns-what varies per story.
  const dealt = shuffle(chosen, rng);
  const result: Record<ProfileKey, MixerAssignment[]> = {
    mom: [],
    dad: [],
    mia: [],
  };
  MIXER_PROFILES.forEach((profile, pi) => {
    for (let i = 0; i < QUESTIONS_PER_PERSON; i++) {
      const card = dealt[pi * QUESTIONS_PER_PERSON + i];
      if (!card) continue;
      result[profile].push({
        profile,
        questionId: card.id,
        seq: i + 1,
        type: card.type,
        tier: ingredientTypes[card.type].tier,
      });
    }
  });
  return result;
}

// ---- Answer resolution ---------------------------------------------------
export interface MixerIngredient {
  profile: ProfileKey;
  questionId: string;
  seq: number;
  type: IngredientType;
  tier: IngredientTier;
  value: string;
  custom: boolean;
}

// Deterministically choose a hidden "Surprise Me" value for a card + session.
export function surpriseValue(sessionId: string, card: QuestionCard): string {
  const pool =
    card.surprise.length > 0 ? card.surprise : card.options.map((o) => o.label);
  const rng = rngFrom(`${sessionId}:${card.id}:surprise`);
  return pool[Math.floor(rng() * pool.length)];
}

// Resolve a saved answer (option id, or the "custom"/"surprise" sentinels) into
// the normalized ingredient value. Custom text is stored exactly as written.
export function resolveAnswer(
  sessionId: string,
  card: QuestionCard,
  optionId: string,
  customText?: string | null,
): { value: string; custom: boolean } {
  if (optionId === "custom") {
    return { value: (customText ?? "").trim(), custom: true };
  }
  if (optionId === "surprise") {
    return { value: surpriseValue(sessionId, card), custom: false };
  }
  const chosen = card.options.find((o) => o.id === optionId);
  return { value: chosen ? chosen.label : "", custom: false };
}

// ---- Client-facing card (hidden surprise pool removed) -------------------
export interface MixerQuestionView {
  id: string;
  seq: number;
  text: string;
  options: QuestionOption[];
  allowCustom: boolean;
  allowSurprise: boolean;
}
export function cardView(card: QuestionCard, seq: number): MixerQuestionView {
  return {
    id: card.id,
    seq,
    text: card.text,
    options: card.options,
    allowCustom: card.allowCustom !== false,
    allowSurprise: card.surprise.length > 0,
  };
}

// ---- Reveal --------------------------------------------------------------
export interface RevealHighlight {
  profile: ProfileKey;
  type: IngredientType;
  lead: string;
  value: string;
}
export interface MixerReveal {
  highlights: RevealHighlight[];
  moreCount: number;
  title: string;
  subtitle: string;
}

const TIER_BONUS: Record<IngredientTier, number> = {
  core: 3,
  callback: 2,
  flavor: 0,
};

// Choose the funniest / most consequential ingredients to announce, guaranteeing
// at least one from each family member and preferring core + callback + custom.
export function pickHighlights(
  ingredients: MixerIngredient[],
  seed: string,
): RevealHighlight[] {
  const rng = rngFrom(`${seed}:reveal`);
  const scored = ingredients
    .filter((i) => i.value.trim().length > 0)
    .map((ing) => ({
      ing,
      score:
        ingredientTypes[ing.type].weight +
        TIER_BONUS[ing.tier] +
        (ing.custom ? 2 : 0) +
        rng() * 2,
    }))
    .sort((a, b) => b.score - a.score);

  const target = Math.min(7, scored.length);
  const perProfileCap = 3;
  const counts: Record<ProfileKey, number> = { mom: 0, dad: 0, mia: 0 };
  const picked: MixerIngredient[] = [];
  for (const { ing } of scored) {
    if (picked.length >= target) break;
    if (counts[ing.profile] >= perProfileCap) continue;
    picked.push(ing);
    counts[ing.profile] += 1;
  }
  for (const { ing } of scored) {
    if (picked.length >= target) break;
    if (!picked.includes(ing)) picked.push(ing);
  }
  // Interleave by person so the reveal alternates voices where possible.
  const queues: Record<ProfileKey, MixerIngredient[]> = {
    mom: [],
    dad: [],
    mia: [],
  };
  for (const ing of picked) queues[ing.profile].push(ing);
  const order: RevealHighlight[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const p of MIXER_PROFILES) {
      const next = queues[p].shift();
      if (next) {
        order.push({
          profile: next.profile,
          type: next.type,
          lead: ingredientTypes[next.type].reveal,
          value: next.value,
        });
        added = true;
      }
    }
  }
  return order;
}

// ---- Title + premise (mock) ---------------------------------------------
function firstOfType(
  ingredients: MixerIngredient[],
  ...types: IngredientType[]
): MixerIngredient | undefined {
  for (const t of types) {
    const hit = ingredients.find(
      (i) => i.type === t && i.value.trim().length > 0,
    );
    if (hit) return hit;
  }
  return undefined;
}
// Strip a leading article and keep the tail of a phrase for a punchy title noun.
function nounize(value: string): string {
  const cleaned = value
    .replace(/^["“]/, "")
    .replace(/^(an?|the)\s+/i, "")
    .replace(/[.!,"”]+$/, "")
    .trim();
  const words = cleaned.split(/\s+/);
  const tail = words.slice(-2).join(" ");
  return tail.toUpperCase();
}
function plainNoun(value: string): string {
  return value.replace(/^(an?|the)\s+/i, "").replace(/[.!,"”“]+$/, "").trim();
}

export function generateTitle(
  ingredients: MixerIngredient[],
  seed: string,
): { title: string; subtitle: string } {
  const rng = rngFrom(`${seed}:title`);
  const object = firstOfType(
    ingredients,
    "dadHas",
    "object",
    "lucky",
    "keepsake",
    "food",
    "vehicle",
  );
  const setting = firstOfType(ingredients, "setting", "place");
  const villain = firstOfType(ingredients, "villain");
  const goal = firstOfType(ingredients, "goal", "problem");
  const hero = firstOfType(ingredients, "hero");
  const max = firstOfType(ingredients, "maxSkill");

  const objectNoun = object ? nounize(object.value) : "INCIDENT";
  const settingNoun = setting ? nounize(setting.value) : "PLACE WE AVOID";

  const titleTemplates = [
    `THE ${objectNoun} INCIDENT`,
    `THE NIGHT OF THE ${objectNoun}`,
    `THE ${objectNoun} AFFAIR`,
    `A PERFECTLY NORMAL EVENING AT THE ${settingNoun}`,
    `THE ${settingNoun} AND THE ${objectNoun}`,
  ];
  const title = titleTemplates[Math.floor(rng() * titleTemplates.length)];

  const subLines: string[] = [];
  if (max) subLines.push(`Max is the only one who knows ${plainNoun(goal?.value ? "where it went" : "what happened")}.`);
  else if (goal) subLines.push(`All we wanted was ${plainNoun(goal.value).toLowerCase()}.`);
  if (villain)
    subLines.push(`Unfortunately, nobody warned us about ${plainNoun(villain.value).toLowerCase()}.`);
  else if (hero)
    subLines.push(`Only ${plainNoun(hero.value).toLowerCase()} can save the evening.`);
  if (subLines.length === 0)
    subLines.push("An evening only this family could ruin, then rescue.");
  const subtitle = subLines.slice(0, 2).join(" ");
  return { title, subtitle };
}

export function buildReveal(
  ingredients: MixerIngredient[],
  seed: string,
): MixerReveal {
  const highlights = pickHighlights(ingredients, seed);
  const { title, subtitle } = generateTitle(ingredients, seed);
  return {
    highlights,
    moreCount: Math.max(0, ingredients.length - highlights.length),
    title,
    subtitle,
  };
}

// ---- Client-facing view DTOs --------------------------------------------
export interface MixerFamilyStatus {
  key: ProfileKey;
  name: string;
  answered: number;
  total: number;
  sealed: boolean;
}
export interface MixerMyView {
  key: ProfileKey;
  answered: number;
  total: number;
  sealed: boolean;
  current: MixerQuestionView | null;
  answers: { questionId: string; seq: number; value: string }[];
}
export interface MixerView {
  sessionId: string;
  status: MixerStatus;
  me: MixerMyView;
  family: MixerFamilyStatus[];
  sealedCount: number;
  reveal: MixerReveal | null;
  storyId: string | null;
}
// Per-envelope completion (a check only — never answers) for the landing.
export interface MixerEnvelope {
  key: ProfileKey;
  name: string;
  sealed: boolean;
  mine: boolean;
}
// Compact mixer state surfaced on the Our Story landing.
export interface MixerLanding {
  sessionId: string;
  status: MixerStatus;
  mineSealed: boolean;
  mineAnswered: number;
  sealedCount: number;
  envelopes: MixerEnvelope[];
}

// Resolve raw assignment + answer rows into typed ingredients for the engine.
export function toIngredient(row: {
  profile: ProfileKey;
  questionId: string;
  seq: number;
  value: string;
  custom: boolean;
}): MixerIngredient | null {
  const card = questionById.get(row.questionId);
  if (!card) return null;
  return {
    profile: row.profile,
    questionId: row.questionId,
    seq: row.seq,
    type: card.type,
    tier: ingredientTypes[card.type].tier,
    value: row.value,
    custom: row.custom,
  };
}
