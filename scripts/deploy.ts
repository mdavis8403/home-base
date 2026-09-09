import { spawnSync } from "node:child_process";
// Run only from the deliberately configured production Workers Build.
// Use the existing D1/R2 resources. Migrate before exposing code that needs the schema.
for (const args of [
  ["d1", "migrations", "apply", "DB", "--remote"],
  ["deploy"],
]) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/wrangler/bin/wrangler.js", ...args],
    {
      stdio: "inherit",
      env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" },
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
