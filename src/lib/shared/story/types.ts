import { z } from "zod";
// Our Story — shared types and the short, family-facing setup vocabulary.
// The book is the interface; none of these internal keys are shown as raw labels.
export const adventureTypes = [
  "mystery",
  "fantasy",
  "space",
  "silly",
  "vacation",
  "spooky",
  "surprise",
] as const;
export type AdventureType = (typeof adventureTypes)[number];
export const adventureLabels: Record<AdventureType, string> = {
  mystery: "Mystery",
  fantasy: "Fantasy",
  space: "Space",
  silly: "Silly",
  vacation: "Vacation Gone Wrong",
  spooky: "Spooky but Safe",
  surprise: "Surprise Me",
};
export const moods = [
  "funny",
  "cozy",
  "exciting",
  "weird",
  "heartwarming",
] as const;
export type Mood = (typeof moods)[number];
export const moodLabels: Record<Mood, string> = {
  funny: "Funny",
  cozy: "Cozy",
  exciting: "Exciting",
  weird: "Weird",
  heartwarming: "Heartwarming",
};
export const lengthModes = ["quick", "night", "ongoing"] as const;
export type LengthMode = (typeof lengthModes)[number];
export const lengthLabels: Record<LengthMode, string> = {
  quick: "Quick Story",
  night: "Story Night",
  ongoing: "Ongoing Adventure",
};
// Story characters (not login profiles — Max the dog is a character only).
export const castMembers = ["mom", "dad", "mia", "max"] as const;
export type CastMember = (typeof castMembers)[number];
export const castLabels: Record<CastMember, string> = {
  mom: "Mom",
  dad: "Dad",
  mia: "Mia",
  max: "Max",
};
export type PageKind = "opening" | "choice" | "input" | "chapter" | "ending";
export type ChoiceTone = "sensible" | "bold" | "weird";
export interface StoryChoice {
  id: string;
  label: string;
  tone: ChoiceTone;
}
export interface StoryPageView {
  id: string;
  sequence: number;
  chapter: number;
  chapterTitle: string | null;
  kind: PageKind;
  narration: string;
  choices: StoryChoice[];
  selectedChoice: string | null;
  inputPrompt: string | null;
  inputResponse: string | null;
}
export interface StorySummary {
  id: string;
  status: "active" | "completed";
  title: string;
  subtitle: string | null;
  adventureType: AdventureType;
  mood: Mood;
  lengthMode: LengthMode;
  cast: CastMember[];
  chapterCount: number;
  coverRef: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
export interface StoryBookView extends StorySummary {
  currentSequence: number;
  pages: StoryPageView[];
}
export interface StoryLanding {
  active: StorySummary | null;
  books: StorySummary[];
  inProgress: StorySummary[];
}
// The one place setup answers are validated. Cast may include a virtual
// "everyone", expanded to the whole cast on the server.
export const newStoryInput = z
  .object({
    id: z.uuid(),
    adventureType: z.enum(adventureTypes),
    mood: z.enum(moods),
    lengthMode: z.enum(lengthModes),
    cast: z
      .array(z.enum([...castMembers, "everyone"] as const))
      .min(1)
      .max(5),
  })
  .strict();
export const chooseInput = z
  .object({
    storyId: z.uuid(),
    sequence: z.number().int().min(0),
    choiceId: z.string().min(1).max(40),
  })
  .strict();
export const inputTurnInput = z
  .object({
    storyId: z.uuid(),
    sequence: z.number().int().min(0),
    text: z.string().trim().min(1).max(100),
  })
  .strict();
