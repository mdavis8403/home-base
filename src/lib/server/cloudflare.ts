import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
export function bindings(): CloudflareEnv {
  return getCloudflareContext().env;
}
export function isConfigured() {
  try {
    return Boolean(
      bindings().DB && (bindings().APP_ORIGIN || process.env.APP_ORIGIN),
    );
  } catch {
    return false;
  }
}
