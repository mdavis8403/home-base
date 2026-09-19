import { expect, it } from "vitest";
import {
  paginateParagraphs,
  pairColumns,
} from "../src/lib/shared/story/paginate";

// A capacity-based stub standing in for DOM measurement: a column "fits" while
// its combined character length stays within `cap`.
const capFits = (cap: number) => (paras: string[]) =>
  paras.join(" ").length <= cap;

it("keeps short narration on a single page", () => {
  const cols = paginateParagraphs(["one", "two", "three"], () => true);
  expect(cols).toHaveLength(1);
  expect(cols[0]).toEqual(["one", "two", "three"]);
});

it("flows long narration across multiple pages without dropping a paragraph", () => {
  const paras = Array.from({ length: 12 }, (_, i) => `paragraph number ${i}`);
  const cols = paginateParagraphs(paras, capFits(40));
  expect(cols.length).toBeGreaterThan(1);
  // Every paragraph survives, in order — nothing is clipped.
  expect(cols.flat()).toEqual(paras);
});

it("gives an over-long single paragraph its own page rather than losing it", () => {
  const huge = "x".repeat(500);
  const cols = paginateParagraphs([huge, "after"], capFits(100));
  expect(cols[0]).toEqual([huge]);
  expect(cols.flat()).toContain("after");
});

it("ignores blank paragraphs", () => {
  const cols = paginateParagraphs(["a", "   ", "", "b"], () => true);
  expect(cols[0]).toEqual(["a", "b"]);
});

it("returns one empty column for empty narration", () => {
  expect(paginateParagraphs([], () => true)).toEqual([[]]);
});

it("pairs columns into left/right leaves, last leaf may be empty", () => {
  expect(pairColumns([["a"], ["b"], ["c"]])).toEqual([
    [["a"], ["b"]],
    [["c"], null],
  ]);
});
