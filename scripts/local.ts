import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
// Local-only, persistent D1/R2 emulator. Never connects to Cloudflare's account.
if (!existsSync(".dev.vars")) {
  const phrase = process.env.FAMILY_ACCESS_PHRASE;
  if (!phrase || phrase.length < 8 || phrase.length > 256)
    throw new Error(
      "For the first local start, give Codex the family magic word privately. It will be saved in ignored .dev.vars, not Git.",
    );
  writeFileSync(
    ".dev.vars",
    `APP_ORIGIN="http://localhost:3101"\nFAMILY_ACCESS_PHRASE=${JSON.stringify(phrase)}\n${process.env.ADMIN_ACCESS_KEY ? `ADMIN_ACCESS_KEY=${JSON.stringify(process.env.ADMIN_ACCESS_KEY)}\n` : ""}`,
    { mode: 0o600 },
  );
}
if (!readFileSync(".dev.vars", "utf8").includes("http://localhost:3101"))
  throw new Error("Local .dev.vars must use APP_ORIGIN http://localhost:3101");
const run = (args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const p = spawn(process.execPath, args, {
      stdio: "inherit",
      env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" },
    });
    p.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error("Local command failed")),
    );
    p.on("error", reject);
  });
await run([
  "node_modules/wrangler/bin/wrangler.js",
  "d1",
  "migrations",
  "apply",
  "DB",
  "--local",
]);
if (process.argv.includes("--preview"))
  await run([
    "node_modules/wrangler/bin/wrangler.js",
    "dev",
    "--ip",
    "127.0.0.1",
    "--port",
    "3101",
  ]);
else
  await run([
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3101",
  ]);
