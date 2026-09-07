"use client";
import { useState } from "react";
import { authRequest } from "@/components/api";
import type { MysteryPackage } from "@/lib/shared/mystery/schema";
import type { CaseCard } from "@/lib/shared/mystery/types";
import { mysteryRequest } from "./api";
import { CaseArt, ClueCard } from "./art";
export function MysteryImporter({
  cases,
  onSaved,
}: {
  cases: CaseCard[];
  onSaved: () => Promise<void>;
}) {
  const [raw, setRaw] = useState(""),
    [preview, setPreview] = useState<MysteryPackage | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [player, setPlayer] = useState<"mia" | "mom" | "dad">("mia"),
    [scene, setScene] = useState(0);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mystery-import">
      <p className="eyebrow">PARENT CASE DESK</p>
      <h2>Bring a new mystery home.</h2>
      <p>
        Confirm your passcode, choose a case file, and inspect its clues before
        publishing. New versions leave games already in progress intact.
      </p>
      <form
        className="entry-form"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const passcode = new FormData(form).get("passcode");
          void run(async () => {
            await authRequest("reauth", { passcode });
            form.reset();
            setNotice("Parent access confirmed for 10 minutes.");
          });
        }}
      >
        <label>
          Your parent passcode
          <input
            required
            type="password"
            name="passcode"
            autoComplete="current-password"
          />
        </label>
        <button className="secondary-button" disabled={busy}>
          Confirm passcode
        </button>
      </form>
      <label className="file-picker">
        Import Mystery File
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(null);
            if (!file) return;
            if (file.size > 900_000) {
              setError("Choose a case file under 900 KB.");
              return;
            }
            void run(async () => {
              setRaw(await file.text());
            });
          }}
        />
      </label>
      <button
        className="button"
        disabled={busy || !raw}
        onClick={() =>
          void run(async () => {
            setPreview(null);
            setScene(0);
            setPreview(
              await mysteryRequest<MysteryPackage>("/preview", JSON.parse(raw)),
            );
            setNotice("The case passed validation. Review its scenes below.");
          })
        }
      >
        Validate and preview
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {preview && (
        <div className="import-preview">
          <CaseArt motif={preview.cover.motif} />
          <h3>{preview.title}</h3>
          <p>{preview.introduction}</p>
          <div className="message-controls">
            <label>
              Preview scene
              <select
                value={scene}
                onChange={(e) => setScene(Number(e.target.value))}
              >
                {preview.scenes.map((s, i) => (
                  <option value={i} key={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preview player
              <select
                value={player}
                onChange={(e) => setPlayer(e.target.value as typeof player)}
              >
                {["mia", "mom", "dad"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
          </div>
          <h3>Shared clues</h3>
          {preview.scenes[scene].shared.map((c, i) => (
            <ClueCard key={i} clue={c} />
          ))}
          <h3>{player}’s clues</h3>
          {preview.scenes[scene].private[player].map((c, i) => (
            <ClueCard key={i} clue={c} />
          ))}
          <p>
            <strong>Puzzle:</strong> {preview.scenes[scene].puzzle.instruction}
          </p>
          <details>
            <summary>Author’s answer and hints</summary>
            <p>{JSON.stringify(preview.scenes[scene].puzzle.solution)}</p>
            {preview.scenes[scene].puzzle.hints.map((h) => (
              <p key={h}>{h}</p>
            ))}
          </details>
          <p>
            <strong>Ending:</strong> {preview.ending}
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await mysteryRequest("/publish", {
                  package: preview,
                  published: true,
                });
                await onSaved();
                setNotice(
                  "Published. Your family can find this case in the library.",
                );
              })
            }
          >
            Publish this mystery
          </button>
        </div>
      )}
      <h3>Case availability</h3>
      {cases.map((c) => (
        <div className="publication-row" key={c.id}>
          <span>{c.title}</span>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await mysteryRequest("/publication", {
                  id: c.id,
                  published: !c.published,
                });
                await onSaved();
                setNotice(
                  c.published
                    ? "Hidden from new games. Existing games are still available."
                    : "Available for new games.",
                );
              })
            }
          >
            {c.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      ))}
    </section>
  );
}
