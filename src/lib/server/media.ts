import "server-only";
import { randomUUID } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
export class S3PrivateStorage implements PrivateStorage {
  private client: S3Client;
  private bucket: string;
  constructor() {
    const {
      S3_BUCKET,
      S3_REGION,
      S3_ENDPOINT,
      S3_ACCESS_KEY_ID,
      S3_SECRET_ACCESS_KEY,
    } = process.env;
    if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY)
      throw new Error("Private media storage is not configured.");
    if (S3_ENDPOINT && new URL(S3_ENDPOINT).protocol !== "https:")
      throw new Error("Storage endpoint must use HTTPS.");
    this.bucket = S3_BUCKET;
    this.client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
    });
  }
  async signRead(path: string, seconds: number) {
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 60)
      throw new Error("Media links must expire within 60 seconds.");
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
        ResponseCacheControl: "private, no-store",
      }),
      { expiresIn: seconds },
    );
  }
  async put(path: string, data: Uint8Array, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: path,
        Body: data,
        ContentType: contentType,
        CacheControl: "private, no-store",
      }),
    );
  }
  async remove(path: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: path }),
    );
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
