import "server-only";
import type {
  AdventureType,
  CastMember,
  LengthMode,
  Mood,
  PageKind,
  StoryChoice,
} from "../../shared/story/types";
import { castLabels } from "../../shared/story/types";
// The Story engine seam. Phase 1 ships a deterministic MockStoryEngine so the
// whole experience is real and clickable; a later phase can drop in an
// AiStoryEngine implementing this same interface (server-side only) without the
// service, routes, or UI changing.
export interface StorySetup {
  adventureType: AdventureType;
  mood: Mood;
  lengthMode: LengthMode;
  cast: CastMember[];
}
// Three conceptual memory layers, persisted as JSON, ready for real continuity.
export interface Continuity {
  familyProfile: { cast: CastMember[] };
  universe: Record<string, unknown>;
  story: Record<string, string>;
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
  create(setup: StorySetup): CreatedStory;
  advance(
    setup: StorySetup,
    continuity: Continuity,
    current: { node: string; kind: PageKind; chapter: number },
    answer: { choiceId?: string; text?: string },
  ): AdvanceResult;
}
// ---- Deterministic mock content ------------------------------------------
const SETTINGS: Record<AdventureType, string> = {
  mystery: "mansion",
  fantasy: "castle",
  space: "space station",
  silly: "sock museum",
  vacation: "resort",
  spooky: "old house",
  surprise: "old house",
};
const TITLES: Record<AdventureType, string> = {
  mystery: "The Mostly-Haunted Mansion",
  fantasy: "The Castle That Kept Interrupting",
  space: "Left Turn at the Moon",
  silly: "The Museum of Extremely Odd Socks",
  vacation: "Checkout Time Is Never",
  spooky: "The House on Marrow Lane",
  surprise: "The House on Marrow Lane",
};
const NOUNS: Record<AdventureType, string> = {
  mystery: "mystery",
  fantasy: "fairy tale",
  space: "space caper",
  silly: "disaster",
  vacation: "vacation gone sideways",
  spooky: "ghost story",
  surprise: "surprise",
};
function names(cast: CastMember[]): string {
  const list = cast.map((c) => castLabels[c]);
  if (list.length <= 1) return list[0] ?? "the family";
  return list.slice(0, -1).join(", ") + " & " + list[list.length - 1];
}
function hero(cast: CastMember[]): string {
  if (cast.includes("mia")) return "Mia";
  return castLabels[cast[0]] ?? "someone";
}
function fill(text: string, setup: StorySetup, c: Continuity): string {
  return text
    .replaceAll("{setting}", SETTINGS[setup.adventureType])
    .replaceAll("{hero}", hero(setup.cast))
    .replaceAll("{cast}", names(setup.cast))
    .replaceAll("{mood}", setup.mood)
    .replaceAll(
      "{backpackItem}",
      c.story.backpackItem?.trim() || "the thing Dad brought",
    );
}
function choice(
  id: string,
  tone: StoryChoice["tone"],
  label: string,
): StoryChoice {
  return { id, label, tone };
}
const OPENING = [
  "It is a perfectly ordinary evening, right up until {hero} notices that the {setting} at the end of the lane has its lights on. Every light. All at once. The {setting} has been empty for years.",
  '"We are absolutely not going in there," says Dad, already walking toward it.',
  "Max barks once, which in dog means either “danger” or “I would like a snack.” It is impossible to tell.",
  "The front gate swings open on its own, as if the {setting} has been expecting all of you.",
].join("\n\n");
const HALLWAY_ENTRY: Record<string, string> = {
  door: "You knock. The door opens before your knuckles even land, which is the rudest possible timing.",
  window:
    "You climb through a window with tremendous confidence and immediately knock over a suit of armor, a coat rack, and what might once have been a very old cheese.",
  wait: "You explain the entire plan to Max, out loud, in detail. Max listens with the focus of someone who has already decided to ignore every word.",
};
const HALLWAY_TAIL = [
  "Inside, the {setting} is warm, which is somehow worse than cold. Something down the hall is humming a tune nobody recognizes.",
  "Dad clears his throat. “Everyone stay calm. I came prepared.” He reaches into his backpack—",
].join("\n\n");
const PANCAKE = [
  "The kitchen is spotless except for one thing: a single pancake sitting in the exact center of the table, still warm, faintly glowing.",
  "Propped beside it, for reasons no one can explain, is {backpackItem}. That is impossible — {backpackItem} is right here in Dad’s hand. And also on the table. There are two of them now.",
  "The pancake shivers. Max growls at it. The pancake, somehow, growls back.",
].join("\n\n");
const ENDING_PANCAKE: Record<string, string> = {
  pocket:
    "The moment the pancake is folded into a napkin, the humming stops. The lights switch off, one by one, almost politely.",
  eat: "The pancake tastes like maple syrup and a Tuesday. The instant the last bite is gone, the {setting} lets out a long sigh of relief, like it had been holding that pancake for years.",
  interrogate:
    "Under Mia’s questioning the pancake cracks in under a minute, confesses to everything, and then flatly refuses to explain what “everything” actually was.",
};
const ENDING_ENTRY: Record<string, string> = {
  door: "You leave through the same front door you so politely knocked on. It murmurs “thank you for knocking,” which everyone agrees to never mention again.",
  window:
    "You escape through the very window you crashed through earlier, tripping over the exact same suit of armor on the way. Consistency matters.",
  wait: "Max leads you out through a door none of you had noticed, having clearly understood the plan the whole time. Max gets extra snacks. Max has earned them.",
};
const ENDING_CLOSER =
  "On the walk home nobody mentions {backpackItem} again — it is simply part of the family now, and the {setting} at the end of the lane goes dark behind you, until next time.";
function openingBlueprint(): PageBlueprint {
  return {
    node: "opening",
    kind: "opening",
    chapter: 1,
    chapterTitle: null,
    narration: OPENING,
    choices: [
      choice(
        "door",
        "sensible",
        "Walk up and knock politely, like reasonable people.",
      ),
      choice(
        "window",
        "bold",
        "Skip the door entirely and climb in through a window.",
      ),
      choice(
        "wait",
        "weird",
        "Wait outside and narrate the whole plan to Max first.",
      ),
    ],
    inputPrompt: null,
  };
}
export class MockStoryEngine implements StoryEngine {
  create(setup: StorySetup): CreatedStory {
    const continuity: Continuity = {
      familyProfile: { cast: setup.cast },
      universe: {},
      story: {},
      threads: ["the humming down the hall", "the second {backpackItem}"],
    };
    const opening = openingBlueprint();
    return {
      title: TITLES[setup.adventureType],
      subtitle: `A ${setup.mood} ${NOUNS[setup.adventureType]}.`,
      engineKey: "mansion-caper-v1",
      coverRef: null,
      openingRef: null,
      continuity,
      opening: {
        ...opening,
        narration: fill(opening.narration, setup, continuity),
      },
    };
  }
  advance(
    setup: StorySetup,
    prev: Continuity,
    current: { node: string; kind: PageKind; chapter: number },
    answer: { choiceId?: string; text?: string },
  ): AdvanceResult {
    const c: Continuity = structuredClone(prev);
    const build = (bp: PageBlueprint): PageBlueprint => ({
      ...bp,
      narration: fill(bp.narration, setup, c),
    });
    switch (current.node) {
      case "opening": {
        c.story.entry = answer.choiceId ?? "door";
        return {
          continuity: c,
          completed: false,
          page: build({
            node: "hallway",
            kind: "input",
            chapter: 1,
            chapterTitle: null,
            narration:
              (HALLWAY_ENTRY[c.story.entry] ?? HALLWAY_ENTRY.door) +
              "\n\n" +
              HALLWAY_TAIL,
            choices: [],
            inputPrompt:
              "Dad reaches into his backpack and pulls out the one thing that is completely useless right now. What is it?",
          }),
        };
      }
      case "hallway": {
        c.story.backpackItem = (answer.text ?? "").trim();
        c.threads = c.threads.filter((t) => !t.includes("humming"));
        if (setup.lengthMode === "quick")
          return {
            continuity: c,
            completed: false,
            page: build(pancakeBlueprint(1)),
          };
        return {
          continuity: c,
          completed: false,
          page: build({
            node: "chapter2",
            kind: "chapter",
            chapter: 2,
            chapterTitle: "The Extremely Suspicious Pancake",
            narration:
              "Armed with nothing but {backpackItem} and some questionable judgment, the family follows the humming toward the kitchen.",
            choices: [],
            inputPrompt: null,
          }),
        };
      }
      case "chapter2":
        return {
          continuity: c,
          completed: false,
          page: build(pancakeBlueprint(2)),
        };
      case "pancake": {
        c.story.pancake = answer.choiceId ?? "pocket";
        const narration =
          (ENDING_PANCAKE[c.story.pancake] ?? ENDING_PANCAKE.pocket) +
          "\n\n" +
          (ENDING_ENTRY[c.story.entry ?? "door"] ?? ENDING_ENTRY.door) +
          "\n\n" +
          ENDING_CLOSER;
        return {
          continuity: c,
          completed: true,
          page: build({
            node: "ending",
            kind: "ending",
            chapter: current.chapter,
            chapterTitle: null,
            narration,
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
function pancakeBlueprint(chapter: number): PageBlueprint {
  return {
    node: "pancake",
    kind: "choice",
    chapter,
    chapterTitle: null,
    narration: PANCAKE,
    choices: [
      choice(
        "pocket",
        "sensible",
        "Wrap the pancake in a napkin for later. Evidence, probably.",
      ),
      choice(
        "eat",
        "bold",
        "Eat the suspicious glowing pancake. Someone has to.",
      ),
      choice(
        "interrogate",
        "weird",
        "Pull up a chair and interrogate the pancake like a detective.",
      ),
    ],
    inputPrompt: null,
  };
}
export const mockStoryEngine = new MockStoryEngine();
