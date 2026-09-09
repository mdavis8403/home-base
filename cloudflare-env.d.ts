import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    FAMILY_MEDIA: R2Bucket;
    APP_ORIGIN: string;
    FAMILY_ACCESS_PHRASE?: string;
    ADMIN_ACCESS_KEY?: string;
    FAMILY_TIMEZONE?: string;
  }
}
export {};
