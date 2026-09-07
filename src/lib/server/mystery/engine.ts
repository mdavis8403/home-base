import "server-only";
import type { Puzzle, MysteryPackage } from "../../shared/mystery/schema";
import type { GameState, PublicPuzzle } from "../../shared/mystery/types";
export function normalize(value: string, mode = "whitespace") {
  return mode === "exact"
    ? value
    : mode === "case-insensitive"
      ? value.toLocaleLowerCase("en-US")
      : value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
export function checkAnswer(p: Puzzle, answer: unknown): boolean {
  if (Array.isArray(p.solution))
    return (
      Array.isArray(answer) &&
      answer.length === p.solution.length &&
      answer.every(
        (v, i) =>
          typeof v === "string" && normalize(v) === normalize(p.solution[i]),
      )
    );
  return (
    typeof answer === "string" &&
    normalize(answer, p.type === "code" ? p.normalization : "whitespace") ===
      normalize(p.solution, p.type === "code" ? p.normalization : "whitespace")
  );
}
export function publicPuzzle(p: Puzzle): PublicPuzzle {
  const { solution, hints, resolution, ...safe } = p;
  void solution;
  void hints;
  void resolution;
  return safe;
}
export function initialState(): GameState {
  return { solved: [], hints: {} };
}
export function totalHints(state: GameState) {
  return Object.values(state.hints).reduce((a, b) => a + b, 0);
}
export function sceneFor(c: MysteryPackage, id: string) {
  const s = c.scenes.find((s) => s.id === id);
  if (!s) throw new Error("Invalid saved scene");
  return s;
}
