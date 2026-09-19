"use client";
/* eslint-disable @next/next/no-img-element -- local approved story artwork */
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MixerReveal,
  MixerView,
  RevealHighlight,
} from "@/lib/shared/story/mixer";
import { storyRequest } from "./api";

const NAMES: Record<string, string> = { mom: "Mom", dad: "Dad", mia: "Mia" };
const VERBS = [
  "DECIDED",
  "ADDED",
  "CONTRIBUTED",
  "DEMANDED",
  "SNUCK IN",
  "INSISTED ON",
  "SLIPPED IN",
];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function lowerValue(v: string): string {
  // Lowercase a leading article so "An X" reads inside a sentence.
  if (/^(An?|The)\s/.test(v)) return v.charAt(0).toLowerCase() + v.slice(1);
  return v;
}
function highlightBody(h: RevealHighlight): string {
  const body = `${h.lead} ${lowerValue(h.value)}`.trim();
  return cap(body).replace(/[.]*$/, ".");
}

type Phase = "loading" | "cards" | "sealed" | "ready" | "reveal" | "title" | "book";

export function StoryMixer({
  sessionId,
  onOpenStory,
  onExit,
}: {
  sessionId: string;
  onOpenStory: (storyId: string) => void;
  onExit: () => void;
}) {
  const [view, setView] = useState<MixerView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState<string>("");
  const [writing, setWriting] = useState(false);
  const [flash, setFlash] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [reveal, setReveal] = useState<MixerReveal | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const lock = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async () => {
    try {
      const v = await storyRequest<MixerView>(
        "?mixer=" + encodeURIComponent(sessionId),
      );
      setView(v);
      setError("");
      // Derive the resting phase from the server state (reveal phases are local).
      setPhase((p) =>
        p === "reveal" || p === "title" || p === "book"
          ? p
          : v.status === "revealed"
            ? "book"
            : v.status === "complete"
              ? "ready"
              : v.me.sealed
                ? "sealed"
                : "cards",
      );
      if (v.status === "revealed" && v.reveal) {
        setReveal(v.reveal);
        setStoryId(v.storyId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    }
  }, [sessionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Move focus to the new card as the family advances (screen-reader friendly).
  useEffect(() => {
    if (phase === "cards") headingRef.current?.focus();
  }, [view?.me.current?.id, phase]);

  async function answer(optionId: string, customText?: string) {
    if (lock.current || !view?.me.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const next = await storyRequest<MixerView>("/mixer-answer", {
        sessionId,
        questionId: view.me.current.id,
        optionId,
        ...(customText !== undefined ? { custom: customText } : {}),
      });
      setWriting(false);
      setCustom("");
      setFlash(true);
      setTimeout(() => setFlash(false), 380);
      setView(next);
      setPhase(
        next.status === "complete"
          ? "ready"
          : next.me.sealed
            ? "sealed"
            : "cards",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function beginReveal() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const r = await storyRequest<{ storyId: string; reveal: MixerReveal }>(
        "/mixer-reveal",
        { sessionId, id: crypto.randomUUID() },
      );
      setReveal(r.reveal);
      setStoryId(r.storyId);
      setStep(0);
      setPhase("reveal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!view && phase === "loading")
    return (
      <div className="mixer-stage">
        <p className="mixer-loading">Setting the desk…</p>
      </div>
    );

  return (
    <div className="mixer-stage">
      {error && (
        <p className="form-error story-float" role="alert">
          {error}
        </p>
      )}
      {phase === "cards" && view?.me.current && (
        <section className="mixer-card" aria-live="polite">
          <div className="mixer-progress">
            <span className="mixer-count">
              {view.me.answered + 1} <span aria-hidden="true">/</span>{" "}
              {view.me.total}
            </span>
            <span className="mixer-dots" aria-hidden="true">
              {Array.from({ length: view.me.total }).map((_, i) => (
                <span
                  key={i}
                  className={`mixer-dot${i <= view.me.answered ? " on" : ""}`}
                />
              ))}
            </span>
          </div>
          <h2 className="mixer-question" tabIndex={-1} ref={headingRef}>
            {view.me.current.text}
          </h2>
          {!writing ? (
            <>
              <div className="mixer-options" role="group">
                {view.me.current.options.map((o) => (
                  <button
                    key={o.id}
                    className="mixer-option"
                    disabled={busy}
                    onClick={() => void answer(o.id)}
                  >
                    <span className="mixer-option-mark" aria-hidden="true">
                      ✦
                    </span>
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="mixer-extra">
                {view.me.current.allowCustom && (
                  <button
                    className="ink-link"
                    disabled={busy}
                    onClick={() => setWriting(true)}
                  >
                    Make up my own
                  </button>
                )}
                {view.me.current.allowSurprise && (
                  <button
                    className="ink-link"
                    disabled={busy}
                    onClick={() => void answer("surprise")}
                  >
                    Surprise me
                  </button>
                )}
              </div>
            </>
          ) : (
            <form
              className="mixer-custom"
              onSubmit={(e) => {
                e.preventDefault();
                const v = custom.trim();
                if (v) void answer("custom", v);
              }}
            >
              <label className="mixer-custom-label">
                Write your own answer
                <input
                  type="text"
                  maxLength={100}
                  autoFocus
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Anything you like…"
                  aria-label="Your own answer"
                />
              </label>
              <div className="mixer-custom-actions">
                <button
                  type="button"
                  className="ink-link"
                  onClick={() => {
                    setWriting(false);
                    setCustom("");
                  }}
                >
                  Back to choices
                </button>
                <button
                  className="story-btn primary"
                  disabled={busy || !custom.trim()}
                >
                  Seal it in <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          )}
          <button className="mixer-leave ink-link" onClick={onExit}>
            Leave the desk
          </button>
          {flash && (
            <div className="mixer-flash" aria-hidden="true">
              Sealed ✓
            </div>
          )}
        </section>
      )}

      {(phase === "sealed" || phase === "ready") && view && (
        <section className="mixer-card mixer-sealed">
          <p className="mixer-eyebrow">
            {phase === "ready"
              ? "ALL THREE ENVELOPES ARE SEALED"
              : "YOUR STORY INGREDIENTS ARE SEALED"}
          </p>
          <div className="mixer-seal" aria-hidden="true">
            ✶
          </div>
          <ul className="mixer-envelopes">
            {view.family.map((f) => (
              <li
                key={f.key}
                className={`mixer-envelope${f.sealed ? " done" : ""}`}
              >
                <span className="env-name">{f.name}</span>
                <span className="env-state">
                  {f.sealed ? "✓ sealed" : `${f.answered} of ${f.total}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mixer-note">
            {view.sealedCount} of 3 story envelopes are sealed.
          </p>
          {phase === "ready" ? (
            <button
              className="story-btn primary"
              disabled={busy}
              onClick={() => void beginReveal()}
            >
              Open Our Story <span aria-hidden="true">→</span>
            </button>
          ) : (
            <p className="mixer-waiting">
              When everyone has finished, the story can be opened.
            </p>
          )}
          <button className="mixer-leave ink-link" onClick={onExit}>
            Leave the desk
          </button>
        </section>
      )}

      {phase === "reveal" && reveal && (
        <RevealSequence
          reveal={reveal}
          step={step}
          onNext={() => setStep((n) => n + 1)}
          onDone={() => setPhase("title")}
        />
      )}

      {phase === "title" && reveal && (
        <section className="mixer-card title-card">
          <img
            className="title-flourish"
            src="/images/our-story-ink-flourish.png"
            alt=""
            aria-hidden="true"
          />
          <p className="mixer-eyebrow">OUR STORY IS</p>
          <h2 className="title-name">{reveal.title}</h2>
          <p className="title-premise">{reveal.subtitle}</p>
          <button className="story-btn primary" onClick={() => setPhase("book")}>
            Bind the book <span aria-hidden="true">→</span>
          </button>
        </section>
      )}

      {phase === "book" && reveal && storyId && (
        <section className="mixer-book">
          <div className="closed-book" aria-hidden="true">
            <span className="closed-book-plate">
              <span className="closed-book-title">{reveal.title}</span>
              <span className="closed-book-foot">Mom · Dad · Mia · Max</span>
            </span>
          </div>
          <button
            className="story-btn primary open-book-btn"
            onClick={() => onOpenStory(storyId)}
          >
            Open the book <span aria-hidden="true">→</span>
          </button>
        </section>
      )}
    </div>
  );
}

function RevealSequence({
  reveal,
  step,
  onNext,
  onDone,
}: {
  reveal: MixerReveal;
  step: number;
  onNext: () => void;
  onDone: () => void;
}) {
  const total = reveal.highlights.length;
  const atFinal = step >= total;
  const h = atFinal ? null : reveal.highlights[step];
  return (
    <section className="mixer-card reveal-card" aria-live="polite">
      {h ? (
        <>
          <p className="reveal-eyebrow">
            {NAMES[h.profile] ?? h.profile}{" "}
            {VERBS[step % VERBS.length]}
            <span aria-hidden="true">…</span>
          </p>
          <p className="reveal-body">{highlightBody(h)}</p>
          <div className="reveal-progress" aria-hidden="true">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`reveal-pip${i <= step ? " on" : ""}`}
              />
            ))}
          </div>
          <button className="story-btn" onClick={onNext}>
            {step === total - 1 ? "…and the rest" : "Next"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </>
      ) : (
        <>
          <p className="reveal-eyebrow">AND SO IT IS DECIDED</p>
          <p className="reveal-final">
            …and {reveal.moreCount} other terrible decisions have been sealed
            into the story.
          </p>
          <button className="story-btn primary" onClick={onDone}>
            Reveal our title <span aria-hidden="true">→</span>
          </button>
        </>
      )}
    </section>
  );
}
