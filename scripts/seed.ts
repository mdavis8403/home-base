import { randomBytes, scryptSync } from "node:crypto";
import { Pool } from "pg";
import { FAMILY_ID, INITIAL_PROFILES } from "../src/lib/shared/profiles";
function credential(name: string, minimum: number) {
  const value = process.env[name];
  if (!value || value.length < minimum || value.length > 256)
    throw new Error(
      `${name} must be ${minimum}–256 characters; no default credentials are supplied.`,
    );
  return value;
}
function hash(value: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
}
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL first.");
const phrase = credential("FAMILY_ACCESS_PHRASE", 16);
const passcodes = INITIAL_PROFILES.map((p) =>
  credential(`${p.key.toUpperCase()}_PASSCODE`, 6),
);
if (new Set(passcodes).size !== 3)
  throw new Error("Use different passcodes for Mia, Mom, and Dad.");
const timezone = process.env.FAMILY_TIMEZONE ?? "America/Chicago";
new Intl.DateTimeFormat("en", { timeZone: timezone });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(7241901)");
  const existing = await client.query("SELECT id FROM families");
  if (existing.rows.length)
    throw new Error(
      "A family already exists. Seed will never replace credentials or family data.",
    );
  await client.query(
    "INSERT INTO families (id, name, timezone, access_phrase_hash) VALUES ($1,$2,$3,$4)",
    [FAMILY_ID, "Home Base", timezone, hash(phrase)],
  );
  for (const [index, p] of INITIAL_PROFILES.entries()) {
    await client.query(
      "INSERT INTO profiles (id, family_id, profile_key, display_name, role, avatar, profile_color, passcode_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        p.id,
        FAMILY_ID,
        p.key,
        p.displayName,
        p.role,
        p.avatar,
        p.color,
        hash(passcodes[index]),
      ],
    );
  }
  await client.query("COMMIT");
  console.log(
    "Created Mia (child), Mom (admin), and Dad (admin). Remove initial phrase/passcodes from the setup environment now.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
