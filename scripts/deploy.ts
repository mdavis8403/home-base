import { spawnSync } from "node:child_process";
// Run only from the deliberately configured production Workers Build.
// Wrangler auto-provisions the named D1 and private R2 bindings on the first deploy.
for (const args of [
  ["deploy"],
  ["d1", "migrations", "apply", "DB", "--remote"],
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
