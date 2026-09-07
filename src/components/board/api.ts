import type { ApiResult } from "@/lib/shared/types";
export async function boardRequest<T>(path = "", body?: unknown): Promise<T> {
  const response = await fetch("/api/board" + path, {
    cache: "no-store",
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
