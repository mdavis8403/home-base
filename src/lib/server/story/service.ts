import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "../db";
import type { Session } from "../../shared/types";
import { AuthService } from "../auth-service";
import { AppError } from "../errors";
import {
  castMembers,
  chooseInput,
  inputTurnInput,
  newStoryInput,
  type CastMember,
  type StoryBookView,
  type StoryLanding,
  type StoryPageView,
  type StorySummary,
} from "../../shared/story/types";
import {
  mockStoryEngine,
  type Continuity,
  type StoryEngine,
  type StorySetup,
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
function normalizeCast(input: string[]): CastMember[] {
  const set = new Set<CastMember>();
  for (const c of input) {
    if (c === "everyone") castMembers.forEach((m) => set.add(m));
    else if ((castMembers as readonly string[]).includes(c))
      set.add(c as CastMember);
  }
  const ordered = castMembers.filter((m) => set.has(m));
  return ordered.length ? ordered : [...castMembers];
}
function setupOf(b: BookRow): StorySetup {
  return {
    adventureType: b.adventureType,
    mood: b.mood,
    lengthMode: b.lengthMode,
    cast: b.cast,
  };
}
function recap(setup: StorySetup, c: Continuity): string {
  const bits: string[] = [];
  if (c.story.entry)
    bits.push(
      `Entered the ${setup.adventureType} by choosing ${c.story.entry}.`,
    );
  if (c.story.backpackItem)
    bits.push(`Dad's useless item: ${c.story.backpackItem}.`);
  if (c.story.pancake)
    bits.push(`Faced the pancake by choosing ${c.story.pancake}.`);
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
  async landing(s: Session): Promise<StoryLanding> {
    this.check(s);
    const active = await this.db.query<BookRow>(
      `SELECT ${BOOK_COLUMNS} FROM story_books WHERE family_id=$1 AND status='active' ORDER BY updated_at DESC`,
      [s.profile.familyId],
    );
    const done = await this.db.query<BookRow>(
      `SELECT ${BOOK_COLUMNS} FROM story_books WHERE family_id=$1 AND status='completed' ORDER BY completed_at DESC,updated_at DESC`,
      [s.profile.familyId],
    );
    const inProgress = active.rows.map(summaryOf);
    return {
      active: inProgress[0] ?? null,
      inProgress,
      books: done.rows.map(summaryOf),
    };
  }
  async create(s: Session, raw: unknown): Promise<{ id: string }> {
    this.check(s);
    const p = newStoryInput.parse(raw);
    const setup: StorySetup = {
      adventureType: p.adventureType,
      mood: p.mood,
      lengthMode: p.lengthMode,
      cast: normalizeCast(p.cast),
    };
    await this.seedBook(s, p.id, setup);
    return { id: p.id };
  }
  private async seedBook(s: Session, id: string, setup: StorySetup) {
    const created = this.engine.create(setup);
    const o = created.opening;
    await this.db.batch([
      {
        sql: `INSERT INTO story_books(id,family_id,status,title,subtitle,adventure_type,mood,length_mode,cast_json,engine_key,
          current_sequence,current_chapter,chapter_count,summary,continuity_json,cover_ref,opening_ref)
          VALUES($1,$2,'active',$3,$4,$5,$6,$7,$8,$9,0,1,1,'',$10,$11,$12) ON CONFLICT(id) DO NOTHING`,
        values: [
          id,
          s.profile.familyId,
          created.title,
          created.subtitle,
          setup.adventureType,
          setup.mood,
          setup.lengthMode,
          JSON.stringify(setup.cast),
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
    return this.advance(s, p.storyId, p.sequence, { choiceId: p.choiceId });
  }
  async input(s: Session, raw: unknown): Promise<StoryBookView> {
    const p = inputTurnInput.parse(raw);
    return this.advance(s, p.storyId, p.sequence, { text: p.text });
  }
  private async advance(
    s: Session,
    storyId: string,
    sequence: number,
    answer: { choiceId?: string; text?: string },
  ): Promise<StoryBookView> {
    const book = await this.loadBook(s, storyId);
    if (book.status === "completed") return this.book(s, storyId);
    const pages = await this.pages(s, storyId);
    const current = pages.find((pg) => pg.sequence === sequence);
    if (!current || current.sequence !== book.currentSequence)
      // Someone already turned this page; hand back the latest.
      return this.book(s, storyId);
    if (answer.text !== undefined) {
      if (current.kind !== "input")
        throw new AppError(
          "INVALID_TURN",
          "This page isn’t waiting for words.",
        );
    } else {
      if (current.kind === "input")
        throw new AppError("INVALID_TURN", "This page is waiting for words.");
      if (
        current.kind !== "chapter" &&
        !current.choices.some((ch) => ch.id === answer.choiceId)
      )
        throw new AppError("INVALID_TURN", "That isn’t one of the choices.");
    }
    // Lock the current page: the first writer to fill its answer wins the turn.
    const marker =
      current.kind === "chapter" ? "continue" : (answer.choiceId ?? "");
    const won = await this.db.query<{ id: string }>(
      `UPDATE story_pages SET ${answer.text !== undefined ? "input_response=$3" : "selected_choice=$3"}
       WHERE story_id=$1 AND sequence=$2 AND selected_choice IS NULL AND input_response IS NULL RETURNING id`,
      [storyId, sequence, answer.text !== undefined ? answer.text : marker],
    );
    if (!won.rows.length) return this.book(s, storyId);
    const setup = setupOf(book);
    const result = this.engine.advance(
      setup,
      book.continuity,
      { node: current.node, kind: current.kind, chapter: current.chapter },
      answer,
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
          recap(setup, result.continuity),
          JSON.stringify(result.continuity),
        ],
      },
    ]);
    return this.book(s, storyId);
  }
  // "Visit this world again" — a fresh story with the same setup, demonstrating
  // the universe seam. Persisted minimally by reusing the create path.
  async revisit(s: Session, raw: unknown): Promise<{ id: string }> {
    this.check(s);
    const p = z
      .object({ id: z.uuid(), fromStoryId: z.uuid() })
      .strict()
      .parse(raw);
    const from = await this.loadBook(s, p.fromStoryId);
    await this.seedBook(s, p.id, setupOf(from));
    return { id: p.id };
  }
}
