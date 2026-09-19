"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/shared/types";
import type {
  StoryBookView,
  StoryLanding,
  StorySummary,
} from "@/lib/shared/story/types";
import type { MixerEnvelope } from "@/lib/shared/story/mixer";
import { storyRequest } from "./api";
import { BookReader, Bookshelf } from "./book";
import { StoryMixer } from "./mixer";
type Screen = "landing" | "mixer" | "reading" | "books";
const TURN_MS = 900;
export function OurStory({ profile }: { profile: Profile }) {
  const [landing, setLanding] = useState<StoryLanding | null>(null);
  const [screen, setScreen] = useState<Screen>("landing");
  const [book, setBook] = useState<StoryBookView | null>(null);
  const [mixerSession, setMixerSession] = useState<string | null>(null);
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
  async function startMixer() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const id = crypto.randomUUID();
      await storyRequest<{ sessionId: string }>("/mixer-start", { id });
      setMixerSession(id);
      setScreen("mixer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function continueMixer() {
    if (landing?.mixer) {
      setMixerSession(landing.mixer.sessionId);
      setScreen("mixer");
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
  async function toShelf() {
    setScreen("books");
    setBook(null);
    await loadLanding();
  }
  const active = landing?.active ?? null;
  const mixer = landing?.mixer ?? null;
  const hasBooks = (landing?.books.length ?? 0) > 0;

  // Landing state — mixer-in-progress takes priority, then the generated story.
  const lstate: "none" | "mine" | "sealed" | "ready" | "storyReady" | "storyActive" =
    mixer?.status === "complete"
      ? "ready"
      : mixer
        ? mixer.mineSealed
          ? "sealed"
          : "mine"
        : active
          ? landing?.activeStarted
            ? "storyActive"
            : "storyReady"
          : "none";
  function runPrimary() {
    if (lstate === "none") void startMixer();
    else if (lstate === "storyReady" || lstate === "storyActive") {
      if (active) void openReading(active.id, false);
    } else continueMixer();
  }
  const copy: {
    headline: string;
    support?: string;
    meta?: string;
    primary?: string;
    bookAria: string;
  } = {
    none: {
      headline: "Ready to mix up a story?",
      support:
        "Mom, Dad, and Mia each get 10 secret story ingredients — nobody sees the others until the big reveal.",
      primary: "Start a new story",
      bookAria: "Our Story — the family’s storybook",
    },
    mine: {
      headline: "The Story Mixer is open",
      support:
        "Add your secret ingredients. Everyone else’s stay sealed until the reveal.",
      meta: `${mixer?.mineAnswered ?? 0} of 10 tucked away · ${mixer?.sealedCount ?? 0} of 3 envelopes sealed`,
      primary: "Continue your ingredients",
      bookAria: "Our Story — your ingredients await",
    },
    sealed: {
      headline: "Your envelope is sealed",
      support:
        "Your 10 ingredients are tucked away. The story stays secret until all three envelopes are ready.",
      meta: `${mixer?.sealedCount ?? 0} of 3 envelopes sealed`,
      bookAria: "Our Story — your envelope is sealed",
    },
    ready: {
      headline: "All three envelopes are sealed.",
      support: "Thirty terrible decisions are waiting inside.",
      primary: "Open Our Story",
      bookAria: "Our Story — open the sealed book",
    },
    storyReady: {
      headline: "Your story is waiting.",
      support: active?.subtitle ?? undefined,
      primary: "Open the book",
      bookAria: `Open the storybook: ${active?.title ?? ""}`,
    },
    storyActive: {
      headline: "Our story is waiting.",
      support: active?.title ?? undefined,
      primary: "Continue our story",
      bookAria: `Return to our story: ${active?.title ?? ""}`,
    },
  }[lstate];
  const envelopes: MixerEnvelope[] = mixer?.envelopes ?? [
    { key: "mom", name: "Mom", sealed: false, mine: false },
    { key: "dad", name: "Dad", sealed: false, mine: false },
    { key: "mia", name: "Mia", sealed: false, mine: false },
  ];
  // Anchor points for the three sealed envelopes in the artwork (below each seal).
  const envPos = [
    { left: "53%", top: "33%" },
    { left: "14%", top: "74%" },
    { left: "60%", top: "77%" },
  ];

  return (
    <div className="story-immersive">
      <header className="clubhouse-bar story-bar">
        <Link className="clubhouse-brand" href="/home">
          <span aria-hidden="true">←</span> THE CLUBHOUSE
        </Link>
        <h1 className="mystery-bar-title">
          <span aria-hidden="true">✦</span> Our Story
        </h1>
      </header>
      <main className="story-stage">
        {error && screen !== "mixer" && (
          <p className="form-error story-float" role="alert">
            {error}
          </p>
        )}
        {screen === "landing" && (
          <section className="landing-scene" aria-label="Our Story">
            <div className="scene-art">
              <button
                className="book-hit"
                disabled={busy}
                aria-label={copy.bookAria}
                onClick={runPrimary}
              />
              <div
                className="env-tags"
                role="group"
                aria-label="Story envelopes"
              >
                {envelopes.map((e, i) => (
                  <div
                    key={e.key}
                    className={`env-tag${e.sealed ? " sealed" : ""}`}
                    style={envPos[i]}
                  >
                    <span className="env-name">{e.name}</span>
                    {e.sealed ? (
                      <span className="env-check" aria-label="sealed">
                        {" "}
                        ✓
                      </span>
                    ) : e.mine && mixer && mixer.status !== "complete" ? (
                      <span className="env-progress">
                        {" "}
                        · {mixer.mineAnswered}/10
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="landing-copy">
              <p className="copy-eyebrow">OUR STORY</p>
              <h2 className="copy-headline">{copy.headline}</h2>
              {copy.support && <p className="copy-support">{copy.support}</p>}
              {copy.meta && <p className="copy-meta">{copy.meta}</p>}
              {/* Phone-only: the three envelope states as a restrained row. */}
              <div className="env-row" role="group" aria-label="Story envelopes">
                {envelopes.map((e) => (
                  <span key={e.key} className={`env-chip${e.sealed ? " sealed" : ""}`}>
                    {e.name}
                    {e.sealed ? (
                      <span aria-label="sealed"> ✓</span>
                    ) : e.mine && mixer && mixer.status !== "complete" ? (
                      <span> {mixer.mineAnswered}/10</span>
                    ) : null}
                  </span>
                ))}
              </div>
              <div className="copy-actions">
                {copy.primary && (
                  <button
                    className="story-paper-btn"
                    disabled={busy}
                    onClick={runPrimary}
                  >
                    {copy.primary} <span aria-hidden="true">→</span>
                  </button>
                )}
                <button
                  className="ink-link"
                  disabled={busy}
                  onClick={() => setScreen("books")}
                >
                  Our books{hasBooks ? ` (${landing?.books.length})` : ""}
                </button>
              </div>
            </div>
          </section>
        )}
        {screen === "mixer" && mixerSession && (
          <StoryMixer
            sessionId={mixerSession}
            onOpenStory={(id) => {
              setMixerSession(null);
              void openReading(id, false);
              void loadLanding();
            }}
            onExit={() => {
              setMixerSession(null);
              setScreen("landing");
              void loadLanding();
            }}
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
            onShelf={() => void toShelf()}
            onAgain={() => {
              setReread(true);
            }}
            onClose={() => {
              setBook(null);
              setScreen("landing");
              void loadLanding();
            }}
          />
        )}
        {screen === "books" && (
          <div className="book-frame library">
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
          </div>
        )}
      </main>
    </div>
  );
}
