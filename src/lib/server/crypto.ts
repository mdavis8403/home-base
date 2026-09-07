import "server-only";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export async function hashCredential(value: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(value, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}
export async function verifyCredential(
  value: string,
  hash: string,
): Promise<boolean> {
  const [scheme, salt, encoded] = hash.split(":");
  if (
    scheme !== "scrypt" ||
    !salt ||
    !encoded ||
    !/^[0-9a-f]{128}$/.test(encoded)
  )
    return false;
  const derived = (await scrypt(value, salt, 64)) as Buffer;
  return timingSafeEqual(derived, Buffer.from(encoded, "hex"));
}
export const token = () => randomBytes(32).toString("base64url");
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
