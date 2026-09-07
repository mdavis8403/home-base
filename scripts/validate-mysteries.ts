import { readdir, readFile, writeFile } from "node:fs/promises";
import {
  validateMystery,
  mysteryJsonSchema,
} from "../src/lib/shared/mystery/schema";
const slugs = new Set<string>();
for (const file of (await readdir("content/mysteries"))
  .filter((f) => /^\d.*\.json$/.test(f))
  .sort()) {
  const c = validateMystery(
    JSON.parse(await readFile("content/mysteries/" + file, "utf8")),
  );
  if (slugs.has(c.slug)) throw new Error("Duplicate package slug");
  slugs.add(c.slug);
  console.log(`${file}: valid — ${c.scenes.length} scenes`);
}
if (slugs.size !== 5) throw new Error("Expected five launch cases");
if (process.argv.includes("--schema"))
  await writeFile(
    "content/mysteries/mystery.schema.json",
    JSON.stringify(mysteryJsonSchema(), null, 2) + "\n",
  );
