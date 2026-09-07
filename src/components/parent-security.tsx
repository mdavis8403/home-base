"use client";
import { useState } from "react";
import { authRequest } from "./api";
export function ParentSecurity({ admin }: { admin: boolean }) {
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="settings-panel">
      <h2>Remembered devices</h2>
      <p>
        Confirm your own passcode to protect sensitive settings for the next 10
        minutes.
      </p>
      <form
        className="entry-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const passcode = new FormData(form).get("passcode");
          setBusy(true);
          setError("");
          setMessage("");
          try {
            await authRequest("reauth", { passcode });
            form.reset();
            setMessage(
              "Passcode confirmed. Parent protection is unlocked for 10 minutes.",
            );
          } catch (e) {
            setError(e instanceof Error ? e.message : "Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="parent-passcode">Your parent passcode</label>
        <input
          id="parent-passcode"
          type="password"
          name="passcode"
          autoComplete="current-password"
          maxLength={256}
          required
        />
        <button className="button" disabled={busy}>
          Confirm passcode
        </button>
      </form>
      {admin && (
        <>
          <p className="muted">
            If a device is lost or shared, sign out every other family device.
            This device stays signed in.
          </p>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              setMessage("");
              try {
                await authRequest("revoke-devices", {});
                setMessage("All other family devices have been signed out.");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Sign out all other devices
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}
