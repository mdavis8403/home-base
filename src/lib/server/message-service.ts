import "server-only";
import { database } from "./db";
import { bindings } from "./cloudflare";
import { R2PrivateStorage } from "./media";
import { MessagesService } from "./messages";
export function messages() {
  const bucket = bindings().FAMILY_MEDIA;
  return new MessagesService(
    database(),
    bucket ? new R2PrivateStorage(bucket) : undefined,
  );
}
