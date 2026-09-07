"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/shared/types";
import type { CaseCard, GameView } from "@/lib/shared/mystery/types";
import { mysteryRequest } from "./api";
import { CaseArt, ClueCard } from "./art";
import { PuzzlePanel } from "./puzzle";
import { MysteryImporter } from "./importer";
export function MysteryClub({
  profile,
  initialSession,
}: {
  profile: Profile;
  initialSession: string | null;
}) {
  const [cases, setCases] = useState<CaseCard[]>([]),
    [game, setGame] = useState<GameView | null>(null),
    [sessionId, setSessionId] = useState(initialSession),
    [tab, setTab] = useState<"library" | "solved" | "parent">("library");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loadError, setLoadError] = useState("");
  const lock = useRef(false),
    sequence = useRef(0),
    installed = useRef(false);
  const refresh = useCallback(async () => {
    const seq = ++sequence.current;
    try {
      if (sessionId) {
        const next = await mysteryRequest<GameView>(
          "?session=" + encodeURIComponent(sessionId),
        );
        if (seq === sequence.current) setGame(next);
      } else {
        const next = installed.current
          ? await mysteryRequest<CaseCard[]>()
          : await mysteryRequest<CaseCard[]>("/install", {});
        installed.current = true;
        if (seq === sequence.current) setCases(next);
      }
      if (seq === sequence.current) setLoadError("");
    } catch (e) {
      if (seq === sequence.current)
        setLoadError(e instanceof Error ? e.message : "Please try again.");
    }
  }, [sessionId]);
  useEffect(() => {
    // Synchronize the selected case with the authenticated server on entry.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    const timer = setInterval(
      () => {
        if (document.visibilityState === "visible") void refresh();
      },
      sessionId ? 2000 : 15000,
    );
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [refresh, sessionId]);
  function open(id: string | null) {
    sequence.current++;
    setGame(null);
    setSessionId(id);
    setError("");
    setNotice("");
    window.history.replaceState(
      null,
      "",
      id ? "/mystery-club?session=" + encodeURIComponent(id) : "/mystery-club",
    );
  }
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      await refresh();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function event(action: string, extra: Record<string, unknown> = {}) {
    if (!game) return;
    await run(async () => {
      const result = await mysteryRequest<{ accepted: boolean }>("/event", {
        id: crypto.randomUUID(),
        sessionId: game.id,
        revision: game.revision,
        action,
        ...(game.scene ? { sceneId: game.scene.id } : {}),
        ...extra,
      });
      if (!result.accepted)
        setNotice(
          "Not quite yet. Compare your clues, or ask Headquarters for a nudge.",
        );
      await refresh();
    });
  }
  const activeScene = game?.scene;
  return (
    <section className="mystery-room">
      <header className="messages-heading">
        <div>
          <p className="eyebrow">THE OWL HAS SOMETHING FOR US</p>
          <h1>Mystery Club</h1>
          <p>Three minds. One wonderfully curious adventure.</p>
        </div>
        <span className="mystery-seal" aria-hidden="true">
          ✧
        </span>
      </header>
      {sessionId ? (
        <div className="message-controls">
          <button className="text-button" onClick={() => open(null)}>
            ← Case library
          </button>
          <button className="text-button" onClick={() => void refresh()}>
            Refresh case
          </button>
        </div>
      ) : (
        <nav className="message-tabs" aria-label="Mystery views">
          {(
            [
              "library",
              "solved",
              ...(profile.role === "child" ? [] : ["parent"]),
            ] as const
          ).map((t) => (
            <button
              className="text-button"
              key={t}
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t as typeof tab);
                setError("");
                setNotice("");
              }}
            >
              {t === "library"
                ? "Case library"
                : t === "solved"
                  ? "Solved Cases"
                  : "Parent case desk"}
            </button>
          ))}
        </nav>
      )}
      {(error || loadError) && (
        <p className="form-error" role="alert">
          {error || loadError}
        </p>
      )}
      {notice && (
        <p className="mystery-notice" role="status">
          {notice}
        </p>
      )}
      {!sessionId && tab === "parent" && (
        <MysteryImporter cases={cases} onSaved={refresh} />
      )}
      {!sessionId && tab !== "parent" && (
        <>
          <div className="case-intro">
            <p className="eyebrow">
              {tab === "solved"
                ? "OUR CLOSED CASE FILES"
                : "A CASE FOR EVERY KIND OF EVENING"}
            </p>
            <h2>
              {tab === "solved"
                ? "Remember what we discovered."
                : "Choose a little intrigue."}
            </h2>
            <p>
              Bring your own screen. Read your clues aloud. The best discoveries
              happen between the three of you.
            </p>
          </div>
          <div className="case-library">
            {cases
              .filter((c) =>
                tab === "solved" ? c.solved : c.published || c.activeId,
              )
              .map((c) => (
                <article className="case-file" key={c.id}>
                  <CaseArt motif={c.cover.motif} />
                  <div className="case-file-body">
                    <p className="note-label">
                      {c.series} · Case {String(c.caseNumber).padStart(3, "0")}
                    </p>
                    <h3>{c.title}</h3>
                    <p className="case-description">{c.description}</p>
                    <p className="case-meta">
                      {c.difficulty} ·{" "}
                      {c.minutes[0] === c.minutes[1]
                        ? c.minutes[0]
                        : c.minutes.join("–")}{" "}
                      minutes · 3 adventurers
                    </p>
                    <div className="message-controls">
                      {c.activeId ? (
                        <button
                          className="button"
                          onClick={() => open(c.activeId)}
                        >
                          Continue Case
                        </button>
                      ) : (
                        c.published && (
                          <button
                            className="button"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const r = await mysteryRequest<{ id: string }>(
                                  "/new",
                                  { id: crypto.randomUUID(), caseId: c.id },
                                );
                                open(r.id);
                              })
                            }
                          >
                            {c.solved ? "Play again" : "New Case"}
                          </button>
                        )
                      )}
                      {c.completedId && (
                        <button
                          className="text-button"
                          onClick={() => open(c.completedId)}
                        >
                          Case memory
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
          </div>
          {tab === "solved" && !cases.some((c) => c.solved) && (
            <p className="empty-post">
              Your first solved mystery will have a home here.
            </p>
          )}
        </>
      )}
      {sessionId && !game && !error && (
        <p role="status">Opening your case file…</p>
      )}
      {game && (
        <>
          <div className="game-title">
            <p className="eyebrow">
              {game.status === "lobby"
                ? "YOUR TEAM’S CASE FILE"
                : game.status === "completed"
                  ? "CASE SOLVED"
                  : "THE CASE IS AFOOT"}
            </p>
            <h2>{game.title}</h2>
          </div>
          {game.status === "lobby" && (
            <section className="game-lobby">
              <CaseArt motif={game.cover.motif} />
              <div>
                <h3>Gather at Headquarters.</h3>
                <p className="clue-text">{game.introduction}</p>
                <p className="muted">
                  Each person opens this case on their own device, joins, and
                  chooses Ready. These choices belong only to this game; they do
                  not say who is online.
                </p>
                <ul className="lobby-players">
                  {(["mia", "mom", "dad"] as const).map((k) => {
                    const p = game.players.find((p) => p.key === k);
                    return (
                      <li key={k}>
                        <span className="note-seal">{k[0].toUpperCase()}</span>
                        <strong>
                          {p?.name ?? k[0].toUpperCase() + k.slice(1)}
                        </strong>
                        <span>
                          {p
                            ? p.ready
                              ? "Ready"
                              : "Joined · not ready"
                            : "Invitation waiting"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="message-controls">
                  {!game.joined ? (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => void event("join")}
                    >
                      Join this case
                    </button>
                  ) : (
                    <button
                      className="secondary-button"
                      disabled={busy}
                      aria-pressed={
                        game.players.find((p) => p.key === profile.key)
                          ?.ready ?? false
                      }
                      onClick={() =>
                        void event("ready", {
                          ready: !game.players.find(
                            (p) => p.key === profile.key,
                          )?.ready,
                        })
                      }
                    >
                      {game.players.find((p) => p.key === profile.key)?.ready
                        ? "Not Ready"
                        : "I’m Ready"}
                    </button>
                  )}
                  <button
                    className="button"
                    disabled={
                      busy ||
                      !game.joined ||
                      game.players.length !== 3 ||
                      game.players.some((p) => !p.ready)
                    }
                    onClick={() => void event("start")}
                  >
                    Begin case
                  </button>
                </div>
              </div>
            </section>
          )}
          {game.status !== "lobby" && !game.joined && (
            <p>
              This case belongs to its joined adventurers. Return to the library
              to choose your next case together.
            </p>
          )}
          {activeScene && (
            <div className="scene-page" key={activeScene.id}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    {activeScene.finale
                      ? "THE FINAL DEDUCTION"
                      : "OPEN THE NEXT PIECE"}
                  </p>
                  <h2>{activeScene.title}</h2>
                </div>
              </div>
              <section
                className="private-clues"
                aria-label="Your private clues"
              >
                <p className="eyebrow">
                  ONLY ON {profile.displayName.toUpperCase()}’S SCREEN
                </p>
                <h3>Your part of the mystery.</h3>
                <p>
                  Share what you find by talking together. The others have
                  different pieces.
                </p>
                {activeScene.private.map((c, i) => (
                  <ClueCard key={i} clue={c} />
                ))}
              </section>
              <section className="shared-clues" aria-label="Shared clues">
                <p className="eyebrow">ON EVERYONE’S CASE FILE</p>
                {activeScene.shared.map((c, i) => (
                  <ClueCard key={i} clue={c} />
                ))}
              </section>
              <section className="shared-puzzle" aria-label="Shared puzzle">
                <h3>Put your clues together.</h3>
                {activeScene.solved ? (
                  <div className="case-resolution" role="status">
                    <p className="eyebrow">THAT’S IT!</p>
                    <p>{activeScene.resolution}</p>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => void event("advance")}
                    >
                      {activeScene.finale ? "Close the case" : "Turn the page"}{" "}
                      →
                    </button>
                  </div>
                ) : activeScene.puzzle ? (
                  <PuzzlePanel
                    puzzle={activeScene.puzzle}
                    busy={busy}
                    onAnswer={(answer) => event("answer", { answer })}
                  />
                ) : (
                  <p>
                    {activeScene.instruction} This selection is on{" "}
                    {activeScene.operator}’s screen. Share your clue to help.
                  </p>
                )}
              </section>
              <section className="headquarters" aria-label="Hints">
                <h3>Ask Headquarters</h3>
                <p>A nudge is always welcome. No points, no penalties.</p>
                {activeScene.hints.map((h, i) => (
                  <div className="hint-note" key={i}>
                    <strong>
                      {i === 2
                        ? "Headquarters’ answer"
                        : `A little nudge ${i + 1}`}
                    </strong>
                    <p>{h}</p>
                  </div>
                ))}
                <button
                  className="secondary-button"
                  disabled={busy || activeScene.hints.length === 3}
                  onClick={() => void event("hint")}
                >
                  {activeScene.hints.length === 0
                    ? "Ask for Hint 1"
                    : activeScene.hints.length === 1
                      ? "Ask for Hint 2"
                      : activeScene.hints.length === 2
                        ? "Give Us the Answer"
                        : "Headquarters has shared everything"}
                </button>
              </section>
            </div>
          )}
          {game.summary && (
            <section className="case-complete">
              <CaseArt motif={game.cover.motif} />
              <p className="eyebrow">FILED UNDER: SOLVED TOGETHER</p>
              <h2>Case solved!</h2>
              <p className="clue-text">{game.summary.ending}</p>
              <p className="achievement">✧ {game.summary.achievement}</p>
              <p>Completed by {game.players.map((p) => p.name).join(" + ")}</p>
              <p>
                {game.summary.puzzles} puzzles solved · Hints used:{" "}
                {game.summary.hints}
              </p>
              <button className="button" onClick={() => open(null)}>
                Back to our case library
              </button>
            </section>
          )}
          {game.notebook.length > 0 && (
            <details className="case-notebook">
              <summary>
                Your case notebook · {game.notebook.length} discoveries
              </summary>
              {game.notebook.map((n, i) => (
                <section key={i}>
                  <h3>{n.title}</h3>
                  {n.clues.map((c, j) => (
                    <ClueCard key={j} clue={c} />
                  ))}
                  <p>{n.resolution}</p>
                </section>
              ))}
            </details>
          )}
        </>
      )}
      <p className="messages-footer">
        Every great case starts with “What did you find?”
      </p>
    </section>
  );
}
