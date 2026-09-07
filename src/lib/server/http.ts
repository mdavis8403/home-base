import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "./errors";
import { appOrigin } from "./config";
import type { ApiResult } from "../shared/types";
export function assertSameOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin())
    throw new AppError("CSRF", "Please reload Home Base and try again.", 403);
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none")
    throw new AppError("CSRF", "Please reload Home Base and try again.", 403);
}
export async function readJson(request: Request, maxBytes = 4096) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError("INVALID_REQUEST", "Expected a JSON request.", 415);
  // Stream with an actual cap rather than trusting Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("INVALID_REQUEST", "Request is empty.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new AppError("INVALID_REQUEST", "Request is too large.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new AppError("INVALID_REQUEST", "Request is not valid JSON.");
  }
}
export function success<T>(data: T) {
  return NextResponse.json<ApiResult<T>>(
    { ok: true, data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export function failure(error: unknown) {
  const known =
    error instanceof AppError
      ? error
      : error instanceof z.ZodError
        ? new AppError("INVALID_REQUEST", "Please check your entries.")
        : new AppError(
            "UNAVAILABLE",
            "Home Base could not connect. Please try again shortly.",
            503,
          );
  return NextResponse.json<ApiResult<never>>(
    { ok: false, error: { code: known.code, message: known.message } },
    {
      status: known.status,
      headers: {
        "Cache-Control": "no-store",
        ...(known.status === 429 ? { "Retry-After": "900" } : {}),
      },
    },
  );
}
