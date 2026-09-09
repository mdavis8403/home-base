import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "../db";
import type { Session, ProfileKey } from "../../shared/types";
import { AuthService } from "../auth-service";
import { AppError } from "../errors";
import {
  validateMystery,
  type MysteryPackage,
} from "../../shared/mystery/schema";
import type { CaseCard, GameView, GameState } from "../../shared/mystery/types";
import {
  checkAnswer,
  initialState,
  publicPuzzle,
  sceneFor,
  totalHints,
} from "./engine";
type GameRow = {
  id: string;
  revision: number;
  status: GameView["status"];
  content: MysteryPackage;
  state: GameState;
  sceneId: string;
  completedAt: Date | null;
  players: { id: string; key: ProfileKey; name: string; ready: boolean }[];
};
export const eventInput = z
  .object({
    id: z.uuid(),
    sessionId: z.uuid(),
    revision: z.number().int().min(0),
    action: z.enum(["join", "ready", "start", "hint", "answer", "advance"]),
    sceneId: z.string().max(60).optional(),
    ready: z.boolean().optional(),
    answer: z
      .union([z.string().max(3000), z.array(z.string().max(3000)).max(9)])
      .optional(),
  })
  .strict();
export class MysteryService {
  constructor(private db: Database) {}
  private check(
    s: Session,
    permission: "family:use" | "content:manage" = "family:use",
  ) {
    const guard: AuthService = new AuthService(this.db);
    guard.require(s, permission);
  }
  async install(s: Session, cases: MysteryPackage[]) {
    this.check(s);
    // Atomic library installation. Existing packages, including unpublished ones, stay untouched.
    await this.db.batch(
      cases.map(validateMystery).map((c) => ({
        sql: `INSERT INTO mysteries(id,family_id,title,series,case_number,description,content_version,content_json,published,package_slug)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,1,$9) ON CONFLICT(family_id,package_slug) DO NOTHING`,
        values: [
          randomUUID(),
          s.profile.familyId,
          c.title,
          c.series,
          c.caseNumber,
          c.description,
          c.version,
          JSON.stringify(c),
          c.slug,
        ],
      })),
    );
    return this.library(s);
  }
  async library(s: Session): Promise<CaseCard[]> {
    this.check(s);
    const { rows } = await this.db.query<{
      id: string;
      content: MysteryPackage;
      published: boolean;
      activeId: string | null;
      completedId: string | null;
    }>(
      `SELECT m.id,m.content_json AS content,m.published,
    (SELECT id FROM mystery_sessions g WHERE g.mystery_id=m.id AND g.status<>'completed' LIMIT 1) AS "activeId",
    (SELECT id FROM mystery_sessions g WHERE g.mystery_id=m.id AND g.status='completed' ORDER BY completed_at DESC LIMIT 1) AS "completedId"
    FROM mysteries m WHERE m.family_id=$1 AND (m.published OR EXISTS(SELECT 1 FROM mystery_sessions g WHERE g.mystery_id=m.id) OR $2) ORDER BY m.case_number,m.title`,
      [s.profile.familyId, s.profile.role !== "child"],
    );
    return rows.map((r) => {
      const c = r.content;
      return {
        id: r.id,
        slug: c.slug,
        title: c.title,
        series: c.series,
        caseNumber: c.caseNumber,
        description: c.description,
        difficulty: c.difficulty,
        minutes: c.minutes,
        cover: c.cover,
        published: r.published,
        activeId: r.activeId,
        solved: !!r.completedId,
        completedId: r.completedId,
      };
    });
  }
  async newGame(s: Session, raw: unknown) {
    this.check(s);
    const p = z.object({ id: z.uuid(), caseId: z.uuid() }).strict().parse(raw);
    await this.db.query(
      `INSERT INTO mystery_sessions(id,mystery_id,family_id,status,current_scene,state_json,content_snapshot)
   SELECT $1,m.id,$2,'lobby',json_extract(m.content_json,'$.start'),$4,m.content_json FROM mysteries m WHERE m.id=$3 AND m.family_id=$2 AND m.published ON CONFLICT DO NOTHING`,
      [p.id, s.profile.familyId, p.caseId, JSON.stringify(initialState())],
    );
    const { rows } = await this.db.query<{ id: string }>(
      `SELECT id FROM mystery_sessions WHERE family_id=$1 AND mystery_id=$2 AND (status<>'completed' OR id=$3) ORDER BY (status<>'completed') DESC LIMIT 1`,
      [s.profile.familyId, p.caseId, p.id],
    );
    if (!rows[0])
      throw new AppError(
        "NOT_FOUND",
        "This case is not available to start.",
        404,
      );
    return rows[0];
  }
  private async load(s: Session, id: string): Promise<GameRow> {
    this.check(s);
    z.uuid().parse(id);
    const { rows } = await this.db.query<GameRow>(
      `SELECT g.id,g.revision,g.status,g.content_snapshot AS content,g.state_json AS state,g.current_scene AS "sceneId",g.completed_at AS "completedAt",
   coalesce((SELECT json_group_array(json_object('id',p.id,'key',p.profile_key,'name',p.display_name,'ready',j.ready) ORDER BY p.profile_key)
    FROM mystery_session_players j JOIN profiles p ON p.id=j.profile_id WHERE j.mystery_session_id=g.id),'[]') AS players
   FROM mystery_sessions g WHERE g.id=$1 AND g.family_id=$2`,
      [id, s.profile.familyId],
    );
    if (!rows[0])
      throw new AppError(
        "NOT_FOUND",
        "This case session is not available.",
        404,
      );
    return rows[0];
  }
  async view(s: Session, id: string): Promise<GameView> {
    const g = await this.load(s, id);
    const c = g.content;
    const joined = g.players.some((p) => p.id === s.profile.id);
    const current = sceneFor(c, g.sceneId);
    const visible = joined && g.status === "playing";
    return {
      id: g.id,
      revision: g.revision,
      status: g.status,
      joined,
      title: c.title,
      cover: c.cover,
      introduction: c.introduction,
      players: g.players.map(({ key, name, ready }) => ({ key, name, ready })),
      scene: visible
        ? {
            id: current.id,
            title: current.title,
            shared: current.shared,
            private: current.private[s.profile.key],
            puzzle:
              current.puzzle.actor && current.puzzle.actor !== s.profile.key
                ? null
                : publicPuzzle(current.puzzle),
            instruction: current.puzzle.instruction,
            operator: current.puzzle.actor ?? null,
            hints: current.puzzle.hints.slice(
              0,
              g.state.hints[current.id] ?? 0,
            ),
            solved: g.state.solved.includes(current.id),
            resolution: g.state.solved.includes(current.id)
              ? current.puzzle.resolution
              : null,
            finale: current.finale,
          }
        : null,
      notebook: joined
        ? c.scenes
            .filter((n) => g.state.solved.includes(n.id))
            .map((n) => ({
              title: n.title,
              clues: [...n.shared, ...n.private[s.profile.key]],
              resolution: n.puzzle.resolution,
            }))
        : [],
      summary:
        joined && g.status === "completed"
          ? {
              ending: c.ending,
              achievement: c.achievement,
              puzzles: g.state.solved.length,
              hints: totalHints(g.state),
              completedAt: new Date(g.completedAt!).toISOString(),
            }
          : null,
    };
  }
  async event(s: Session, raw: unknown) {
    this.check(s);
    const p = eventInput.parse(raw);
    const g = await this.load(s, p.sessionId);
    const old = await this.db.query(
      "SELECT id FROM mystery_events WHERE id=$1 AND mystery_session_id=$2 AND profile_id=$3 AND family_id=$4",
      [p.id, g.id, s.profile.id, s.profile.familyId],
    );
    if (old.rows.length) return { accepted: true };
    if (p.revision !== g.revision)
      throw new AppError(
        "CONFLICT",
        "The case has moved along. Your screen is catching up—please try again.",
        409,
      );
    const member = g.players.find((m) => m.id === s.profile.id);
    if (p.action !== "join" && !member)
      throw new AppError(
        "FORBIDDEN",
        "Join this case before taking part.",
        403,
      );
    const state: GameState = structuredClone(g.state);
    let status = g.status;
    let next = g.sceneId;
    const scene = sceneFor(g.content, g.sceneId);
    if (["join", "ready", "start"].includes(p.action)) {
      if (g.status !== "lobby")
        throw new AppError("CONFLICT", "This case has already begun.", 409);
      if (p.action === "ready" && p.ready === undefined)
        throw new AppError("INVALID_REQUEST", "Choose ready or not ready.");
      if (p.action === "start") {
        if (g.players.length !== 3 || g.players.some((p) => !p.ready))
          throw new AppError(
            "NOT_READY",
            "All three adventurers need to join and choose Ready.",
            409,
          );
        status = "playing";
      }
    } else {
      if (g.status !== "playing" || p.sceneId !== g.sceneId)
        throw new AppError(
          "CONFLICT",
          "This page of the case has changed. Try again on the new page.",
          409,
        );
      if (p.action === "hint")
        state.hints[scene.id] = Math.min(3, (state.hints[scene.id] ?? 0) + 1);
      if (p.action === "answer") {
        if (scene.puzzle.actor && scene.puzzle.actor !== s.profile.key)
          throw new AppError(
            "FORBIDDEN",
            `This puzzle asks ${scene.puzzle.actor} to make the selection.`,
            403,
          );
        if (state.solved.includes(scene.id)) return { accepted: true };
        if (!checkAnswer(scene.puzzle, p.answer)) return { accepted: false };
        state.solved.push(scene.id);
      }
      if (p.action === "advance") {
        if (!state.solved.includes(scene.id))
          throw new AppError(
            "UNSOLVED",
            "There is still a clue to put together here.",
            409,
          );
        if (scene.next) next = scene.next;
        else status = "completed";
      }
    }
    const result = await this.db.query<{ id: string }>(
      `INSERT INTO mystery_events(id,family_id,mystery_session_id,profile_id,event_type,event_data)
       SELECT $1,$2,g.id,$3,$4,$5 FROM mystery_sessions g
       WHERE g.id=$6 AND g.family_id=$2 AND g.revision=$7
       AND EXISTS(SELECT 1 FROM profiles WHERE id=$3 AND family_id=$2)
       ON CONFLICT(id) DO NOTHING RETURNING id`,
      [
        p.id,
        s.profile.familyId,
        s.profile.id,
        p.action,
        JSON.stringify({
          state,
          next,
          status,
          ready: p.ready ?? false,
          scene: g.sceneId,
        }),
        g.id,
        g.revision,
      ],
    );
    if (!result.rows.length) {
      const retry = await this.db.query(
        `SELECT id FROM mystery_events WHERE id=$1 AND mystery_session_id=$2 AND profile_id=$3 AND family_id=$4`,
        [p.id, g.id, s.profile.id, s.profile.familyId],
      );
      if (!retry.rows.length)
        throw new AppError(
          "CONFLICT",
          "Someone just turned this page. Please try again.",
          409,
        );
    }
    return { accepted: true };
  }
  preview(s: Session, raw: unknown) {
    this.check(s, "content:manage");
    try {
      return validateMystery(raw);
    } catch (e) {
      const message =
        e instanceof z.ZodError
          ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
          : e instanceof Error
            ? e.message
            : "Invalid case";
      throw new AppError("INVALID_CASE", message.slice(0, 1500));
    }
  }
  async publish(s: Session, raw: unknown) {
    this.check(s, "content:manage");
    const p = z
      .object({ package: z.unknown(), published: z.boolean() })
      .strict()
      .parse(raw);
    const c = this.preview(s, p.package);
    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO mysteries(id,family_id,title,series,case_number,description,content_version,content_json,published,package_slug)
   VALUES($10,$1,$2,$3,$4,$5,$6,$7,$8,$9)
   ON CONFLICT(family_id,package_slug) DO UPDATE SET title=excluded.title,series=excluded.series,case_number=excluded.case_number,description=excluded.description,content_version=excluded.content_version,content_json=excluded.content_json,published=excluded.published
   WHERE mysteries.content_version<excluded.content_version OR mysteries.content_json=excluded.content_json RETURNING id`,
      [
        s.profile.familyId,
        c.title,
        c.series,
        c.caseNumber,
        c.description,
        c.version,
        JSON.stringify(c),
        p.published,
        c.slug,
        randomUUID(),
      ],
    );
    if (!rows.length)
      throw new AppError(
        "VERSION",
        "Use a higher version number for a changed case.",
        409,
      );
    return rows[0];
  }
  async publication(s: Session, raw: unknown) {
    this.check(s, "content:manage");
    const p = z
      .object({ id: z.uuid(), published: z.boolean() })
      .strict()
      .parse(raw);
    const r = await this.db.query(
      "UPDATE mysteries SET published=$3 WHERE id=$1 AND family_id=$2 RETURNING id",
      [p.id, s.profile.familyId, p.published],
    );
    if (!r.rows.length)
      throw new AppError("NOT_FOUND", "This case is not available.", 404);
  }
}
