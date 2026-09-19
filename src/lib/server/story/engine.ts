import "server-only";
import type { PageKind, StoryChoice } from "../../shared/story/types";
import type { MixerIngredient } from "../../shared/story/mixer";
import { generateTitle } from "../../shared/story/mixer";
import type { IngredientType } from "../../shared/story/questions";

// The Story engine seam. Phase 1 ships a deterministic MockStoryEngine so the
// whole experience is real and clickable; a later phase can drop in a
// GeminiStoryEngine implementing this same interface (server-side only) without
// the service, routes, or UI changing. The engine now consumes the full Story
// Mixer package (30 family ingredients) and produces an ~5-minute, two-decision
// story with an early-planted callback that pays off at the end.

export interface StoryPackage {
  sessionId: string;
  ingredients: MixerIngredient[];
  targetMinutes: number;
}
// Persisted alongside the book. `facts` are the key ingredient values chosen for
// this story; `decisions` records the family's two meaningful choices.
export interface Continuity {
  ingredients: MixerIngredient[];
  facts: Record<string, string>;
  decisions: Record<string, string>;
  threads: string[];
}
export interface PageBlueprint {
  node: string;
  kind: PageKind;
  chapter: number;
  chapterTitle: string | null;
  narration: string;
  choices: StoryChoice[];
  inputPrompt: string | null;
}
export interface CreatedStory {
  title: string;
  subtitle: string;
  engineKey: string;
  coverRef: string | null;
  openingRef: string | null;
  continuity: Continuity;
  opening: PageBlueprint;
}
export interface AdvanceResult {
  page: PageBlueprint;
  continuity: Continuity;
  completed: boolean;
}
export interface StoryEngine {
  create(pkg: StoryPackage): CreatedStory;
  advance(
    pkg: StoryPackage,
    continuity: Continuity,
    current: { node: string; kind: PageKind; chapter: number },
    answer: { choiceId?: string; text?: string },
  ): AdvanceResult;
}

// ---- Ingredient → facts --------------------------------------------------
const FALLBACKS: Partial<Record<IngredientType, string>> = {
  setting: "a place we probably weren't supposed to be",
  problem: "something important went missing",
  flavor: "a ridiculous adventure",
  hero: "the whole family",
  villain: "someone far too cheerful",
  goal: "to get home before breakfast",
  obstacle: "a very long line",
  rule: "nobody can say the word banana",
  twist: "it was an inside job all along",
  ending: "someone falls into a fountain",
  object: "a kazoo",
  food: "an alarming number of waffles",
  vehicle: "a golf cart",
  disguise: "one bedsheet, three people",
  sound: "a distant kazoo",
  weather: "fog that only follows Dad",
  phrase: "\"This is fine.\"",
  place: "a fountain nobody is allowed near",
  dadHas: "a waffle maker",
  maxSkill: "finding secret doors",
  keepsake: "a rock shaped like a rock",
  mustAppear: "a mysterious note",
  lucky: "a single traffic cone",
};

function factsFrom(ingredients: MixerIngredient[]): Record<string, string> {
  const facts: Record<string, string> = {};
  const pick = (type: IngredientType): string => {
    const hit = ingredients.find(
      (i) => i.type === type && i.value.trim().length > 0,
    );
    return hit ? hit.value.trim() : (FALLBACKS[type] ?? "something odd");
  };
  const types: IngredientType[] = [
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
    "object",
    "food",
    "vehicle",
    "disguise",
    "sound",
    "weather",
    "phrase",
    "place",
    "dadHas",
    "maxSkill",
    "keepsake",
    "mustAppear",
    "lucky",
  ];
  for (const t of types) facts[t] = pick(t);
  // The callback object we plant early and pay off at the end.
  facts.callback = facts.lucky || facts.dadHas || facts.object;
  return facts;
}

// Trim a leading article and trailing punctuation for mid-sentence use.
function inline(v: string): string {
  return v
    .replace(/^["“]/, "")
    .replace(/^(an?|the)\s+/i, "")
    .replace(/["”]$/, "")
    .trim();
}
function lower(v: string): string {
  const s = inline(v);
  return s.charAt(0).toLowerCase() + s.slice(1);
}
function fill(text: string, f: Record<string, string>): string {
  return text.replace(/\{(\w+)(!)?\}/g, (_, key: string, raw?: string) => {
    const v = f[key] ?? "";
    return raw ? v : lower(v);
  });
}

function choice(
  id: string,
  tone: StoryChoice["tone"],
  label: string,
): StoryChoice {
  return { id, label, tone };
}
const TURN: StoryChoice[] = [choice("turn", "sensible", "Turn the page")];

// ---- Narrative templates (2-decision, ~5 minutes) ------------------------
const OPENING = [
  "It begins, as these things do, at {setting} — where the family absolutely, definitely should not be.",
  "All anyone wanted was {goal}. Instead, {problem}, and the evening tips very quickly into {flavor}.",
  "Dad, for reasons he cannot explain, has brought {dadHas!}. Nobody thinks it will matter. Everybody is wrong about that.",
].join("\n\n");

const ESCALATE = [
  "Within minutes it is clear that {villain} is not to be trusted. They smile the way people smile right before everything goes sideways.",
  "There is a rule here, and it is not optional: {rule!}. Max, who is inexplicably good at {maxSkill}, has already noticed something the rest of us haven't.",
  "Somewhere nearby, {sound} keeps happening at exactly the wrong moments.",
].join("\n\n");

const DECISION1_SETUP = [
  "And then the way forward is blocked by {obstacle}.",
  "There is no clever plan. There is only this family, {callback!} in hand, and roughly four seconds to decide what to do.",
].join("\n\n");

function decision1Choices(): StoryChoice[] {
  return [
    choice("talk", "sensible", "Try to reason with {villain}, politely."),
    choice("run", "bold", "Make a break for it in {vehicle}."),
    choice("deploy", "weird", "Deploy {dadHas} and hope for the best."),
  ];
}

const CONSEQUENCE: Record<string, string> = {
  talk: [
    "Reasoning with {villain} works for exactly four seconds, which is three seconds longer than expected and one second longer than useful.",
    "In the confusion, {callback} ends up in Mia's hands. It seems pointless. Keep an eye on it anyway.",
  ].join("\n\n"),
  run: [
    "The {vehicle} makes it a heroic ten feet before dignity, and the vehicle, give out entirely.",
    "But in the crash everyone spots it: {callback}, sitting there like it has been waiting for us. Nobody knows why it matters yet. It will.",
  ].join("\n\n"),
  deploy: [
    "Deploying {dadHas} does not solve the problem. It does, however, create four exciting new problems and a smell nobody can place.",
    "In the chaos, {callback} rolls to a stop at everyone's feet. Useless. Obviously useless. Probably useless.",
  ].join("\n\n"),
};

const CONSEQUENCE_TAIL =
  "By now the twist is impossible to ignore: {twist}. Which is exactly when we realize what we're truly here for — {goal} — and that {ending!} before any of us are getting home.";

const DECISION2_SETUP = [
  "It all comes down to this. {villain!} is between us and the way out, {weather} is making everything worse, and somebody keeps saying {phrase!}",
  "Max looks at {callback}. Max looks at us. Max, clearly, already knows how this ends.",
].join("\n\n");

function decision2Choices(): StoryChoice[] {
  return [
    choice("sneak", "sensible", "Slip out quietly and let {villain} take the blame."),
    choice("confront", "bold", "Confront {villain} in front of everyone."),
    choice("chaos", "weird", "Cause complete chaos using {callback}."),
  ];
}

const ENDING: Record<string, string> = {
  sneak: "We very nearly sneak out clean — until {callback!}, the most useless thing anyone brought, turns out to be the one thing that works. One quiet flourish and {villain} is undone by their own scheme.",
  confront: "We confront {villain} directly, and it is glorious, and it is going terribly, right up until {callback!} — yes, that — saves the entire evening in a way no one will ever be able to explain to relatives.",
  chaos: "We cause absolute, magnificent chaos with {callback!}, and somewhere in the noise the whole plan finally clicks. {villain!} never stood a chance against a family this committed to a bad idea.",
};

const ENDING_TAIL = [
  "And because a promise is a promise, {ending} — loudly, and with witnesses.",
  "On the walk home from {setting}, nobody breaks the one rule ({rule}), Max gets the credit he has quietly earned, and Dad quietly refuses to throw away {callback}. It is part of the family now. Until next time.",
].join("\n\n");

// ---- Engine --------------------------------------------------------------
export class MockStoryEngine implements StoryEngine {
  create(pkg: StoryPackage): CreatedStory {
    const facts = factsFrom(pkg.ingredients);
    const { title, subtitle } = generateTitle(pkg.ingredients, pkg.sessionId);
    const continuity: Continuity = {
      ingredients: pkg.ingredients,
      facts,
      decisions: {},
      threads: [facts.mustAppear, facts.callback],
    };
    return {
      title,
      subtitle,
      engineKey: "mixer-v1",
      coverRef: null,
      openingRef: null,
      continuity,
      opening: {
        node: "open",
        kind: "opening",
        chapter: 1,
        chapterTitle: null,
        narration: fill(OPENING, facts),
        choices: [choice("begin", "sensible", "Turn the page")],
        inputPrompt: null,
      },
    };
  }

  advance(
    pkg: StoryPackage,
    prev: Continuity,
    current: { node: string; kind: PageKind; chapter: number },
    answer: { choiceId?: string; text?: string },
  ): AdvanceResult {
    const c: Continuity = structuredClone(prev);
    const f = c.facts;
    const page = (bp: PageBlueprint): PageBlueprint => ({
      ...bp,
      narration: fill(bp.narration, f),
      choices: bp.choices.map((ch) => ({ ...ch, label: fill(ch.label, f) })),
    });
    switch (current.node) {
      case "open":
        return {
          continuity: c,
          completed: false,
          page: page({
            node: "escalate",
            kind: "choice",
            chapter: 1,
            chapterTitle: null,
            narration: ESCALATE,
            choices: TURN,
            inputPrompt: null,
          }),
        };
      case "escalate":
        return {
          continuity: c,
          completed: false,
          page: page({
            node: "decision1",
            kind: "choice",
            chapter: 1,
            chapterTitle: null,
            narration: DECISION1_SETUP,
            choices: decision1Choices(),
            inputPrompt: null,
          }),
        };
      case "decision1": {
        const key = answer.choiceId ?? "talk";
        c.decisions.decision1 = key;
        return {
          continuity: c,
          completed: false,
          page: page({
            node: "consequence",
            kind: "choice",
            chapter: 1,
            chapterTitle: null,
            narration:
              (CONSEQUENCE[key] ?? CONSEQUENCE.talk) +
              "\n\n" +
              CONSEQUENCE_TAIL,
            choices: TURN,
            inputPrompt: null,
          }),
        };
      }
      case "consequence":
        return {
          continuity: c,
          completed: false,
          page: page({
            node: "decision2",
            kind: "choice",
            chapter: 1,
            chapterTitle: null,
            narration: DECISION2_SETUP,
            choices: decision2Choices(),
            inputPrompt: null,
          }),
        };
      case "decision2": {
        const key = answer.choiceId ?? "sneak";
        c.decisions.decision2 = key;
        return {
          continuity: c,
          completed: true,
          page: page({
            node: "ending",
            kind: "ending",
            chapter: 1,
            chapterTitle: null,
            narration: (ENDING[key] ?? ENDING.sneak) + "\n\n" + ENDING_TAIL,
            choices: [],
            inputPrompt: null,
          }),
        };
      }
      default:
        throw new Error(`Unknown story node: ${current.node}`);
    }
  }
}

export const mockStoryEngine = new MockStoryEngine();
