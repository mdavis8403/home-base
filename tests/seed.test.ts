import { beforeEach, afterEach, expect, it } from "vitest";
import { TestDatabase } from "./d1";
import { initializeFamily } from "../src/lib/server/setup";
import { verifyCredential } from "../src/lib/server/crypto";
let db: TestDatabase;
const settings = {
  FAMILY_ACCESS_PHRASE: "testonly",
  ADMIN_ACCESS_KEY: "test-admin-key-only",
};
beforeEach(async () => {
  db = new TestDatabase();
  await db.migrate();
});
afterEach(() => db.close());
it("initializes exactly three credential-free profiles and salted family credentials", async () => {
  await initializeFamily(db, settings);
  const { rows } = await db.query<{
    access_phrase_hash: string;
    admin_key_hash: string;
  }>("SELECT * FROM families");
  expect(
    await verifyCredential(
      settings.FAMILY_ACCESS_PHRASE,
      rows[0].access_phrase_hash,
    ),
  ).toBe(true);
  expect(
    await verifyCredential(settings.ADMIN_ACCESS_KEY, rows[0].admin_key_hash),
  ).toBe(true);
  expect(
    (await db.query("SELECT profile_key FROM profiles")).rows,
  ).toHaveLength(3);
  const columns = await db.query<{ name: string }>(
    "SELECT name FROM pragma_table_info('profiles')",
  );
  expect(columns.rows.map((c) => c.name)).not.toContain("passcode_hash");
});
it.each(["", "1234567", "x".repeat(257)])(
  "rejects invalid family phrase without partial setup",
  async (phrase) => {
    await expect(
      initializeFamily(db, { ...settings, FAMILY_ACCESS_PHRASE: phrase }),
    ).rejects.toThrow("8–256");
    expect((await db.query("SELECT * FROM families")).rows).toEqual([]);
  },
);
it("keeps the admin key optional, separate, and at least twelve characters", async () => {
  await expect(
    initializeFamily(db, { ...settings, ADMIN_ACCESS_KEY: "short" }),
  ).rejects.toThrow("12–256");
  await expect(
    initializeFamily(db, {
      FAMILY_ACCESS_PHRASE: "same-test-phrase",
      ADMIN_ACCESS_KEY: "same-test-phrase",
    }),
  ).rejects.toThrow("differ");
  await initializeFamily(db, { FAMILY_ACCESS_PHRASE: "testonly" });
  expect(
    (
      await db.query<{ admin_key_hash: string | null }>(
        "SELECT admin_key_hash FROM families",
      )
    ).rows[0].admin_key_hash,
  ).toBeNull();
});
it("does not overwrite existing credentials or create duplicates on concurrent setup", async () => {
  await Promise.all([
    initializeFamily(db, settings),
    initializeFamily(db, settings),
  ]);
  await initializeFamily(db, { FAMILY_ACCESS_PHRASE: "different-test-phrase" });
  expect((await db.query("SELECT * FROM profiles")).rows).toHaveLength(3);
  const { rows } = await db.query<{ access_phrase_hash: string }>(
    "SELECT access_phrase_hash FROM families",
  );
  expect(await verifyCredential("testonly", rows[0].access_phrase_hash)).toBe(
    true,
  );
});
it("rolls back the whole D1 batch if profile creation fails", async () => {
  await db.exec(
    "CREATE TRIGGER test_failure BEFORE INSERT ON profiles BEGIN SELECT RAISE(ABORT,'test failure'); END;",
  );
  await expect(initializeFamily(db, settings)).rejects.toThrow("test failure");
  expect((await db.query("SELECT * FROM families")).rows).toEqual([]);
});
