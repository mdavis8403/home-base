import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "../db";
import type { Session, ProfileKey } from "../../shared/types";
import { AuthService } from "../auth-service";
import { AppError } from "../errors";
import {
  castLabels,
  chooseInput,
  mixerAnswerInput,
  mixerRevealInput,
  mixerStartInput,
  type StoryBookView,
  type StoryLanding,
  type StoryPageView,
  type StorySummary,
} from "../../shared/story/types";
import {
  assignQuestions,
  buildReveal,
  cardView,
  MIXER_PROFILES,
  QUESTIONS_PER_PERSON,
  resolveAnswer,
  toIngredient,
  type MixerFamilyStatus,
  type MixerIngredient,
  type MixerReveal,
  type MixerStatus,
  type MixerView,
} from "../../shared/story/mixer";
import { questionById } from "../../shared/story/questions";
import {
  mockStoryEngine,
  type Continuity,
  type StoryEngine,
  type StoryPackage,
} from "./engine";

type BookRow = StorySummary & {
  engineKey: string;
  currentSequence: number;
  currentChapter: number;
  continuity: Continuity;
  openingRef: string | null;
  summary: string;
};
type PageRow = StoryPageView & { node: string };
const BOOK_COLUMNS = `id,status,title,subtitle,adventure_type AS "adventureType",mood,length_mode AS "lengthMode",
  cast_json AS cast,engine_key AS "engineKey",current_sequence AS "currentSequence",current_chapter AS "currentChapter",
  chapter_count AS "chapterCount",summary,continuity_json AS continuity,cover_ref AS "coverRef",opening_ref AS "openingRef",
  created_at AS "createdAt",updated_at AS "updatedAt",completed_at AS "completedAt"`;
const PAGE_COLUMNS = `id,sequence,chapter,chapter_title AS "chapterTitle",kind,node,narration,
  choices_json AS choices,selected_choice AS "selectedChoice",input_prompt AS "inputPrompt",input_response AS "inputResponse"`;
const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

function summaryOf(b: BookRow): StorySummary {
  return {
    id: b.id,
    status: b.status,
    title: b.title,
    subtitle: b.subtitle,
    adventureType: b.adventureType,
    mood: b.mood,
    lengthMode: b.lengthMode,
    cast: b.cast,
    chapterCount: b.chapterCount,
    coverRef: b.coverRef,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    completedAt: b.completedAt,
  };
}
function pageView(p: PageRow): StoryPageView {
  return {
    id: p.id,
    sequence: p.sequence,
    chapter: p.chapter,
    chapterTitle: p.chapterTitle,
    kind: p.kind,
    narration: p.narration,
    choices: p.choices,
    selectedChoice: p.selectedChoice,
    inputPrompt: p.inputPrompt,
    inputResponse: p.inputResponse,
  };
}
function recap(c: Continuity): string {
  const bits: string[] = [];
  if (c.facts?.setting) bits.push(`Set at ${c.facts.setting}.`);
  if (c.decisions?.decision1) bits.push(`First choice: ${c.decisions.decision1}.`);
  if (c.decisions?.decision2) bits.push(`Climax choice: ${c.decisions.decision2}.`);
  return bits.join(" ");
}

export class StoryService {
  constructor(
    private db: Database,
    private engine: StoryEngine = mockStoryEngine,
  ) {}
  private check(s: Session, permission: "family:use" = "family:use") {
    const guard: AuthService = new AuthService(this.db);
    guard.require(s, permission);
  }
  private me(s: Session): ProfileKey {
    return s.profile.key;
  }

  // ---- Landing -----------------------------------------------------------
  async landing(s: Session): Promise<StoryLanding> {
    this.check(s);
    const fam = s.profile.familyId;
    const active = await this.db.query<BookRow>(
      `SELECT ${BOOK_COLUMNS} FROM story_books WHERE family_id=$1 AND status='active' ORDER BY updated_at DESC`,
      [fam],
    );
    const done = await this.db.query<BookRow>(
      `SELECT ${BOOK_COLUMNS} FROM story_books WHERE family_id=$1 AND status='completed' ORDER BY completed_at DESC,updated_at DESC`,
      [fam],
    );
    const inProgress = active.rows.map(summaryOf);
    // Surface an unfinished Story Mixer (collecting or ready-to-reveal).
    const { rows: sess } = await this.db.query<{
      id: string;
      status: MixerStatus;
    }>(
      `SELECT id,status FROM story_mixer_sessions WHERE family_id=$1 AND status IN ('collecting','complete') ORDER BY updated_at DESC LIMIT 1`,
      [fam],
    );
    let mixer: StoryLanding["mixer"] = null;
    if (sess[0]) {
      const counts = await this.sealedCounts(sess[0].id);
      mixer = {
        sessionId: sess[0].id,
        status: sess[0].status,
        mineSealed: counts[this.me(s)] >= QUESTIONS_PER_PERSON,
        sealedCount: MIXER_PROFILES.filter(
          (p) => counts[p] >= QUESTIONS_PER_PERSON,
        ).length,
      };
    }
    return { active: inProgress[0] ?? null, inProgress, books: done.rows.map(summaryOf), mixer };
  }

  // ---- Story Mixer -------------------------------------------------------
  private async sealedCounts(
    sessionId: string,
  ): Promise<Record<ProfileKey, number>> {
    const { rows } = await this.db.query<{ profile_key: ProfileKey; c: number }>(
      `SELECT profile_key, COUNT(*) AS c FROM story_mixer_answers WHERE session_id=$1 GROUP BY profile_key`,
      [sessionId],
    );
    const counts: Record<ProfileKey, number> = { mom: 0, dad: 0, mia: 0 };
    for (const r of rows) counts[r.profile_key] = Number(r.c);
    return counts;
  }
  private async loadSession(s: Session, id: string) {
    z.uuid().parse(id);
    const { rows } = await this.db.query<{
      id: string;
      status: MixerStatus;
      storyId: string | null;
      reveal: MixerReveal | null;
    }>(
      `SELECT id,status,story_id AS "storyId",reveal_json AS reveal FROM story_mixer_sessions WHERE id=$1 AND family_id=$2`,
      [id, s.profile.familyId],
    );
    if (!rows[0])
      throw new AppError("NOT_FOUND", "That story mixer isn’t here.", 404);
    return rows[0];
  }
  async startMixer(s: Session, raw: unknown): Promise<{ sessionId: string }> {
    this.check(s);
    const { id } = mixerStartInput.parse(raw);
    const assignments = assignQuestions(id);
    const statements = [
      {
        sql: `INSERT INTO story_mixer_sessions(id,family_id,status) VALUES($1,$2,'collecting') ON CONFLICT(id) DO NOTHING`,
        values: [id, s.profile.familyId],
      },
      ...MIXER_PROFILES.flatMap((p) =>
        assignments[p].map((a) => ({
          sql: `INSERT INTO story_mixer_assignments(id,session_id,family_id,profile_key,seq,question_id,ingredient_type)
            VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(session_id,profile_key,seq) DO NOTHING`,
          values: [
            randomUUID(),
            id,
            s.profile.familyId,
            p,
            a.seq,
            a.questionId,
            a.type,
          ],
        })),
      ),
    ];
    await this.db.batch(statements);
    return { sessionId: id };
  }
  async mixerView(s: Session, sessionId: string): Promise<MixerView> {
    this.check(s);
    const session = await this.loadSession(s, sessionId);
    const meKey = this.me(s);
    // Only ever load THIS profile's cards and answers — never anyone else's.
    const { rows: mine } = await this.db.query<{
      seq: number;
      question_id: string;
    }>(
      `SELECT seq,question_id FROM story_mixer_assignments WHERE session_id=$1 AND profile_key=$2 ORDER BY seq`,
      [sessionId, meKey],
    );
    const { rows: answers } = await this.db.query<{
      seq: number;
      question_id: string;
      value: string;
    }>(
      `SELECT seq,question_id,value FROM story_mixer_answers WHERE session_id=$1 AND profile_key=$2 ORDER BY seq`,
      [sessionId, meKey],
    );
    const answeredSeqs = new Set(answers.map((a) => a.seq));
    const nextAssignment = mine.find((a) => !answeredSeqs.has(a.seq));
    const card = nextAssignment
      ? questionById.get(nextAssignment.question_id)
      : undefined;
    const counts = await this.sealedCounts(sessionId);
    const family: MixerFamilyStatus[] = MIXER_PROFILES.map((p) => ({
      key: p,
      name: castLabels[p],
      answered: counts[p],
      total: QUESTIONS_PER_PERSON,
      sealed: counts[p] >= QUESTIONS_PER_PERSON,
    }));
    return {
      sessionId,
      status: session.status,
      me: {
        key: meKey,
        answered: answers.length,
        total: QUESTIONS_PER_PERSON,
        sealed: answers.length >= QUESTIONS_PER_PERSON,
        current:
          card && nextAssignment ? cardView(card, nextAssignment.seq) : null,
        answers: answers.map((a) => ({
          questionId: a.question_id,
          seq: a.seq,
          value: a.value,
        })),
      },
      family,
      sealedCount: family.filter((f) => f.sealed).length,
      reveal: session.status === "revealed" ? session.reveal : null,
      storyId: session.storyId,
    };
  }
  async mixerAnswer(s: Session, raw: unknown): Promise<MixerView> {
    this.check(s);
    const p = mixerAnswerInput.parse(raw);
    const session = await this.loadSession(s, p.sessionId);
    if (session.status !== "collecting")
      throw new AppError(
        "INVALID_TURN",
        "These story ingredients are already sealed.",
      );
    const meKey = this.me(s);
    const { rows: assigned } = await this.db.query<{
      seq: number;
      ingredient_type: string;
    }>(
      `SELECT seq,ingredient_type FROM story_mixer_assignments WHERE session_id=$1 AND profile_key=$2 AND question_id=$3`,
      [p.sessionId, meKey, p.questionId],
    );
    const slot = assigned[0];
    const card = questionById.get(p.questionId);
    if (!slot || !card)
      throw new AppError("INVALID_TURN", "That isn’t one of your cards.");
    const { value, custom } = resolveAnswer(
      p.sessionId,
      card,
      p.optionId,
      p.custom,
    );
    if (!value.trim())
      throw new AppError("INVALID_TURN", "Write something first.");
    await this.db.query(
      `INSERT INTO story_mixer_answers(id,session_id,family_id,profile_key,seq,question_id,ingredient_type,option_id,value,is_custom)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT(session_id,profile_key,seq) DO UPDATE SET
         question_id=excluded.question_id,ingredient_type=excluded.ingredient_type,
         option_id=excluded.option_id,value=excluded.value,is_custom=excluded.is_custom,updated_at=${NOW}`,
      [
        randomUUID(),
        p.sessionId,
        s.profile.familyId,
        meKey,
        slot.seq,
        p.questionId,
        slot.ingredient_type,
        p.optionId,
        value,
        custom,
      ],
    );
    // When all three envelopes are full, the mixer becomes ready to reveal.
    const counts = await this.sealedCounts(p.sessionId);
    if (MIXER_PROFILES.every((k) => counts[k] >= QUESTIONS_PER_PERSON))
      await this.db.query(
        `UPDATE story_mixer_sessions SET status='complete',updated_at=${NOW} WHERE id=$1 AND family_id=$2 AND status='collecting'`,
        [p.sessionId, s.profile.familyId],
      );
    return this.mixerView(s, p.sessionId);
  }
  private async ingredients(sessionId: string): Promise<MixerIngredient[]> {
    const { rows } = await this.db.query<{
      profile_key: ProfileKey;
      question_id: string;
      seq: number;
      value: string;
      is_custom: number | boolean;
    }>(
      `SELECT profile_key,question_id,seq,value,is_custom FROM story_mixer_answers WHERE session_id=$1 ORDER BY profile_key,seq`,
      [sessionId],
    );
    const out: MixerIngredient[] = [];
    for (const r of rows) {
      const ing = toIngredient({
        profile: r.profile_key,
        questionId: r.question_id,
        seq: r.seq,
        value: r.value,
        custom: Boolean(r.is_custom),
      });
      if (ing) out.push(ing);
    }
    return out;
  }
  async mixerReveal(
    s: Session,
    raw: unknown,
  ): Promise<{ storyId: string; reveal: MixerReveal }> {
    this.check(s);
    const p = mixerRevealInput.parse(raw);
    const session = await this.loadSession(s, p.sessionId);
    if (session.status === "revealed" && session.storyId && session.reveal)
      return { storyId: session.storyId, reveal: session.reveal };
    const counts = await this.sealedCounts(p.sessionId);
    if (!MIXER_PROFILES.every((k) => counts[k] >= QUESTIONS_PER_PERSON))
      throw new AppError(
        "INVALID_TURN",
        "All three story envelopes must be sealed first.",
      );
    const ingredients = await this.ingredients(p.sessionId);
    const reveal = buildReveal(ingredients, p.sessionId);
    await this.seedBook(s, p.id, {
      sessionId: p.sessionId,
      ingredients,
      targetMinutes: 5,
    });
    await this.db.query(
      `UPDATE story_mixer_sessions SET status='revealed',story_id=$3,reveal_json=$4,updated_at=${NOW}
       WHERE id=$1 AND family_id=$2`,
      [p.sessionId, s.profile.familyId, p.id, JSON.stringify(reveal)],
    );
    return { storyId: p.id, reveal };
  }

  // ---- Book create / read / advance -------------------------------------
  private async seedBook(s: Session, id: string, pkg: StoryPackage) {
    const created = this.engine.create(pkg);
    const o = created.opening;
    await this.db.batch([
      {
        sql: `INSERT INTO story_books(id,family_id,status,title,subtitle,adventure_type,mood,length_mode,cast_json,engine_key,
          current_sequence,current_chapter,chapter_count,summary,continuity_json,cover_ref,opening_ref)
          VALUES($1,$2,'active',$3,$4,'mixer','mixer','night',$5,$6,0,1,1,'',$7,$8,$9) ON CONFLICT(id) DO NOTHING`,
        values: [
          id,
          s.profile.familyId,
          created.title,
          created.subtitle,
          JSON.stringify(["mom", "dad", "mia", "max"]),
          created.engineKey,
          JSON.stringify(created.continuity),
          created.coverRef,
          created.openingRef,
        ],
      },
      {
        sql: `INSERT INTO story_pages(id,family_id,story_id,sequence,chapter,chapter_title,kind,node,narration,choices_json,input_prompt,state_json)
          SELECT $1,$2,$3,0,1,NULL,$4,$5,$6,$7,$8,'{}'
          WHERE EXISTS(SELECT 1 FROM story_books WHERE id=$3 AND family_id=$2)
          ON CONFLICT(story_id,sequence) DO NOTHING`,
        values: [
          randomUUID(),
          s.profile.familyId,
          id,
          o.kind,
          o.node,
          o.narration,
          JSON.stringify(o.choices),
          o.inputPrompt,
        ],
      },
    ]);
  }
  private async loadBook(s: Session, id: string): Promise<BookRow> {
    this.check(s);
    z.uuid().parse(id);
    const { rows } = await this.db.query<BookRow>(
      `SELECT ${BOOK_COLUMNS} FROM story_books WHERE id=$1 AND family_id=$2`,
      [id, s.profile.familyId],
    );
    if (!rows[0])
      throw new AppError("NOT_FOUND", "This story isn’t on our shelf.", 404);
    return rows[0];
  }
  private async pages(s: Session, id: string): Promise<PageRow[]> {
    const { rows } = await this.db.query<PageRow>(
      `SELECT ${PAGE_COLUMNS} FROM story_pages WHERE story_id=$1 AND family_id=$2 ORDER BY sequence`,
      [id, s.profile.familyId],
    );
    return rows;
  }
  async book(s: Session, id: string): Promise<StoryBookView> {
    const b = await this.loadBook(s, id);
    const pages = await this.pages(s, id);
    return {
      ...summaryOf(b),
      currentSequence: b.currentSequence,
      pages: pages.map(pageView),
    };
  }
  async choose(s: Session, raw: unknown): Promise<StoryBookView> {
    const p = chooseInput.parse(raw);
    return this.advance(s, p.storyId, p.sequence, p.choiceId);
  }
  private async advance(
    s: Session,
    storyId: string,
    sequence: number,
    choiceId: string,
  ): Promise<StoryBookView> {
    const book = await this.loadBook(s, storyId);
    if (book.status === "completed") return this.book(s, storyId);
    const pages = await this.pages(s, storyId);
    const current = pages.find((pg) => pg.sequence === sequence);
    if (!current || current.sequence !== book.currentSequence)
      return this.book(s, storyId); // someone already turned this page
    if (current.kind === "input")
      return this.book(s, storyId); // legacy input pages are read-only now
    if (
      current.kind !== "chapter" &&
      !current.choices.some((ch) => ch.id === choiceId)
    )
      throw new AppError("INVALID_TURN", "That isn’t one of the choices.");
    const marker = current.kind === "chapter" ? "continue" : choiceId;
    const won = await this.db.query<{ id: string }>(
      `UPDATE story_pages SET selected_choice=$3
       WHERE story_id=$1 AND sequence=$2 AND selected_choice IS NULL AND input_response IS NULL RETURNING id`,
      [storyId, sequence, marker],
    );
    if (!won.rows.length) return this.book(s, storyId);
    const pkg: StoryPackage = {
      sessionId: storyId,
      ingredients: book.continuity.ingredients ?? [],
      targetMinutes: 5,
    };
    const result = this.engine.advance(
      pkg,
      book.continuity,
      { node: current.node, kind: current.kind, chapter: current.chapter },
      { choiceId },
    );
    const np = result.page;
    const nextSequence = sequence + 1;
    const chapterCount = Math.max(book.chapterCount, np.chapter);
    await this.db.batch([
      {
        sql: `INSERT INTO story_pages(id,family_id,story_id,sequence,chapter,chapter_title,kind,node,narration,choices_json,input_prompt,state_json)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(story_id,sequence) DO NOTHING`,
        values: [
          randomUUID(),
          s.profile.familyId,
          storyId,
          nextSequence,
          np.chapter,
          np.chapterTitle,
          np.kind,
          np.node,
          np.narration,
          JSON.stringify(np.choices),
          np.inputPrompt,
          JSON.stringify({ node: np.node }),
        ],
      },
      {
        sql: `UPDATE story_books SET current_sequence=$3,current_chapter=$4,chapter_count=$5,status=$6,
          completed_at=CASE WHEN $6='completed' THEN ${NOW} ELSE completed_at END,
          summary=$7,continuity_json=$8,updated_at=${NOW}
          WHERE id=$1 AND family_id=$2`,
        values: [
          storyId,
          s.profile.familyId,
          nextSequence,
          np.chapter,
          chapterCount,
          result.completed ? "completed" : "active",
          recap(result.continuity),
          JSON.stringify(result.continuity),
        ],
      },
    ]);
    return this.book(s, storyId);
  }
}
