import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { verifyCredential } from "../src/lib/server/crypto";
const mocks = vi.hoisted(() => ({ query: vi.fn(), connect: vi.fn() }));
vi.mock("pg", () => ({
  Pool: class {
    connect = mocks.connect;
    end = vi.fn();
  },
}));
beforeEach(() => {
  vi.resetModules();
  mocks.query.mockReset().mockResolvedValue({ rows: [] });
  mocks.connect
    .mockReset()
    .mockResolvedValue({ query: mocks.query, release: vi.fn() });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.stubEnv("DATABASE_URL", "postgresql://unused-test-database");
  vi.stubEnv("FAMILY_ACCESS_PHRASE", "testonly");
  vi.stubEnv("ADMIN_ACCESS_KEY", "test-admin-key-only");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it.each(["testonly", "testonly9"])(
  "accepts a %s test phrase and creates credential-free profiles",
  async (phrase) => {
    vi.stubEnv("FAMILY_ACCESS_PHRASE", phrase);
    await import("../scripts/seed");
    const family = mocks.query.mock.calls.find(([sql]) =>
      sql.includes("INSERT INTO families"),
    )!;
    expect(await verifyCredential(phrase, family[1][3])).toBe(true);
    expect(family[1][3]).not.toContain(phrase);
    const profiles = mocks.query.mock.calls.filter(([sql]) =>
      sql.includes("INSERT INTO profiles"),
    );
    expect(profiles).toHaveLength(3);
    expect(await verifyCredential("test-admin-key-only", family[1][4])).toBe(
      true,
    );
    for (const [sql, values] of profiles) {
      expect(sql).not.toContain("passcode");
      expect(values).toHaveLength(7);
    }
  },
);
it.each(["", "1234567", "x".repeat(257)])(
  "rejects an out-of-range family phrase before connecting",
  async (phrase) => {
    vi.stubEnv("FAMILY_ACCESS_PHRASE", phrase);
    await expect(import("../scripts/seed")).rejects.toThrow(
      "FAMILY_ACCESS_PHRASE must be 8–256 characters",
    );
    expect(mocks.connect).not.toHaveBeenCalled();
  },
);
it("keeps the administration key separate and optional", async () => {
  vi.stubEnv("ADMIN_ACCESS_KEY", "short");
  await expect(import("../scripts/seed")).rejects.toThrow(
    "ADMIN_ACCESS_KEY must be 12–256 characters",
  );
  vi.resetModules();
  vi.stubEnv("ADMIN_ACCESS_KEY", "");
  await import("../scripts/seed");
  const family = mocks.query.mock.calls.find(([sql]) =>
    sql.includes("INSERT INTO families"),
  )!;
  expect(family[1][4]).toBeNull();
});
it("does not replace an existing family's credentials", async () => {
  mocks.query.mockImplementation(async (sql: string) => ({
    rows: sql === "SELECT id FROM families" ? [{ id: "existing" }] : [],
  }));
  await expect(import("../scripts/seed")).rejects.toThrow(
    "Seed will never replace credentials",
  );
  expect(
    mocks.query.mock.calls.some(([sql]) => /INSERT|UPDATE/.test(sql)),
  ).toBe(false);
});
it("provisions a separate administration key and invalidates previous grants", async () => {
  const { hashCredential } = await import("../src/lib/server/crypto");
  const familyHash = await hashCredential("testonly");
  mocks.query.mockImplementation(async (sql: string) => ({
    rows: sql.startsWith("SELECT id, access_phrase_hash")
      ? [{ id: "test-family", access_phrase_hash: familyHash }]
      : [],
  }));
  await import("../scripts/set-admin-key");
  const write = mocks.query.mock.calls.find(([sql]) =>
    sql.startsWith("UPDATE families"),
  )!;
  expect(await verifyCredential("test-admin-key-only", write[1][0])).toBe(true);
  expect(write[1][1]).toBe("test-family");
  expect(
    mocks.query.mock.calls.some(([sql]) =>
      sql.includes("parent_verified_until=NULL"),
    ),
  ).toBe(true);
});
it("refuses to use the family phrase as the administration key", async () => {
  const { hashCredential } = await import("../src/lib/server/crypto");
  const key = "shared-test-phrase";
  vi.stubEnv("ADMIN_ACCESS_KEY", key);
  const familyHash = await hashCredential(key);
  mocks.query.mockImplementation(async (sql: string) => ({
    rows: sql.startsWith("SELECT id, access_phrase_hash")
      ? [{ id: "test-family", access_phrase_hash: familyHash }]
      : [],
  }));
  await expect(import("../scripts/set-admin-key")).rejects.toThrow(
    "different from the family phrase",
  );
  expect(mocks.query.mock.calls.some(([sql]) => sql.startsWith("UPDATE"))).toBe(
    false,
  );
  expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
});
