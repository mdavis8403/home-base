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
        Confirm the separate administration key to protect sensitive settings
        for the next 10 minutes.
      </p>
      <form
        className="entry-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const adminKey = new FormData(form).get("adminKey");
          setBusy(true);
          setError("");
          setMessage("");
          try {
            await authRequest("reauth", { adminKey });
            form.reset();
            setMessage(
              "Administration key confirmed. Parent protection is unlocked for 10 minutes.",
            );
          } catch (e) {
            setError(e instanceof Error ? e.message : "Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="parent-adminKey">Administration key</label>
        <input
          id="parent-adminKey"
          type="password"
          name="adminKey"
          autoComplete="current-password"
          maxLength={256}
          required
        />
        <button className="button" disabled={busy}>
          Confirm administration key
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
