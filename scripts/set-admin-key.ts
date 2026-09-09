// Offline recovery helper for Codex. Never imported by the app or invoked by deployment.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const key = process.env.ADMIN_ACCESS_KEY;
if (!key || key.length < 12 || key.length > 256)
  throw new Error("ADMIN_ACCESS_KEY must be 12–256 characters.");
const location = process.argv.includes("--remote") ? "--remote" : "--local";
const folder = mkdtempSync(join(tmpdir(), "homebase-admin-recovery-"));
function query(sql: string) {
  const file = join(folder, "recovery.sql");
  writeFileSync(file, sql, { mode: 0o600 });
  const r = spawnSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      location,
      "--file",
      file,
      "--json",
    ],
    {
      encoding: "utf8",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
  // Never print database results, credential hashes, or the SQL to the console.
  if (r.status !== 0)
    throw new Error(
      "D1 recovery could not complete. Check the account/database configuration.",
    );
  return JSON.parse(r.stdout) as {
    results: { id: string; access_phrase_hash: string }[];
  }[];
}
try {
  const rows = query("SELECT id,access_phrase_hash FROM families;")[0].results;
  if (rows.length !== 1)
    throw new Error("Recovery requires exactly one configured family.");
  const [scheme, salt, encoded] = rows[0].access_phrase_hash.split(":");
  if (scheme !== "scrypt" || !/^[0-9a-f]{128}$/.test(encoded))
    throw new Error("Unrecognized family credential format.");
  if (timingSafeEqual(scryptSync(key, salt, 64), Buffer.from(encoded, "hex")))
    throw new Error(
      "The administration key must be different from the family phrase.",
    );
  const freshSalt = randomBytes(16).toString("hex");
  const hash = `scrypt:${freshSalt}:${scryptSync(key, freshSalt, 64).toString("hex")}`;
  // A trigger makes changing the key and clearing grants one atomic D1 statement.
  query(
    `UPDATE families SET admin_key_hash='${hash}' WHERE id='${rows[0].id.replaceAll("'", "''")}';`,
  );
  console.log(
    "Administration key replaced. Previous administrative grants were cleared.",
  );
} finally {
  rmSync(folder, { recursive: true, force: true });
}
