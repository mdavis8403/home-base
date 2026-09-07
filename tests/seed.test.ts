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
  vi.stubEnv("MIA_PASSCODE", "111111");
  vi.stubEnv("MOM_PASSCODE", "222222");
  vi.stubEnv("DAD_PASSCODE", "333333");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it.each(["testonly", "testonly9"])(
  "accepts a %s test phrase and preserves hashed profile passcodes",
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
    for (const [, values] of profiles) {
      const passcode = { mia: "111111", mom: "222222", dad: "333333" }[
        values[2] as "mia" | "mom" | "dad"
      ];
      expect(await verifyCredential(passcode, values[7])).toBe(true);
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
it("keeps the profile passcode minimum and distinctness requirements", async () => {
  vi.stubEnv("MIA_PASSCODE", "12345");
  await expect(import("../scripts/seed")).rejects.toThrow(
    "MIA_PASSCODE must be 6–256 characters",
  );
  vi.resetModules();
  vi.stubEnv("MIA_PASSCODE", "222222");
  await expect(import("../scripts/seed")).rejects.toThrow(
    "Use different passcodes",
  );
  expect(mocks.connect).not.toHaveBeenCalled();
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
