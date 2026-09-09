import "server-only";
import type {
  D1Database,
  D1PreparedStatement,
} from "@cloudflare/workers-types";
import { bindings } from "./cloudflare";
export type Statement = { sql: string; values?: unknown[] };
export interface Database {
  query<T>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount?: number | null }>;
  batch(
    statements: Statement[],
  ): Promise<{ rows: unknown[]; rowCount: number }[]>;
}
const jsonFields = new Set([
  "metadata",
  "recipients",
  "hearts",
  "media",
  "responses",
  "categories",
  "content",
  "state",
  "players",
  "content_json",
  "state_json",
  "content_snapshot",
  "board_categories",
  "event_data",
]);
const boolFields = new Set([
  "scheduled",
  "read",
  "favorite",
  "loved",
  "isRecipient",
  "revealed",
  "today",
  "published",
  "ready",
  "own",
  "remembered",
  "valid",
]);
function decode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => {
        if (jsonFields.has(key) && typeof v === "string") v = JSON.parse(v);
        if (boolFields.has(key) && typeof v === "number") v = Boolean(v);
        return [key, decode(v)];
      }),
    );
  return value;
}
export class D1Store implements Database {
  constructor(private db: Pick<D1Database, "prepare" | "batch">) {}
  private prepare(sql: string, values: unknown[] = []): D1PreparedStatement {
    const ordered: unknown[] = [];
    const query = sql.replace(/\$(\d+)/g, (_, n) => {
      const v = values[Number(n) - 1];
      ordered.push(
        v instanceof Date
          ? v.toISOString()
          : typeof v === "boolean"
            ? Number(v)
            : Array.isArray(v)
              ? JSON.stringify(v)
              : v,
      );
      return "?";
    });
    return this.db.prepare(query).bind(...ordered);
  }
  async query<T>(sql: string, values?: unknown[]) {
    const r = await this.prepare(sql, values).all();
    return { rows: decode(r.results) as T[], rowCount: r.meta.changes };
  }
  async batch(statements: Statement[]) {
    const results = await this.db.batch(
      statements.map((s) => this.prepare(s.sql, s.values)),
    );
    return results.map((r) => ({
      rows: decode(r.results) as unknown[],
      rowCount: r.meta.changes,
    }));
  }
}
export function database(): Database {
  return new D1Store(bindings().DB);
}
