import type { ProfileKey } from "../types";
import type { MysteryPackage, Puzzle, Clue } from "./schema";
type PublicVariant<T> = T extends unknown
  ? Omit<T, "solution" | "hints" | "resolution">
  : never;
export type PublicPuzzle = PublicVariant<Puzzle>;
export type CaseCard = Pick<
  MysteryPackage,
  | "slug"
  | "title"
  | "series"
  | "caseNumber"
  | "description"
  | "difficulty"
  | "minutes"
  | "cover"
> & {
  id: string;
  published: boolean;
  activeId: string | null;
  solved: boolean;
  completedId: string | null;
};
export interface GameState {
  solved: string[];
  hints: Record<string, number>;
}
export interface GameView {
  id: string;
  revision: number;
  status: "lobby" | "playing" | "completed";
  joined: boolean;
  title: string;
  cover: MysteryPackage["cover"];
  introduction: string;
  players: { key: ProfileKey; name: string; ready: boolean }[];
  scene: null | {
    id: string;
    title: string;
    shared: Clue[];
    private: Clue[];
    puzzle: PublicPuzzle | null;
    instruction: string;
    operator: ProfileKey | null;
    hints: string[];
    solved: boolean;
    resolution: string | null;
    finale: boolean;
  };
  notebook: { title: string; clues: Clue[]; resolution: string }[];
  summary: null | {
    ending: string;
    achievement: string;
    puzzles: number;
    hints: number;
    completedAt: string;
  };
}
