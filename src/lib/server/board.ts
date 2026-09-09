import "server-only";
import { boardPrompts } from "./board-prompts";
import { familyDate, revealInstant } from "./board-time";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "./db";
import type { Session, MediaAsset } from "../shared/types";
import {
  responseInput,
  promptInput,
  settingsInput,
  type BoardData,
  type BoardItem,
} from "../shared/board";
import { AuthService } from "./auth-service";
import { AppError } from "./errors";
import { MediaService, mediaPath, type PrivateStorage } from "./media";
import { inspectAttachment } from "./message-media";
const revealed =
  "(b.revealed_at IS NOT NULL OR b.reveal_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now'))";
export class BoardService {
  constructor(
    private db: Database,
    private storage?: PrivateStorage,
  ) {}
  private check(
    s: Session,
    permission:
      "family:use" | "content:manage" | "family:manage" = "family:use",
  ) {
    const guard: AuthService = new AuthService(this.db);
    guard.require(s, permission);
  }
  async open(s: Session) {
    this.check(s);
    const f = await this.preferences(s);
    const today = familyDate(f.timezone);
    await this.db.batch(
      boardPrompts.map(([type, text, category, key]) => ({
        sql: `INSERT INTO board_prompts(id,family_id,prompt_type,prompt_text,category,builtin_key)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(family_id,builtin_key) DO NOTHING`,
        values: [randomUUID(), s.profile.familyId, type, text, category, key],
      })),
    );
    await this.db.query(
      `INSERT INTO board_days(id,family_id,date,prompt_id,reveal_at)
      SELECT $1,$2,$3,p.id,$4 FROM board_prompts p LEFT JOIN board_days b ON b.prompt_id=p.id
      WHERE p.family_id=$2 AND p.active AND p.category IN (SELECT value FROM json_each($5))
      GROUP BY p.id ORDER BY max(b.date) ASC NULLS FIRST,(p.builtin_key IS NOT NULL),p.builtin_key,p.created_at,p.id LIMIT 1
      ON CONFLICT(family_id,date) DO NOTHING`,
      [
        randomUUID(),
        s.profile.familyId,
        today,
        revealInstant(today, f.revealTime, f.timezone),
        f.categories,
      ],
    );
    return this.list(s);
  }
  async list(s: Session): Promise<BoardData> {
    this.check(s);
    const f = await this.preferences(s);
    const { rows } = await this.db.query<BoardItem>(
      `
      SELECT b.id,b.date AS date,p.prompt_type AS type,p.prompt_text AS prompt,p.category,
      b.reveal_at AS "revealAt",${revealed} AS revealed,
      b.date=$3 AS today,
      coalesce((SELECT json_group_array(json_object('name',pr.display_name,'own',r.profile_id=$2,'text',coalesce(r.text_response,''),
        'media',CASE WHEN a.id IS NULL THEN NULL ELSE json_object('id',a.id,'mediaType',a.media_type,'metadata',json(a.metadata)) END) ORDER BY pr.profile_key)
        FROM board_responses r JOIN profiles pr ON pr.id=r.profile_id LEFT JOIN media_assets a ON a.id=r.media_asset_id
        WHERE r.board_day_id=b.id AND (r.profile_id=$2 OR ${revealed})), '[]') AS responses
      FROM board_days b JOIN board_prompts p ON p.id=b.prompt_id JOIN families f ON f.id=b.family_id
      WHERE b.family_id=$1 ORDER BY b.date DESC`,
      [s.profile.familyId, s.profile.id, familyDate(f.timezone)],
    );
    const custom =
      s.profile.role === "child"
        ? []
        : (
            await this.db.query<BoardData["customPrompts"][number]>(
              "SELECT id,prompt_text AS text,prompt_type AS type,category FROM board_prompts WHERE family_id=$1 AND builtin_key IS NULL ORDER BY created_at DESC,id",
              [s.profile.familyId],
            )
          ).rows;
    return {
      ...f,
      boards: rows.map((b) => ({
        ...b,
        revealAt: new Date(b.revealAt).toISOString(),
      })),
      customPrompts: custom,
    };
  }
  private async preferences(s: Session) {
    const { rows } = await this.db.query<{
      timezone: string;
      revealTime: string;
      categories: BoardData["categories"];
    }>(
      `SELECT timezone,board_reveal_time AS "revealTime",board_categories AS categories FROM families WHERE id=$1`,
      [s.profile.familyId],
    );
    if (!rows[0])
      throw new AppError("NOT_FOUND", "This board isn't available.", 404);
    return rows[0];
  }
  async respond(s: Session, raw: unknown) {
    this.check(s);
    const input = responseInput.parse(raw);
    const board = (await this.list(s)).boards.find(
      (b) => b.id === input.boardId,
    );
    if (!board)
      throw new AppError("NOT_FOUND", "This board isn't available.", 404);
    if (board.responses.some((r) => r.own)) return;
    if (!board.today)
      throw new AppError(
        "ARCHIVED",
        "This board is tucked into our memories. Try today's board.",
        409,
      );
    const attachment = input.attachment;
    if (
      board.type === "question"
        ? !input.text || attachment
        : input.text ||
          !attachment ||
          attachment.kind !== (board.type === "photo" ? "photo" : "doodle")
    )
      throw new AppError(
        "INVALID_RESPONSE",
        "Add your answer, photo, or drawing for this prompt.",
      );
    let asset: MediaAsset | undefined;
    if (attachment) {
      if (!this.storage)
        throw new AppError(
          "MEDIA_UNAVAILABLE",
          "Private photo and drawing storage needs to be connected before we can save this.",
          503,
        );
      const inspected = await inspectAttachment(attachment);
      const id = randomUUID();
      asset = {
        id,
        familyId: s.profile.familyId,
        ownerProfileId: s.profile.id,
        entity: "board",
        entityId: board.id,
        storagePath: mediaPath(s.profile.familyId, "board", board.id, id),
        mediaType: attachment.kind,
        metadata: inspected.metadata,
      };
      await this.storage.put(
        asset.storagePath,
        inspected.data,
        inspected.metadata.contentType,
      );
    }
    try {
      const today = familyDate((await this.preferences(s)).timezone);
      const responseId = randomUUID();
      const statements: import("./db").Statement[] = [];
      if (asset)
        statements.push({
          sql: `INSERT INTO media_assets(id,family_id,owner_profile_id,related_entity_type,related_entity_id,storage_path,media_type,metadata)
        SELECT $1,$2,$3,'board',b.id,$4,$5,$6 FROM board_days b WHERE b.id=$7 AND b.family_id=$2 AND b.date=$8
        AND NOT EXISTS(SELECT 1 FROM board_responses WHERE board_day_id=b.id AND profile_id=$3)`,
          values: [
            asset.id,
            asset.familyId,
            asset.ownerProfileId,
            asset.storagePath,
            asset.mediaType,
            JSON.stringify(asset.metadata),
            board.id,
            today,
          ],
        });
      statements.push({
        sql: `INSERT INTO board_responses(id,family_id,board_day_id,profile_id,text_response,media_asset_id)
        SELECT $1,$2,b.id,$3,$4,$5 FROM board_days b WHERE b.id=$6 AND b.family_id=$2 AND b.date=$7
        ON CONFLICT(board_day_id,profile_id) DO NOTHING RETURNING id`,
        values: [
          responseId,
          s.profile.familyId,
          s.profile.id,
          input.text,
          asset?.id ?? null,
          board.id,
          today,
        ],
      });
      const results = await this.db.batch(statements);
      if (!results.at(-1)!.rows.length && asset)
        await this.storage!.remove(asset.storagePath);
    } catch (error) {
      if (asset) await this.storage!.remove(asset.storagePath).catch(() => {});
      throw error;
    }
  }
  async addPrompt(s: Session, raw: unknown) {
    this.check(s, "content:manage");
    const p = promptInput.parse(raw);
    await this.db.query(
      `INSERT INTO board_prompts(id,family_id,prompt_type,prompt_text,category) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING`,
      [p.id, s.profile.familyId, p.type, p.text, p.category],
    );
  }
  async settings(s: Session, raw: unknown) {
    this.check(s, "family:manage");
    const p = settingsInput.parse(raw);
    await this.db.query(
      "UPDATE families SET board_reveal_time=$2,board_categories=$3 WHERE id=$1",
      [s.profile.familyId, p.revealTime, p.categories],
    );
  }
  async mediaUrl(s: Session, id: string) {
    this.check(s);
    z.uuid().parse(id);
    const { rows } = await this.db.query<MediaAsset>(
      `SELECT id,family_id AS "familyId",owner_profile_id AS "ownerProfileId",related_entity_type AS entity,
      related_entity_id AS "entityId",storage_path AS "storagePath",media_type AS "mediaType",metadata FROM media_assets WHERE id=$1 AND family_id=$2 AND related_entity_type='board'`,
      [id, s.profile.familyId],
    );
    if (!rows[0])
      throw new AppError("NOT_FOUND", "This picture isn't available.", 404);
    if (!this.storage)
      throw new AppError(
        "MEDIA_UNAVAILABLE",
        "Private media storage isn't connected yet.",
        503,
      );
    return new MediaService(this.storage, async (session, a) => {
      const access = await this.db.query(
        `SELECT r.id FROM board_responses r JOIN board_days b ON b.id=r.board_day_id
        WHERE r.media_asset_id=$1 AND b.id=$2 AND b.family_id=$3 AND r.profile_id=$4 AND (r.profile_id=$5 OR ${revealed})`,
        [
          a.id,
          a.entityId,
          session.profile.familyId,
          a.ownerProfileId,
          session.profile.id,
        ],
      );
      return access.rows.length > 0;
    }).readUrl(s, rows[0]);
  }
}
