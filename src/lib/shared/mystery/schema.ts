import { z } from "zod";
const id = z
  .string()
  .regex(/^(?!constructor$|prototype$)[a-z][a-z0-9-]{0,59}$/);
const text = z.string().trim().min(1).max(3000);
export const playerKeys = ["mia", "mom", "dad"] as const;
const item = z
  .object({
    id,
    label: text,
    glyph: z.string().max(12).optional(),
    path: z
      .string()
      .max(1500)
      .regex(/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/)
      .optional(),
  })
  .strict();
export const illustrationSchema = z
  .object({
    theme: z.enum([
      "stars",
      "academy",
      "camp",
      "park",
      "castle",
      "room",
      "map",
      "crest",
    ]),
    caption: text,
    objects: z
      .array(
        z
          .object({
            id,
            label: z.string().min(1).max(100),
            glyph: z.string().min(1).max(12),
            x: z.number().min(8).max(92),
            y: z.number().min(12).max(88),
          })
          .strict(),
      )
      .max(16),
  })
  .strict();
export const clueSchema = z
  .object({
    kind: z.enum([
      "note",
      "evidence",
      "suspect",
      "timeline",
      "image",
      "map",
      "audio",
    ]),
    title: text,
    text,
    art: illustrationSchema.optional(),
    tones: z
      .array(z.enum(["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "rest"]))
      .min(1)
      .max(24)
      .optional(),
  })
  .strict();
const base = {
  instruction: text,
  actor: z.enum(playerKeys).optional(),
  hints: z.tuple([text, text, text]),
  resolution: text,
};
export const puzzleSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...base,
      type: z.literal("code"),
      format: z.enum(["numeric", "alphanumeric", "phrase"]),
      normalization: z.enum(["exact", "case-insensitive", "whitespace"]),
      solution: text,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("choice"),
      options: z.array(item).min(2).max(8),
      solution: id,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("ordering"),
      options: z.array(item).min(3).max(8),
      solution: z.array(id).min(3).max(8),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("matching"),
      left: z.array(item).min(2).max(8),
      right: z.array(item).min(2).max(8),
      solution: z.array(id).min(2).max(8),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("hotspot"),
      art: illustrationSchema,
      solution: id,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("tiles"),
      options: z.array(item).min(4).max(9),
      columns: z.number().int().min(2).max(3),
      solution: z.array(id).min(4).max(9),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("cipher"),
      method: z.enum(["caesar", "substitution", "letter-number"]),
      encoded: text,
      solution: text,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("combination"),
      fields: z.array(z.string().min(1).max(80)).min(2).max(6),
      solution: z.array(text).min(2).max(6),
    })
    .strict(),
]);
export const packageSchema = z
  .object({
    schemaVersion: z.literal(1),
    slug: id,
    version: z.number().int().positive().max(1000),
    title: z.string().min(1).max(150),
    series: z.string().min(1).max(100),
    caseNumber: z.number().int().min(0).max(999),
    description: text,
    difficulty: z.enum(["Easy", "Easy/Medium", "Medium", "Medium/Hard"]),
    minutes: z.tuple([
      z.number().int().min(5).max(120),
      z.number().int().min(5).max(120),
    ]),
    cover: z
      .object({
        motif: z.enum(["owl", "crown", "music", "mountain", "castle"]),
        subtitle: text,
      })
      .strict(),
    introduction: text,
    start: id,
    scenes: z
      .array(
        z
          .object({
            id,
            title: text,
            shared: z.array(clueSchema).min(1).max(8),
            private: z
              .object({
                mia: z.array(clueSchema).min(1).max(6),
                mom: z.array(clueSchema).min(1).max(6),
                dad: z.array(clueSchema).min(1).max(6),
              })
              .strict(),
            puzzle: puzzleSchema,
            next: id.nullable(),
            finale: z.boolean(),
          })
          .strict(),
      )
      .min(2)
      .max(30),
    ending: text,
    achievement: z.string().min(1).max(100),
  })
  .strict();
export type MysteryPackage = z.infer<typeof packageSchema>;
export type Puzzle = z.infer<typeof puzzleSchema>;
export type Clue = z.infer<typeof clueSchema>;
export type Illustration = z.infer<typeof illustrationSchema>;
export function validateMystery(raw: unknown): MysteryPackage {
  const c = packageSchema.parse(raw);
  const errors: string[] = [];
  const unique = (ids: string[], label: string) => {
    if (new Set(ids).size !== ids.length)
      errors.push(`${label}: duplicate IDs`);
  };
  unique(
    c.scenes.map((s) => s.id),
    "Scenes",
  );
  if (c.minutes[0] > c.minutes[1])
    errors.push("Estimated playtime must increase");
  const seen = new Set<string>();
  let current: string | null = c.start;
  while (current) {
    if (seen.has(current)) {
      errors.push("Scene transitions must reach an ending without a cycle");
      break;
    }
    seen.add(current);
    const scene = c.scenes.find((s) => s.id === current);
    if (!scene) {
      errors.push(`Unknown scene: ${current}`);
      break;
    }
    current = scene.next;
  }
  if (seen.size !== c.scenes.length)
    errors.push("Every scene must be reachable from start");
  if (c.scenes.filter((s) => s.finale).length !== 1)
    errors.push("Exactly one final deduction is required");
  for (const s of c.scenes) {
    if (s.finale !== (s.next === null))
      errors.push(`${s.id}: only the final deduction may end the case`);
    if (s.next && !c.scenes.some((n) => n.id === s.next))
      errors.push(`${s.id}: unknown next scene`);
    for (const clue of [
      ...s.shared,
      ...s.private.mia,
      ...s.private.mom,
      ...s.private.dad,
    ]) {
      if (["image", "map"].includes(clue.kind) && !clue.art)
        errors.push(`${s.id}: picture clue needs an illustration`);
      if (clue.kind === "audio" && !clue.tones)
        errors.push(`${s.id}: audio clue needs notes and a text alternative`);
      if (clue.art)
        unique(
          clue.art.objects.map((o) => o.id),
          `${s.id} illustration`,
        );
    }
    const p = s.puzzle;
    if ("options" in p) {
      unique(
        p.options.map((o) => o.id),
        s.id,
      );
      const answers = Array.isArray(p.solution) ? p.solution : [p.solution];
      if (answers.some((a) => !p.options.some((o) => o.id === a)))
        errors.push(`${s.id}: answer not in options`);
      if (
        Array.isArray(p.solution) &&
        (new Set(p.solution).size !== p.options.length ||
          p.solution.length !== p.options.length)
      )
        errors.push(`${s.id}: solution must use every option once`);
    }
    if (
      p.type === "tiles" &&
      (p.options.length % p.columns !== 0 || p.options.some((o) => !o.path))
    )
      errors.push(`${s.id}: tiles need image fragments and complete rows`);
    if (p.type === "matching") {
      unique(
        p.left.map((o) => o.id),
        s.id,
      );
      unique(
        p.right.map((o) => o.id),
        s.id,
      );
      if (
        p.left.length !== p.right.length ||
        p.solution.length !== p.left.length ||
        new Set(p.solution).size !== p.right.length ||
        p.solution.some((a) => !p.right.some((o) => o.id === a))
      )
        errors.push(`${s.id}: matching must pair each item exactly once`);
    }
    if (p.type === "hotspot") {
      unique(
        p.art.objects.map((o) => o.id),
        s.id,
      );
      if (!p.art.objects.some((o) => o.id === p.solution))
        errors.push(`${s.id}: hotspot answer missing`);
    }
    if (p.type === "combination" && p.fields.length !== p.solution.length)
      errors.push(`${s.id}: each lock field needs an answer`);
    if (
      p.type === "code" &&
      p.format === "numeric" &&
      !/^\d+$/.test(p.solution)
    )
      errors.push(`${s.id}: numeric answer required`);
    if (
      p.type === "code" &&
      p.format === "alphanumeric" &&
      !/^[a-z0-9]+$/i.test(p.solution)
    )
      errors.push(`${s.id}: alphanumeric answer required`);
  }
  if (errors.length) throw new Error(errors.join("; "));
  return c;
}
// Exportable JSON Schema handles structure; validateMystery also checks graph/answer semantics.
export const mysteryJsonSchema = () => z.toJSONSchema(packageSchema);
