import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFile, readdir } from "node:fs/promises";
import { D1Store } from "../src/lib/server/db";
export class TestDatabase {
  private mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("test")}}',
      compatibilityDate: "2026-09-08",
      d1Databases: ["DB"],
    }),
  );
  private async binding() {
    return this.mf.getD1Database("DB");
  }
  private async store() {
    return new D1Store(await this.binding());
  }
  async query<T>(sql: string, values?: unknown[]) {
    return (await this.store()).query<T>(sql, values);
  }
  async batch(statements: import("../src/lib/server/db").Statement[]) {
    return (await this.store()).batch(statements);
  }
  async exec(sql: string) {
    // Test-only trusted schema/reset SQL. Keep trigger bodies together.
    const clean = sql.replace(/--[^\n]*/g, "").trim() + ";";
    const statements =
      clean.match(/\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g) ?? [];
    const db = await this.binding();
    for (const sql of statements) await db.prepare(sql).all();
  }
  async migrate() {
    for (const file of (await readdir("db/d1"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await this.exec(await readFile("db/d1/" + file, "utf8"));
  }
  async close() {
    await this.mf.dispose();
  }
}
