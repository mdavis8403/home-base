import { currentSession, auth } from "@/lib/server/auth";
import { AuthService } from "@/lib/server/auth-service";
import { messages } from "@/lib/server/message-service";
import { boardService } from "@/lib/server/board-service";
import { database } from "@/lib/server/db";
import { bindings } from "@/lib/server/cloudflare";
import { failure } from "@/lib/server/http";
import { AppError } from "@/lib/server/errors";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  try {
    const session = await currentSession();
    const guard: AuthService = auth();
    guard.require(session, "family:use");
    const { entity, id } = await params;
    if (entity === "messages") await messages().mediaUrl(session, id);
    else if (entity === "board") await boardService().mediaUrl(session, id);
    else throw new AppError("NOT_FOUND", "This item is not available.", 404);
    const { rows } = await database().query<{ storage_path: string }>(
      `SELECT storage_path FROM media_assets WHERE id=$1 AND family_id=$2 AND related_entity_type=$3`,
      [id, session.profile.familyId, entity],
    );
    if (!rows[0])
      throw new AppError("NOT_FOUND", "This item is not available.", 404);
    const range = request.headers.get("range");
    const object = await bindings().FAMILY_MEDIA.get(
      rows[0].storage_path,
      range
        ? {
            range:
              request.headers as unknown as import("@cloudflare/workers-types").Headers,
          }
        : undefined,
    );
    if (!object)
      throw new AppError("NOT_FOUND", "This item is not available.", 404);
    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "Accept-Ranges": "bytes",
      Vary: "Cookie",
    });
    let status = 200;
    if (
      range &&
      object.range &&
      "offset" in object.range &&
      "length" in object.range
    ) {
      const offset = object.range.offset ?? 0,
        length = object.range.length ?? object.size;
      headers.set(
        "Content-Range",
        `bytes ${offset}-${offset + length - 1}/${object.size}`,
      );
      headers.set("Content-Length", String(length));
      status = 206;
    } else headers.set("Content-Length", String(object.size));
    return new Response(object.body as unknown as ReadableStream, {
      status,
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
