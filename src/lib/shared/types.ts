export type ProfileKey = "mia" | "mom" | "dad";
export type Role = "child" | "parent" | "admin";
export type Permission =
  | "family:use"
  | "settings:view"
  | "family:manage"
  | "content:manage"
  | "data:delete"
  | "security:manage"
  | "providers:manage";
export interface Profile {
  id: string;
  familyId: string;
  key: ProfileKey;
  displayName: string;
  role: Role;
  avatar: string;
  color: string;
}
export interface Session {
  id: string;
  profile: Profile;
  expiresAt: Date;
  parentVerifiedUntil: Date | null;
}
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
export type MediaType = "photo" | "audio" | "video" | "doodle";
export type MediaEntity = "messages" | "board" | "stories";
export interface MediaAsset {
  id: string;
  familyId: string;
  ownerProfileId: string;
  entity: MediaEntity;
  entityId: string;
  storagePath: string;
  mediaType: MediaType;
  metadata: {
    contentType: string;
    bytes: number;
    altText: string;
    durationSeconds?: number;
    transcript?: string;
  };
}
