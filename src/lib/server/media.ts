import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { MediaAsset, MediaEntity, Session } from "../shared/types";
import { AppError } from "./errors";
export interface PrivateStorage {
  signRead(path: string, seconds: number): Promise<string>;
  put(path: string, data: Uint8Array, contentType: string): Promise<void>;
  remove(path: string): Promise<void>;
}
export function mediaPath(
  familyId: string,
  entity: MediaEntity,
  entityId: string,
  assetId: string = randomUUID(),
): string {
  for (const id of [familyId, entityId, assetId]) z.uuid().parse(id);
  z.enum(["messages", "board", "stories"]).parse(entity);
  return `family/${familyId}/${entity}/${entityId}/${assetId}`;
}
export class R2PrivateStorage implements PrivateStorage {
  constructor(private bucket: import("@cloudflare/workers-types").R2Bucket) {}
  async signRead(path: string, seconds: number) {
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 60)
      throw new Error("Invalid lifetime");
    const parts = path.split("/");
    // This is an authenticated app URL, never a public R2 URL or bearer capability.
    // The byte route rechecks the current session and feature policy on every read.
    return `/api/private-media/${parts[2]}/${parts[4]}`;
  }
  async put(path: string, data: Uint8Array, contentType: string) {
    await this.bucket.put(path, data, {
      httpMetadata: { contentType, cacheControl: "private, no-store" },
    });
  }
  async remove(path: string) {
    await this.bucket.delete(path);
  }
}
// Phase 1 must supply a SERVER policy using delivery/reveal/clue rules. Default denies everyone,
// including parents and owners. No public route exposes the low-level storage adapter.
export type MediaReadPolicy = (
  session: Session,
  asset: MediaAsset,
) => Promise<boolean>;
export class MediaService {
  constructor(
    private storage: PrivateStorage,
    private canRead: MediaReadPolicy = async () => false,
  ) {}
  async readUrl(
    session: Session,
    asset: MediaAsset,
  ): Promise<{ url: string; expiresIn: number }> {
    if (
      session.expiresAt <= new Date() ||
      session.profile.familyId !== asset.familyId ||
      asset.storagePath !==
        mediaPath(asset.familyId, asset.entity, asset.entityId, asset.id) ||
      !(await this.canRead(session, asset))
    ) {
      throw new AppError("FORBIDDEN", "This item is not available.", 403);
    }
    return {
      url: await this.storage.signRead(asset.storagePath, 60),
      expiresIn: 60,
    };
  }
}
