import "server-only";
import { database } from "./db";
import { S3PrivateStorage } from "./media";
import { MessagesService } from "./messages";
export function messages() {
  const configured =
    process.env.S3_BUCKET &&
    process.env.S3_REGION &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY;
  return new MessagesService(
    database(),
    configured ? new S3PrivateStorage() : undefined,
  );
}
