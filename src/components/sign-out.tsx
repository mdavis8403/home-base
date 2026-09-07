/* eslint-disable @next/next/no-location-assign-relative-destination -- Authentication transitions must discard the previous profile router cache. */
"use client";
import { useState } from "react";
import { authRequest } from "./api";
export function SignOut() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        className="text-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await authRequest("sign-out", {});
            window.location.assign("/");
          } catch {
            setError("Could not sign out. Please try again.");
            setBusy(false);
          }
        }}
      >
        Sign out
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
