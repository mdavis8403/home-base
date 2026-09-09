import "server-only";
import { randomUUID } from "node:crypto";
import type { Database } from "./db";
import { digest, token, verifyCredential } from "./crypto";
import { AppError } from "./errors";
import { canPerform } from "../shared/permissions";
import type { Permission, Profile, Session } from "../shared/types";
const profileSelect =
  'p.id, p.family_id AS "familyId", p.profile_key AS key, p.display_name AS "displayName", p.role, p.avatar, p.profile_color AS color';
export class AuthService {
  constructor(private db: Database) {}
  async rateLimit(bucket: string, limit: number) {
    const result = await this.db.query<{ attempts: number }>(
      `INSERT INTO auth_rate_limits (bucket, attempts, reset_at) VALUES ($1, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now','+15 minutes'))
      ON CONFLICT (bucket) DO UPDATE SET attempts = CASE WHEN auth_rate_limits.reset_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN 1 ELSE auth_rate_limits.attempts + 1 END,
      reset_at = CASE WHEN auth_rate_limits.reset_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN strftime('%Y-%m-%dT%H:%M:%fZ','now','+15 minutes') ELSE auth_rate_limits.reset_at END RETURNING attempts`,
      [bucket],
    );
    if (result.rows[0].attempts > limit)
      throw new AppError(
        "RATE_LIMITED",
        "Too many tries. Please wait 15 minutes and try again.",
        429,
      );
  }
  async begin(phrase: string) {
    await this.rateLimit("family-entry", 30);
    const { rows } = await this.db.query<{ id: string; hash: string }>(
      "SELECT id, access_phrase_hash AS hash FROM families LIMIT 1",
    );
    if (!rows[0])
      throw new AppError(
        "SETUP_REQUIRED",
        "A parent needs to finish setting up Home Base.",
        503,
      );
    if (!(await verifyCredential(phrase, rows[0].hash)))
      throw new AppError(
        "INVALID_CREDENTIALS",
        "That phrase didn’t match. Try again.",
        401,
      );
    const challenge = token();
    await this.db.query(
      "DELETE FROM auth_challenges WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')",
    );
    await this.db.query(
      "INSERT INTO auth_challenges (token_hash, family_id, expires_at) VALUES ($1,$2,strftime('%Y-%m-%dT%H:%M:%fZ','now','+5 minutes'))",
      [digest(challenge), rows[0].id],
    );
    const profiles = await this.db.query<Profile>(
      `SELECT ${profileSelect} FROM profiles p WHERE family_id = $1 ORDER BY profile_key DESC`,
      [rows[0].id],
    );
    return { challenge, profiles: profiles.rows };
  }
  async signIn(challenge: string, key: string, remember: boolean) {
    const { rows } = await this.db.query<{ family_id: string }>(
      "SELECT family_id FROM auth_challenges WHERE token_hash=$1 AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')",
      [digest(challenge)],
    );
    if (!rows[0])
      throw new AppError(
        "CHALLENGE_EXPIRED",
        "Please enter the family phrase again.",
        401,
      );
    const familyId = rows[0].family_id;
    await this.rateLimit(`profile:${familyId}`, 30);
    const profile = await this.db.query<Profile>(
      `SELECT ${profileSelect} FROM profiles p WHERE family_id=$1 AND profile_key=$2`,
      [familyId, key],
    );
    if (!profile.rows[0])
      throw new AppError(
        "INVALID_CREDENTIALS",
        "That choice is not available. Please try again.",
        401,
      );
    // Consume once, including under concurrent requests.
    const consumed = await this.db.query(
      "DELETE FROM auth_challenges WHERE token_hash=$1 AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now') RETURNING token_hash",
      [digest(challenge)],
    );
    if (!consumed.rows.length)
      throw new AppError(
        "CHALLENGE_EXPIRED",
        "Please enter the family phrase again.",
        401,
      );
    const sessionToken = token(),
      deviceToken = token();
    const lifetime = remember ? 30 * 24 * 60 * 60 : 12 * 60 * 60;
    await this.db.query(
      "DELETE FROM sessions WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')",
    );
    await this.db.query(
      `INSERT INTO sessions (id,profile_id,token_hash,device_identifier_hash,remembered,expires_at) VALUES ($1,$2,$3,$4,$5,strftime('%Y-%m-%dT%H:%M:%fZ','now', '+' || $6 || ' seconds'))`,
      [
        randomUUID(),
        profile.rows[0].id,
        digest(sessionToken),
        digest(deviceToken),
        remember,
        lifetime,
      ],
    );
    return { sessionToken, deviceToken, lifetime };
  }
  async session(
    sessionToken: string | undefined,
    deviceToken: string | undefined,
  ): Promise<Session | null> {
    if (!sessionToken || !deviceToken) return null;
    const result = await this.db.query<
      Profile & {
        sessionId: string;
        expiresAt: Date;
        parentVerifiedUntil: Date | null;
      }
    >(
      `SELECT ${profileSelect}, s.id AS "sessionId", s.expires_at AS "expiresAt", s.parent_verified_until AS "parentVerifiedUntil" FROM sessions s JOIN profiles p ON p.id=s.profile_id WHERE s.token_hash=$1 AND s.device_identifier_hash=$2 AND s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      [digest(sessionToken), digest(deviceToken)],
    );
    const row = result.rows[0];
    if (!row) return null;
    const { sessionId, expiresAt, parentVerifiedUntil, ...profile } = row;
    return {
      id: sessionId,
      profile,
      expiresAt: new Date(expiresAt),
      parentVerifiedUntil: parentVerifiedUntil
        ? new Date(parentVerifiedUntil)
        : null,
    };
  }
  require(
    session: Session | null,
    permission: Permission,
  ): asserts session is Session {
    if (!session)
      throw new AppError(
        "UNAUTHENTICATED",
        "Please enter Home Base first.",
        401,
      );
    if (!canPerform(session, permission))
      throw new AppError(
        "FORBIDDEN",
        "A parent with permission must confirm the administration key first.",
        403,
      );
  }
  async reauthenticate(session: Session, adminKey: string) {
    this.require(session, "settings:view");
    await this.rateLimit(`reauth:${session.profile.familyId}`, 10);
    const result = await this.db.query<{ hash: string }>(
      "SELECT admin_key_hash AS hash FROM families WHERE id=$1",
      [session.profile.familyId],
    );
    if (
      !result.rows[0]?.hash ||
      !(await verifyCredential(adminKey, result.rows[0].hash))
    )
      throw new AppError(
        "INVALID_CREDENTIALS",
        "The administration key wasn’t accepted. Ask the person who set up Home Base.",
        401,
      );
    await this.db.query(
      "UPDATE sessions SET parent_verified_until=strftime('%Y-%m-%dT%H:%M:%fZ','now','+10 minutes') WHERE id=$1 AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')",
      [session.id],
    );
  }
  async signOut(session: Session) {
    await this.db.query("DELETE FROM sessions WHERE id=$1", [session.id]);
  }
  async revokeOtherDevices(session: Session) {
    this.require(session, "security:manage");
    await this.db.query(
      "DELETE FROM sessions WHERE profile_id IN (SELECT id FROM profiles WHERE family_id=$1) AND id <> $2",
      [session.profile.familyId, session.id],
    );
  }
}
