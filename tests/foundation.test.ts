import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { TestDatabase } from "./d1";

import { AuthService } from "../src/lib/server/auth-service";
import {
  hashCredential,
  verifyCredential,
  digest,
} from "../src/lib/server/crypto";
import { FAMILY_ID, INITIAL_PROFILES } from "../src/lib/shared/profiles";
import { canPerform, hasPermission } from "../src/lib/shared/permissions";
import {
  MediaService,
  mediaPath,
  type PrivateStorage,
} from "../src/lib/server/media";
import { assertSameOrigin, readJson } from "../src/lib/server/http";
import type { Database } from "../src/lib/server/db";
import type { MediaAsset, Session } from "../src/lib/shared/types";
const db = new TestDatabase();
const adapter: Database = {
  batch: (statements) => db.batch(statements),
  async query<T>(sql: string, values?: unknown[]) {
    return db.query<T>(sql, values);
  },
};
const auth = new AuthService(adapter);
const phrase = "testonly"; // Eight-character test fixture, never a real credential.
const adminKey = "test-admin-key-only";
async function login(key = "mom", remember = true) {
  const { challenge } = await auth.begin(phrase);
  return auth.signIn(challenge, key, remember);
}
async function signedIn(key = "mom") {
  const result = await login(key);
  return (await auth.session(result.sessionToken, result.deviceToken))!;
}
beforeAll(async () => {
  await db.migrate();
  await db.query(
    "INSERT INTO families (id,name,timezone,access_phrase_hash,admin_key_hash) VALUES ($1,$2,$3,$4,$5)",
    [
      FAMILY_ID,
      "Test family",
      "America/Chicago",
      await hashCredential(phrase),
      await hashCredential(adminKey),
    ],
  );
  for (const p of INITIAL_PROFILES)
    await db.query(
      "INSERT INTO profiles (id,family_id,profile_key,display_name,role,avatar,profile_color) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [p.id, FAMILY_ID, p.key, p.displayName, p.role, p.avatar, p.color],
    );
});
beforeEach(async () => {
  await db.exec(
    "DELETE FROM sessions; DELETE FROM auth_challenges; DELETE FROM auth_rate_limits;",
  );
});
afterAll(async () => {
  await db.close();
});
describe("D1 schema", () => {
  it("seeds exactly three profiles with a child and two admins", async () => {
    const { rows } = await db.query<{ role: string }>(
      "SELECT role FROM profiles",
    );
    expect(rows.map((p) => p.role).sort()).toEqual(["admin", "admin", "child"]);
  });
  it("prevents turning Mia into a parent", async () => {
    await expect(
      db.query("UPDATE profiles SET role='admin' WHERE profile_key='mia'"),
    ).rejects.toThrow();
  });
  it("prevents a message sender crossing families", async () => {
    await expect(
      db.query(
        "INSERT INTO messages (id,family_id,sender_profile_id,message_type,send_at) VALUES (lower(hex(randomblob(16))),$1,$2,'text',strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
        [FAMILY_ID, "00000000-0000-4000-8000-000000000099"],
      ),
    ).rejects.toThrow();
  });
  it("contains all reserved feature tables", async () => {
    const { rows } = await db.query<{ table_name: string }>(
      "SELECT name AS table_name FROM sqlite_master WHERE type='table'",
    );
    expect(rows.map((r) => r.table_name)).toEqual(
      expect.arrayContaining([
        "messages",
        "message_recipients",
        "media_assets",
        "board_prompts",
        "board_days",
        "board_responses",
        "mysteries",
        "mystery_sessions",
        "mystery_session_players",
        "mystery_events",
        "stories",
        "story_turns",
        "story_participants",
      ]),
    );
  });
});
describe("credentials and sessions", () => {
  it("uses salted hashes and rejects incorrect or malformed credentials", async () => {
    const hash = await hashCredential(adminKey);
    expect(hash).not.toContain(adminKey);
    expect(hash).not.toBe(await hashCredential(adminKey));
    expect(await verifyCredential(adminKey, hash)).toBe(true);
    expect(await verifyCredential("wrong", hash)).toBe(false);
    expect(await verifyCredential(adminKey, "broken")).toBe(false);
  });
  it("rejects the wrong family phrase", async () => {
    await expect(auth.begin("wrong")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });
  it("does not return credential hashes to profile selection", async () => {
    const result = await auth.begin(phrase);
    expect(result.profiles).toHaveLength(3);
    expect(JSON.stringify(result.profiles)).not.toContain("scrypt");
  });
  it("requires a valid phrase challenge before checking a profile", async () => {
    await expect(auth.signIn("forged", "mom", true)).rejects.toMatchObject({
      code: "CHALLENGE_EXPIRED",
    });
  });
  it("rejects expired challenges and unknown profiles", async () => {
    const { challenge } = await auth.begin(phrase);
    await expect(
      auth.signIn(challenge, "outsider", true),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await db.exec(
      "UPDATE auth_challenges SET expires_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 second')",
    );
    await expect(auth.signIn(challenge, "mom", true)).rejects.toMatchObject({
      code: "CHALLENGE_EXPIRED",
    });
  });
  it("stores opaque token hashes and requires both cookies", async () => {
    const result = await login();
    expect(
      await auth.session(result.sessionToken, result.deviceToken),
    ).toMatchObject({ profile: { key: "mom" } });
    expect(await auth.session(result.sessionToken, "wrong")).toBeNull();
    expect(await auth.session(undefined, result.deviceToken)).toBeNull();
    const rows = await db.query<{ token_hash: string }>(
      "SELECT token_hash FROM sessions",
    );
    expect(rows.rows[0].token_hash).toBe(digest(result.sessionToken));
  });
  it("consumes a family challenge only once", async () => {
    const { challenge } = await auth.begin(phrase);
    await auth.signIn(challenge, "mia", false);
    await expect(auth.signIn(challenge, "mom", true)).rejects.toMatchObject({
      code: "CHALLENGE_EXPIRED",
    });
  });
  it("assigns bounded remembered and temporary lifetimes", async () => {
    expect((await login("mia", false)).lifetime).toBe(43200);
    expect((await login("dad", true)).lifetime).toBe(2592000);
  });
  it("rejects expired and revoked sessions", async () => {
    const result = await login();
    const session = await auth.session(result.sessionToken, result.deviceToken);
    await auth.signOut(session!);
    expect(
      await auth.session(result.sessionToken, result.deviceToken),
    ).toBeNull();
    const second = await login();
    await db.exec(
      "UPDATE sessions SET expires_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 second')",
    );
    expect(
      await auth.session(second.sessionToken, second.deviceToken),
    ).toBeNull();
  });
  it("rate limits atomically across concurrent attempts", async () => {
    const result = await Promise.allSettled(
      Array.from({ length: 12 }, () => auth.rateLimit("concurrent", 10)),
    );
    expect(result.filter((r) => r.status === "rejected")).toHaveLength(2);
    await db.exec(
      "UPDATE auth_rate_limits SET reset_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 second')",
    );
    await expect(auth.rateLimit("concurrent", 10)).resolves.toBeUndefined();
  });
  it("rate limits repeated invalid profile selections", async () => {
    const { challenge } = await auth.begin(phrase);
    for (let i = 0; i < 30; i++)
      await expect(
        auth.signIn(challenge, "outsider", false),
      ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(auth.signIn(challenge, "mia", false)).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });
});
it("removes profile credential storage and issues just one session for concurrent choices", async () => {
  const columns = await db.query<{ column_name: string }>(
    "SELECT name AS column_name FROM pragma_table_info('profiles')",
  );
  expect(columns.rows.map((r) => r.column_name)).not.toContain("passcode_hash");
  const { challenge } = await auth.begin(phrase);
  const results = await Promise.allSettled([
    auth.signIn(challenge, "mom", false),
    auth.signIn(challenge, "dad", false),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
});
it("fails closed for missing administration keys without blocking normal entry", async () => {
  await db.query("UPDATE families SET admin_key_hash=NULL WHERE id=$1", [
    FAMILY_ID,
  ]);
  try {
    const session = await signedIn("mom");
    await expect(auth.reauthenticate(session, adminKey)).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    expect(canPerform(session, "family:use")).toBe(true);
  } finally {
    await db.query("UPDATE families SET admin_key_hash=$1 WHERE id=$2", [
      await hashCredential(adminKey),
      FAMILY_ID,
    ]);
  }
});
describe("parent permissions", () => {
  it("denies Mia settings and sensitive actions even with a forged verification date", async () => {
    const mia = await signedIn("mia");
    mia.parentVerifiedUntil = new Date(Date.now() + 100000);
    expect(canPerform(mia, "security:manage")).toBe(false);
    expect(hasPermission("child", "settings:view")).toBe(false);
    await expect(auth.reauthenticate(mia, adminKey)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(auth.revokeOtherDevices(mia)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("requires a separate administration key and binds verification to this session", async () => {
    const a = await login(),
      b = await login();
    let session = (await auth.session(a.sessionToken, a.deviceToken))!;
    await expect(auth.revokeOtherDevices(session)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(auth.reauthenticate(session, "wrong")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    await auth.reauthenticate(session, adminKey);
    session = (await auth.session(a.sessionToken, a.deviceToken))!;
    expect(canPerform(session, "security:manage")).toBe(true);
    expect(
      canPerform(
        (await auth.session(b.sessionToken, b.deviceToken))!,
        "security:manage",
      ),
    ).toBe(false);
    expect(
      canPerform(session, "security:manage", new Date(Date.now() + 11 * 60000)),
    ).toBe(false);
    await auth.revokeOtherDevices(session);
    expect(await auth.session(b.sessionToken, b.deviceToken)).toBeNull();
    expect(await auth.session(a.sessionToken, a.deviceToken)).not.toBeNull();
  });
  it("reserves provider and authentication management for admins", () => {
    expect(hasPermission("parent", "family:manage")).toBe(true);
    expect(hasPermission("parent", "security:manage")).toBe(false);
    expect(hasPermission("parent", "providers:manage")).toBe(false);
  });
});
describe("HTTP boundary", () => {
  beforeEach(() => {
    vi.stubEnv("APP_ORIGIN", "https://home.example");
  });
  afterAll(() => vi.unstubAllEnvs());
  it("rejects missing and cross-site origins", () => {
    expect(() =>
      assertSameOrigin(new Request("https://home.example")),
    ).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("https://home.example", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("https://home.example", {
          headers: {
            origin: "https://home.example",
            "sec-fetch-site": "cross-site",
          },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("https://home.example", {
          headers: { origin: "https://home.example" },
        }),
      ),
    ).not.toThrow();
  });
  it("caps actual body size even with a forged content length", async () => {
    await expect(
      readJson(
        new Request("https://home.example", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": "2",
          },
          body: JSON.stringify({ text: "x".repeat(5000) }),
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("rejects malformed JSON and non-JSON content", async () => {
    await expect(
      readJson(
        new Request("https://home.example", { method: "POST", body: "oops" }),
      ),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      readJson(
        new Request("https://home.example", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
});
describe("private media boundary", () => {
  const storage: PrivateStorage = {
    signRead: vi.fn(async () => "https://private.example/temporary"),
    put: vi.fn(),
    remove: vi.fn(),
  };
  const assetId = "00000000-0000-4000-8000-000000000090",
    entityId = "00000000-0000-4000-8000-000000000091";
  const asset: MediaAsset = {
    id: assetId,
    familyId: FAMILY_ID,
    ownerProfileId: INITIAL_PROFILES[1].id,
    entity: "messages",
    entityId,
    storagePath: mediaPath(FAMILY_ID, "messages", entityId, assetId),
    mediaType: "photo",
    metadata: { contentType: "image/png", bytes: 10, altText: "Test image" },
  };
  it("denies access by default, including owners/admins", async () => {
    await expect(
      new MediaService(storage).readUrl(await signedIn(), asset),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("requires family scope and a feature-specific server policy", async () => {
    const session = await signedIn();
    const service = new MediaService(storage, async () => true);
    expect(await service.readUrl(session, asset)).toMatchObject({
      expiresIn: 60,
    });
    await expect(
      service.readUrl(session, { ...asset, familyId: entityId }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      service.readUrl(session, { ...asset, storagePath: "other/object" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const expired: Session = { ...session, expiresAt: new Date(0) };
    await expect(service.readUrl(expired, asset)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("rejects path traversal", () => {
    expect(() => mediaPath(FAMILY_ID, "messages", "../../private")).toThrow();
  });
});
it("clears existing administrative grants atomically when the family administration key changes", async () => {
  const result = await login();
  const session = (await auth.session(
    result.sessionToken,
    result.deviceToken,
  ))!;
  await auth.reauthenticate(session, adminKey);
  expect(
    canPerform(
      (await auth.session(result.sessionToken, result.deviceToken))!,
      "security:manage",
    ),
  ).toBe(true);
  await db.query("UPDATE families SET admin_key_hash=$1 WHERE id=$2", [
    await hashCredential(adminKey),
    FAMILY_ID,
  ]);
  const refreshed = (await auth.session(
    result.sessionToken,
    result.deviceToken,
  ))!;
  expect(refreshed.parentVerifiedUntil).toBeNull();
  expect(canPerform(refreshed, "family:use")).toBe(true);
  expect(canPerform(refreshed, "security:manage")).toBe(false);
});
