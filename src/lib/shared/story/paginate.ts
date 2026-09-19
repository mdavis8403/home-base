// Page-fitting for the storybook. The reader must stay resilient to
// variable-length narration (future AI prose) without clipping text or shrinking
// it to fit: instead, narration flows across as many printed pages as it needs.
//
// This is the pure, deterministic core so it can be unit-tested and reused by the
// DOM-measuring reader. `fits` is supplied by the caller — in the browser it
// measures rendered height against a real page; in tests it can be a simple stub.
// A single paragraph too tall for one page still gets its own page (never
// dropped); the page contains it as a last resort rather than losing the words.
export function paginateParagraphs(
  paragraphs: string[],
  fits: (candidate: string[]) => boolean,
): string[][] {
  const clean = paragraphs.filter((p) => p.trim().length > 0);
  if (clean.length === 0) return [[]];
  const columns: string[][] = [];
  let current: string[] = [];
  for (const p of clean) {
    if (current.length === 0) {
      current.push(p);
      continue;
    }
    if (fits([...current, p])) {
      current.push(p);
    } else {
      columns.push(current);
      current = [p];
    }
  }
  columns.push(current);
  return columns;
}

// Pair a run of narration columns into left/right leaves of successive spreads.
// The final spread may have only a left leaf (odd column count); callers decide
// what fills the empty right leaf (e.g. nothing, or the interaction).
export function pairColumns(columns: string[][]): Array<[string[], string[] | null]> {
  const pairs: Array<[string[], string[] | null]> = [];
  for (let i = 0; i < columns.length; i += 2) {
    pairs.push([columns[i], columns[i + 1] ?? null]);
  }
  return pairs;
}
