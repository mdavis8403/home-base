import "server-only";
import { Pool } from "pg";
export interface Database {
  query<T>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount?: number | null }>;
}
let pool: Pool | undefined;
export function database(): Database {
  if (!process.env.DATABASE_URL)
    throw new Error("Home Base database is not configured.");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return {
    async query<T>(sql: string, values?: unknown[]) {
      const result = await pool!.query(sql, values);
      return { rows: result.rows as T[], rowCount: result.rowCount };
    },
  };
}
