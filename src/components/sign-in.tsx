/* eslint-disable @next/next/no-location-assign-relative-destination -- Authentication transitions must discard the previous profile router cache. */
"use client";
import { useState } from "react";
import type { Profile } from "@/lib/shared/types";
import { authRequest } from "./api";
export function SignIn() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState("mia");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      if (!profiles.length) {
        const result = await authRequest<{ profiles: Profile[] }>("family", {
          phrase: data.get("phrase"),
        });
        form.reset();
        setProfiles(result.profiles);
      } else {
        await authRequest("profile", {
          key: selected,
          passcode: data.get("passcode"),
          remember: data.get("remember") === "on",
        });
        window.location.assign("/home");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="entry-form">
      {!profiles.length ? (
        <>
          <label htmlFor="phrase">Your family’s access phrase</label>
          <p className="muted">
            Just for your family. Ask a parent if you need a hand.
          </p>
          <input
            id="phrase"
            name="phrase"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
            autoFocus
          />
        </>
      ) : (
        <>
          <fieldset>
            <legend>Who’s coming in?</legend>
            <div className="profile-picker">
              {profiles.map((p) => (
                <label key={p.id} className="profile-choice">
                  <input
                    type="radio"
                    name="profile"
                    value={p.key}
                    checked={selected === p.key}
                    onChange={() => setSelected(p.key)}
                  />
                  <span
                    className="avatar"
                    style={{ backgroundColor: p.color }}
                    aria-hidden="true"
                  >
                    {p.displayName.charAt(0)}
                  </span>
                  <span>{p.displayName}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="passcode">Your passcode</label>
          <input
            id="passcode"
            name="passcode"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
            autoFocus
          />
          <label className="checkbox">
            <input name="remember" type="checkbox" defaultChecked />
            Remember this device
          </label>
          <p className="muted">
            Next time, this device opens straight to your Home Base. Uncheck
            this on a shared device.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? "One moment…" : profiles.length ? "Come on in" : "Continue"}
        <span aria-hidden="true"> →</span>
      </button>
      {profiles.length > 0 && (
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={() => {
            setProfiles([]);
            setError("");
          }}
        >
          Start again
        </button>
      )}
    </form>
  );
}
