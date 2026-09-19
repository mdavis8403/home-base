import { z } from "zod";
import type { MixerLanding } from "./mixer";
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
  // Internal metadata only (never shown as a raw label). "mixer" for Story
  // Mixer books; legacy books keep their old adventure/mood/length values.
  adventureType: string;
  mood: string;
  lengthMode: string;
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
  // Whether the active generated story has been read past its opening page.
  activeStarted: boolean;
  books: StorySummary[];
  inProgress: StorySummary[];
  mixer: MixerLanding | null;
}
// ---- Story Mixer request validation ----
export const mixerStartInput = z.object({ id: z.uuid() }).strict();
export const mixerAnswerInput = z
  .object({
    sessionId: z.uuid(),
    questionId: z.string().min(1).max(64),
    optionId: z.string().min(1).max(32),
    custom: z.string().trim().max(100).optional(),
  })
  .strict();
export const mixerRevealInput = z
  .object({ sessionId: z.uuid(), id: z.uuid() })
  .strict();
// In-story decisions (and single "turn the page" advances) share this shape.
export const chooseInput = z
  .object({
    storyId: z.uuid(),
    sequence: z.number().int().min(0),
    choiceId: z.string().min(1).max(40),
  })
  .strict();
