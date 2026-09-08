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
const phrase = credential("FAMILY_ACCESS_PHRASE", 8);
const adminKey = process.env.ADMIN_ACCESS_KEY
  ? credential("ADMIN_ACCESS_KEY", 12)
  : null;
if (adminKey === phrase)
  throw new Error("The administration key must differ from the family phrase.");
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
    "INSERT INTO families (id, name, timezone, access_phrase_hash, admin_key_hash) VALUES ($1,$2,$3,$4,$5)",
    [
      FAMILY_ID,
      "Home Base",
      timezone,
      hash(phrase),
      adminKey ? hash(adminKey) : null,
    ],
  );
  for (const p of INITIAL_PROFILES) {
    await client.query(
      "INSERT INTO profiles (id, family_id, profile_key, display_name, role, avatar, profile_color) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [p.id, FAMILY_ID, p.key, p.displayName, p.role, p.avatar, p.color],
    );
  }
  await client.query("COMMIT");
  console.log(
    "Created Mia (child), Mom (admin), and Dad (admin). Remove initial family phrase and administration key from the setup environment now.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
