"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/shared/types";
import type {
  AdventureType,
  CastMember,
  LengthMode,
  Mood,
  StoryBookView,
  StoryLanding,
  StorySummary,
} from "@/lib/shared/story/types";
import { storyRequest } from "./api";
import { BookReader, Bookshelf } from "./book";
import { StorySetup } from "./setup";
type Screen = "landing" | "setup" | "reading" | "books";
const TURN_MS = 900;
export function OurStory({ profile }: { profile: Profile }) {
  const [landing, setLanding] = useState<StoryLanding | null>(null);
  const [screen, setScreen] = useState<Screen>("landing");
  const [book, setBook] = useState<StoryBookView | null>(null);
  const [reread, setReread] = useState(false);
  const [busy, setBusy] = useState(false);
  const [turning, setTurning] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  // Full-screen storybook: hide the standard family shell while this room owns the view.
  useEffect(() => {
    document.body.classList.add("immersive");
    return () => document.body.classList.remove("immersive");
  }, []);
  const loadLanding = useCallback(async () => {
    try {
      setLanding(await storyRequest<StoryLanding>());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    }
  }, []);
  useEffect(() => {
    // Initial authenticated fetch synchronizes this room with the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLanding();
  }, [loadLanding]);
  async function openReading(id: string, asReread: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await storyRequest<StoryBookView>(
        "?id=" + encodeURIComponent(id),
      );
      setBook(next);
      setReread(asReread);
      setScreen("reading");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function begin(payload: {
    adventureType: AdventureType;
    mood: Mood;
    lengthMode: LengthMode;
    cast: (CastMember | "everyone")[];
  }) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await storyRequest<{ id: string }>("/new", {
        id: crypto.randomUUID(),
        ...payload,
      });
      lock.current = false;
      await openReading(r.id, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      lock.current = false;
    } finally {
      setBusy(false);
    }
  }
  async function advance(path: string, body: Record<string, unknown>) {
    if (lock.current || !book) return;
    lock.current = true;
    setTurning(true);
    setError("");
    try {
      const [next] = await Promise.all([
        storyRequest<StoryBookView>(path, { storyId: book.id, ...body }),
        new Promise((r) => setTimeout(r, TURN_MS)),
      ]);
      setBook(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      lock.current = false;
      setTurning(false);
    }
  }
  async function revisit() {
    if (lock.current || !book) return;
    lock.current = true;
    setBusy(true);
    try {
      const r = await storyRequest<{ id: string }>("/revisit", {
        id: crypto.randomUUID(),
        fromStoryId: book.id,
      });
      lock.current = false;
      await openReading(r.id, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      lock.current = false;
    } finally {
      setBusy(false);
    }
  }
  async function toShelf() {
    setScreen("books");
    setBook(null);
    await loadLanding();
  }
  const active = landing?.active ?? null;
  const hasBooks = (landing?.books.length ?? 0) > 0;
  return (
    <div className="story-immersive">
      {/* eslint-disable-next-line @next/next/no-img-element -- reused full-bleed atmosphere art must not be re-cropped. */}
      <img
        className="story-art"
        src="/images/family-board-bg.png"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        draggable={false}
      />
      <div className="story-scrim" aria-hidden="true" />
      <header className="clubhouse-bar story-bar">
        <Link className="clubhouse-brand" href="/home">
          <span aria-hidden="true">←</span> THE CLUBHOUSE
        </Link>
        <h1 className="mystery-bar-title">
          <span aria-hidden="true">✦</span> Our Story
        </h1>
      </header>
      <main className="story-stage">
        {error && (
          <p className="form-error story-float" role="alert">
            {error}
          </p>
        )}
        {screen === "landing" && (
          <section className="story-nook" aria-label="Our Story">
            <div className="nook-book" aria-hidden="true">
              <span className="nook-spine" />
              <span className="nook-title">Our Story</span>
              <span className="nook-flourish">✦</span>
            </div>
            <div className="nook-panel">
              <p className="eyebrow">THE READING NOOK</p>
              <h2>A story only we could tell.</h2>
              <p className="nook-lede">
                Open the book together, make a few choices, and see where the
                evening takes us.
              </p>
              <div className="nook-actions">
                {active && (
                  <button
                    className="story-btn primary nook-continue"
                    disabled={busy}
                    onClick={() => void openReading(active.id, false)}
                  >
                    <span>Continue our story</span>
                    <span className="nook-continue-title">{active.title}</span>
                  </button>
                )}
                <button
                  className={`story-btn ${active ? "" : "primary"}`}
                  disabled={busy}
                  onClick={() => setScreen("setup")}
                >
                  Start a new story
                </button>
                <button
                  className="story-btn ghost"
                  disabled={busy}
                  onClick={() => setScreen("books")}
                >
                  Our books{hasBooks ? ` (${landing?.books.length})` : ""}
                </button>
              </div>
            </div>
          </section>
        )}
        {screen === "setup" && (
          <StorySetup
            busy={busy}
            onBegin={begin}
            onBack={() => setScreen("landing")}
          />
        )}
        {screen === "reading" && book && (
          <BookReader
            key={`${book.id}-${reread}`}
            book={book}
            reread={reread}
            turning={turning}
            isParent={profile.role !== "child"}
            onChoose={(sequence, choiceId) =>
              void advance("/choose", { sequence, choiceId })
            }
            onInput={(sequence, text) =>
              void advance("/input", { sequence, text })
            }
            onShelf={() => void toShelf()}
            onAgain={() => {
              setReread(true);
            }}
            onRevisit={() => void revisit()}
            onClose={() => {
              setBook(null);
              setScreen("landing");
              void loadLanding();
            }}
          />
        )}
        {screen === "books" && (
          <div className="story-library">
            <button
              className="story-btn ghost lib-back"
              onClick={() => setScreen("landing")}
            >
              ‹ Back to the reading nook
            </button>
            <Bookshelf
              inProgress={landing?.inProgress ?? []}
              books={landing?.books ?? []}
              onOpen={(b: StorySummary) =>
                void openReading(b.id, b.status === "completed")
              }
            />
          </div>
        )}
      </main>
    </div>
  );
}
