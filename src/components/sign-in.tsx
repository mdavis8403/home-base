/* eslint-disable @next/next/no-location-assign-relative-destination -- Authentication transitions discard the previous profile router cache. */
"use client";
import { useRef, useState } from "react";
import type { Profile } from "@/lib/shared/types";
import { authRequest } from "./api";

export function SignIn({ configured }: { configured: boolean }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [phase, setPhase] = useState<"cottage" | "opening" | "profiles">(
    "cottage",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const door = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const locked = useRef(false);

  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    try {
      const result = await authRequest<{ profiles: Profile[] }>("family", {
        phrase: new FormData(form).get("phrase"),
      });
      form.reset();
      dialog.current?.close();
      setProfiles(result.profiles);
      setPhase("opening");
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 650,
        ),
      );
      setPhase("profiles");
      requestAnimationFrame(() => heading.current?.focus());
    } catch {
      setError(
        "The door is still dreaming. Try the magic word again in a little moment.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function choose(key: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await authRequest("profile", { key, remember });
      window.location.assign("/home");
    } catch {
      setError(
        "Let’s try the cottage door once more. Your invitation may have gone to sleep.",
      );
      setBusy(false);
      locked.current = false;
    }
  }
  return (
    <main id="main" className={`cottage-entry cottage-${phase}`}>
      <div className="cottage-scene" aria-hidden={phase !== "cottage"}>
        {/* The hotspot and artwork share one coordinate system at every screen size. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- Preserve the supplied full-bleed artwork without cropping it separately from its hotspot. */}
        <img
          className="cottage-art"
          src="/images/home-base-door.png"
          alt="A lantern-lit fairy-tale cottage with a teal front door"
          fetchPriority="high"
        />
        <button
          ref={door}
          className="cottage-door"
          aria-label="Open the cottage door"
          tabIndex={phase === "cottage" ? 0 : -1}
          disabled={phase !== "cottage"}
          onClick={() => {
            setError("");
            dialog.current?.showModal();
          }}
        />
      </div>
      {phase !== "profiles" && (
        <p className="cottage-tagline">
          No matter where we are,
          <br className="phone-break" /> we meet here.
        </p>
      )}
      <dialog
        ref={dialog}
        className="magic-dialog"
        aria-labelledby="magic-title"
        onClose={() => door.current?.focus()}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <button
          className="magic-close"
          aria-label="Close magic word prompt"
          disabled={busy}
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        <p className="eyebrow">A LITTLE MAGIC. A PLACE OF OUR OWN.</p>
        <h1 id="magic-title">What’s the magic word?</h1>
        {configured ? (
          <form onSubmit={unlock} className="entry-form">
            <p>Whisper it here. Home is just beyond the door.</p>
            <label htmlFor="magic-word">Our family’s magic word</label>
            <input
              id="magic-word"
              name="phrase"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
              autoFocus
            />
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="button" disabled={busy}>
              {busy ? "A little spark…" : "Open the door"}
              <span aria-hidden="true"> ✧</span>
            </button>
          </form>
        ) : (
          <p>
            We’re getting your keys ready. A parent needs to finish the private
            family setup before the door can open.
          </p>
        )}
      </dialog>
      {phase === "profiles" && (
        <section className="homecoming-panel">
          <p className="eyebrow">THE LIGHT IS ALWAYS ON FOR YOU</p>
          <h1 ref={heading} tabIndex={-1}>
            Who’s coming home?
          </h1>
          <div className="homecoming-profiles">
            {(["mom", "dad", "mia"] as const).map((key) => {
              const p = profiles.find((p) => p.key === key);
              return (
                p && (
                  <button
                    key={key}
                    className={`homecoming-profile homecoming-${key}`}
                    disabled={busy}
                    onClick={() => void choose(key)}
                  >
                    <span className="homecoming-emblem" aria-hidden="true">
                      {key === "mom" ? "❀" : key === "dad" ? "☼" : "✧"}
                    </span>
                    <span>{p.displayName}</span>
                  </button>
                )
              );
            })}
          </div>
          <label className="checkbox remember-home">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={busy}
            />
            Remember me on this device
          </label>
          <p className="muted">On a shared device, leave this unchecked.</p>
          {busy && <p role="status">Welcome home…</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              setPhase("cottage");
              setProfiles([]);
              setError("");
              requestAnimationFrame(() => door.current?.focus());
            }}
          >
            Back to the cottage
          </button>
        </section>
      )}
    </main>
  );
}
