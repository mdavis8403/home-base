import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "./db";
import type { Session, MediaAsset } from "../shared/types";
import { messageInput, type MessageItem } from "../shared/messages";
import { AuthService } from "./auth-service";
import { AppError } from "./errors";
import { MediaService, mediaPath, type PrivateStorage } from "./media";
import { inspectAttachment } from "./message-media";

export class MessagesService {
  constructor(
    private db: Database,
    private storage?: PrivateStorage,
  ) {}
  private check(session: Session) {
    const guard: AuthService = new AuthService(this.db);
    guard.require(session, "family:use");
  }
  async list(session: Session, sent = false): Promise<MessageItem[]> {
    this.check(session);
    const { rows } = await this.db.query<MessageItem>(
      `
      SELECT m.id, p.profile_key AS sender, p.display_name AS "senderName",
      coalesce(m.text_body,'') AS text, m.send_at AS "sendAt", (m.send_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')) AS scheduled,
      (r.read_at IS NOT NULL) AS read, (r.favorited_at IS NOT NULL) AS favorite,
      (r.loved_at IS NOT NULL) AS loved, (r.id IS NOT NULL AND m.send_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')) AS "isRecipient",
      (SELECT json_group_array(pr.display_name ORDER BY pr.profile_key) FROM message_recipients rr JOIN profiles pr ON pr.id=rr.recipient_profile_id WHERE rr.message_id=m.id) AS recipients,
      (SELECT json_group_array(pr.display_name ORDER BY pr.profile_key) FROM message_recipients rr JOIN profiles pr ON pr.id=rr.recipient_profile_id WHERE rr.message_id=m.id AND rr.loved_at IS NOT NULL) AS hearts,
      coalesce((SELECT json_group_array(json_object('id',a.id,'mediaType',a.media_type,'metadata',json(a.metadata)))
        FROM media_assets a WHERE a.family_id=m.family_id AND a.related_entity_type='messages' AND a.related_entity_id=m.id),'[]') AS media
      FROM messages m JOIN profiles p ON p.id=m.sender_profile_id
      LEFT JOIN message_recipients r ON r.message_id=m.id AND r.recipient_profile_id=$2
      WHERE m.family_id=$1 AND ${sent ? "m.sender_profile_id=$2" : "r.id IS NOT NULL AND m.send_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')"}
      ORDER BY m.send_at DESC, m.id DESC`,
      [session.profile.familyId, session.profile.id],
    );
    return rows.map((r) => ({
      ...r,
      sendAt: new Date(r.sendAt).toISOString(),
    }));
  }
  async send(session: Session, raw: unknown) {
    this.check(session);
    const input = messageInput.parse(raw);
    const existing = await this.db.query<{ id: string }>(
      "SELECT id FROM messages WHERE id=$1 AND sender_profile_id=$2 AND family_id=$3",
      [input.id, session.profile.id, session.profile.familyId],
    );
    if (existing.rows.length) return { id: input.id };
    const { rows: profiles } = await this.db.query<{ id: string; key: string }>(
      "SELECT id,profile_key AS key FROM profiles WHERE family_id=$1",
      [session.profile.familyId],
    );
    const keys = input.everyone ? profiles.map((p) => p.key) : input.recipients;
    if (
      (!input.everyone && keys.includes(session.profile.key)) ||
      keys.some((k) => !profiles.some((p) => p.key === k)) ||
      (input.everyone && profiles.length !== 3)
    )
      throw new AppError(
        "INVALID_RECIPIENTS",
        "Choose someone else, or choose Everyone.",
      );
    const sendAt = input.sendAt ? new Date(input.sendAt) : new Date();
    if (input.sendAt && sendAt.getTime() <= Date.now())
      throw new AppError("INVALID_TIME", "Choose a time in the future.");
    let asset: MediaAsset | undefined;
    if (input.attachment) {
      if (!this.storage)
        throw new AppError(
          "MEDIA_UNAVAILABLE",
          "Private media storage isn't connected yet. You can still send a written note.",
          503,
        );
      const checked = await inspectAttachment(input.attachment);
      const id = randomUUID();
      asset = {
        id,
        familyId: session.profile.familyId,
        ownerProfileId: session.profile.id,
        entity: "messages",
        entityId: input.id,
        storagePath: mediaPath(
          session.profile.familyId,
          "messages",
          input.id,
          id,
        ),
        mediaType: input.attachment.kind,
        metadata: checked.metadata,
      };
      await this.storage.put(
        asset.storagePath,
        checked.data,
        checked.metadata.contentType,
      );
    }
    try {
      // D1 batch is transactional. A unique write token prevents a concurrent
      // retry from adding recipients or assets to somebody else's winning insert.
      const writeToken = randomUUID();
      const values = [
        input.id,
        session.profile.familyId,
        session.profile.id,
        input.attachment
          ? input.text
            ? "mixed"
            : input.attachment.kind
          : "text",
        input.text,
        sendAt,
        writeToken,
      ];
      const statements: import("./db").Statement[] = [
        {
          sql: `INSERT INTO messages(id,family_id,sender_profile_id,message_type,text_body,send_at,write_token)
        VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING RETURNING id`,
          values,
        },
      ];
      for (const profile of profiles.filter((p) => keys.includes(p.key)))
        statements.push({
          sql: `INSERT INTO message_recipients(id,family_id,message_id,recipient_profile_id)
          SELECT $1,$2,id,$3 FROM messages WHERE id=$4 AND write_token=$5`,
          values: [
            randomUUID(),
            session.profile.familyId,
            profile.id,
            input.id,
            writeToken,
          ],
        });
      if (asset)
        statements.push({
          sql: `INSERT INTO media_assets(id,family_id,owner_profile_id,related_entity_type,related_entity_id,storage_path,media_type,metadata)
          SELECT $1,$2,$3,'messages',id,$4,$5,$6 FROM messages WHERE id=$7 AND write_token=$8`,
          values: [
            asset.id,
            asset.familyId,
            asset.ownerProfileId,
            asset.storagePath,
            asset.mediaType,
            JSON.stringify(asset.metadata),
            input.id,
            writeToken,
          ],
        });
      const [result] = await this.db.batch(statements);
      if (!result.rows.length) {
        if (asset) await this.storage!.remove(asset.storagePath);
        const retry = await this.db.query(
          "SELECT id FROM messages WHERE id=$1 AND sender_profile_id=$2 AND family_id=$3",
          [input.id, session.profile.id, session.profile.familyId],
        );
        if (!retry.rows.length)
          throw new AppError("CONFLICT", "Please try sending again.", 409);
      }
      return { id: input.id };
    } catch (error) {
      if (asset) await this.storage!.remove(asset.storagePath).catch(() => {});
      throw error;
    }
  }
  async update(session: Session, id: string, raw: unknown) {
    this.check(session);
    z.uuid().parse(id);
    const input = z
      .object({
        action: z.enum(["read", "favorite", "love"]),
        value: z.boolean(),
      })
      .strict()
      .parse(raw);
    const column = {
      read: "read_at",
      favorite: "favorited_at",
      love: "loved_at",
    }[input.action];
    const result = await this.db.query(
      `UPDATE message_recipients AS r SET ${column}=${input.value ? "coalesce(r." + column + ",strftime('%Y-%m-%dT%H:%M:%fZ','now'))" : "NULL"}
      FROM messages m WHERE r.message_id=m.id AND m.id=$1 AND m.family_id=$2
      AND r.recipient_profile_id=$3 AND m.send_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now') RETURNING id`,
      [id, session.profile.familyId, session.profile.id],
    );
    if (!result.rows.length)
      throw new AppError("NOT_FOUND", "This message isn't available.", 404);
  }
  async mediaUrl(session: Session, id: string) {
    this.check(session);
    z.uuid().parse(id);
    const { rows } = await this.db.query<MediaAsset>(
      `SELECT id,family_id AS "familyId",owner_profile_id AS "ownerProfileId",
      related_entity_type AS entity,related_entity_id AS "entityId",storage_path AS "storagePath",
      media_type AS "mediaType",metadata FROM media_assets WHERE id=$1 AND family_id=$2 AND related_entity_type='messages'`,
      [id, session.profile.familyId],
    );
    if (!rows[0])
      throw new AppError("NOT_FOUND", "This item isn't available.", 404);
    if (!this.storage)
      throw new AppError(
        "MEDIA_UNAVAILABLE",
        "Private media storage isn't connected yet.",
        503,
      );
    return new MediaService(this.storage, async (s, a) => {
      const allowed = await this.db.query(
        `SELECT m.id FROM messages m WHERE m.id=$1 AND m.family_id=$2
        AND (m.sender_profile_id=$3 OR (m.send_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now') AND EXISTS(
          SELECT 1 FROM message_recipients r WHERE r.message_id=m.id AND r.recipient_profile_id=$3)))`,
        [a.entityId, s.profile.familyId, s.profile.id],
      );
      return allowed.rows.length > 0;
    }).readUrl(session, rows[0]);
  }
}
