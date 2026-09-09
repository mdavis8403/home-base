import "server-only";
import { database } from "./db";
import { bindings } from "./cloudflare";
import { R2PrivateStorage } from "./media";
import { BoardService } from "./board";
export function boardService() {
  const bucket = bindings().FAMILY_MEDIA;
  return new BoardService(
    database(),
    bucket ? new R2PrivateStorage(bucket) : undefined,
  );
}
