import { randomBytes, scryptSync } from "node:crypto";
import { Pool } from "pg";
// Offline setup operation, never a public route or a profile credential.
const key = process.env.ADMIN_ACCESS_KEY;
if (!key || key.length < 12 || key.length > 256)
  throw new Error("Set ADMIN_ACCESS_KEY to 12–256 characters privately.");
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL first.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const { rows } = await client.query<{
    id: string;
    access_phrase_hash: string;
  }>("SELECT id, access_phrase_hash FROM families FOR UPDATE");
  if (rows.length !== 1)
    throw new Error("Expected exactly one configured family.");
  const [, oldSalt, oldHash] = rows[0].access_phrase_hash.split(":");
  if (scryptSync(key, oldSalt, 64).toString("hex") === oldHash)
    throw new Error(
      "Choose an administration key different from the family phrase.",
    );
  const salt = randomBytes(16).toString("hex");
  await client.query("UPDATE families SET admin_key_hash=$1 WHERE id=$2", [
    `scrypt:${salt}:${scryptSync(key, salt, 64).toString("hex")}`,
    rows[0].id,
  ]);
  await client.query(
    "UPDATE sessions SET parent_verified_until=NULL WHERE profile_id IN (SELECT id FROM profiles WHERE family_id=$1)",
    [rows[0].id],
  );
  await client.query("COMMIT");
  console.log(
    "Administration key configured. Remove its setup environment entry.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
