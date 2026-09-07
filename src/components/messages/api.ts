import type { ApiResult } from "@/lib/shared/types";
export async function messageRequest<T>(path = "", body?: unknown): Promise<T> {
  const response = await fetch("/api/messages" + path, {
    cache: "no-store",
    ...(body !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
export async function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
