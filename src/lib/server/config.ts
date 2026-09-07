import "server-only";
export function appOrigin(): string {
  const value = process.env.APP_ORIGIN;
  if (!value) throw new Error("APP_ORIGIN is required.");
  const url = new URL(value);
  if (
    url.origin !== value ||
    (process.env.NODE_ENV === "production" &&
      url.protocol !== "https:" &&
      url.hostname !== "localhost" &&
      url.hostname !== "127.0.0.1")
  )
    throw new Error(
      "APP_ORIGIN must be an exact HTTPS origin (HTTP allowed for localhost).",
    );
  return url.origin;
}
