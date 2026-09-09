import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
// Fixture access through Wrangler to this run's disposable local D1 only.
// No test-only HTTP endpoint or database access is shipped to the browser.
export class BrowserTestDatabase {
  async query(sql: string, values: unknown[] = []) {
    const { config, persist } = JSON.parse(
      readFileSync(".wrangler/e2e-3101.json", "utf8"),
    );
    const statement = sql.replace(/\$(\d+)/g, (_, n) => {
      const v = values[Number(n) - 1];
      return v == null
        ? "NULL"
        : typeof v === "number"
          ? String(v)
          : `'${String(v).replaceAll("'", "''")}'`;
    });
    const result = spawnSync(
      process.execPath,
      [
        "node_modules/wrangler/bin/wrangler.js",
        "d1",
        "execute",
        "DB",
        "--local",
        "--config",
        config,
        "--persist-to",
        persist,
        "--command",
        statement,
        "--json",
      ],
      {
        encoding: "utf8",
        env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      },
    );
    if (result.status !== 0)
      throw new Error("Local D1 fixture command failed: " + result.stderr);
  }
  async end() {}
}
