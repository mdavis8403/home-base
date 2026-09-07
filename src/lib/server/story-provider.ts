import "server-only";
import type { ProfileKey } from "../shared/types";
// Shared extension point only. No provider, API key, generation route, or story engine in Phase 0.
export interface StoryContext {
  narrative: string;
  decisions: ReadonlyArray<{ player: ProfileKey; response: string }>;
  nextPlayer: ProfileKey;
  mode: "quick" | "bedtime" | "epic";
}
export interface StoryContinuation {
  narrative: string;
  nextTurnPrompt: string;
  choiceOptions: string[];
  allowCustomResponse: boolean;
}
export interface StoryProvider {
  continueStory(context: StoryContext): Promise<StoryContinuation>;
}
