import type { ApiResult } from "@/lib/shared/types";
export async function mysteryRequest<T>(path = "", body?: unknown): Promise<T> {
  const r = await fetch("/api/mystery" + path, {
    cache: "no-store",
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const result = (await r.json()) as ApiResult<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
