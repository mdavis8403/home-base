import "server-only";
import { hashCredential } from "./crypto";
import type { Database } from "./db";
import { FAMILY_ID, INITIAL_PROFILES } from "../shared/profiles";
export async function initializeFamily(
  db: Database,
  settings: {
    FAMILY_ACCESS_PHRASE?: string;
    ADMIN_ACCESS_KEY?: string;
    FAMILY_TIMEZONE?: string;
  },
) {
  if ((await db.query("SELECT id FROM families LIMIT 1")).rows.length) return;
  const phrase = settings.FAMILY_ACCESS_PHRASE,
    key = settings.ADMIN_ACCESS_KEY;
  if (!phrase || phrase.length < 8 || phrase.length > 256)
    throw new Error("FAMILY_ACCESS_PHRASE must be 8–256 characters");
  if (key && (key.length < 12 || key.length > 256))
    throw new Error("ADMIN_ACCESS_KEY must be 12–256 characters");
  if (key === phrase)
    throw new Error(
      "The administration key must differ from the family phrase",
    );
  const timezone = settings.FAMILY_TIMEZONE || "America/Chicago";
  new Intl.DateTimeFormat("en", { timeZone: timezone });
  // One transaction, deterministic family/profile IDs. Concurrent first requests
  // are safe; an existing family's credentials and content are never overwritten.
  await db.batch([
    {
      sql: `INSERT INTO families(id,name,timezone,access_phrase_hash,admin_key_hash)
    VALUES($1,'Home Base',$2,$3,$4) ON CONFLICT(id) DO NOTHING`,
      values: [
        FAMILY_ID,
        timezone,
        await hashCredential(phrase),
        key ? await hashCredential(key) : null,
      ],
    },
    ...INITIAL_PROFILES.map((p) => ({
      sql: `INSERT INTO profiles(id,family_id,profile_key,display_name,role,avatar,profile_color)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,
      values: [
        p.id,
        FAMILY_ID,
        p.key,
        p.displayName,
        p.role,
        p.avatar,
        p.color,
      ],
    })),
  ]);
}
