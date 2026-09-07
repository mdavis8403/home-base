"use client";
import { useRef, useState } from "react";
import { authRequest } from "@/components/api";
import {
  boardLabels,
  boardTypes,
  categories,
  type BoardData,
} from "@/lib/shared/board";
import { boardRequest } from "./api";
export function BoardSettings({
  data,
  onSaved,
}: {
  data: BoardData;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const promptId = useRef<string | null>(null);
  async function run(action: () => Promise<void>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="board-settings"
      aria-label="Family Board parent settings"
    >
      <p className="eyebrow">A FEW PARENT TOUCHES</p>
      <h2>Make this board ours.</h2>
      <p>
        New prompts and preferences begin with the next daily board. Today’s
        surprise stays as it is.
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
          }, "Passcode confirmed for 10 minutes.");
        }}
      >
        <label>
          Your parent passcode
          <input
            name="passcode"
            type="password"
            required
            autoComplete="current-password"
            maxLength={256}
          />
        </label>
        <button className="secondary-button" disabled={busy}>
          Confirm passcode
        </button>
      </form>
      <form
        className="entry-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void run(async () => {
            await boardRequest("/settings", {
              revealTime: f.get("time"),
              categories: f.getAll("category"),
            });
            await onSaved();
          }, "Saved for the next board.");
        }}
      >
        <h3>Our reveal time</h3>
        <label>
          Reveal time
          <input
            key={data.revealTime}
            name="time"
            type="time"
            required
            defaultValue={data.revealTime}
          />
        </label>
        <p className="muted">
          Family timezone: {data.timezone}. The default is 8:00 PM.
        </p>
        <fieldset>
          <legend>Prompt categories</legend>
          {categories.map((c) => (
            <label className="timer-choice" key={c}>
              <input
                type="checkbox"
                name="category"
                value={c}
                defaultChecked={data.categories.includes(c)}
              />
              {c}
            </label>
          ))}
        </fieldset>
        <button className="button" disabled={busy}>
          Save board preferences
        </button>
      </form>
      <form
        className="entry-form"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          promptId.current ??= crypto.randomUUID();
          void run(async () => {
            await boardRequest("/prompt", {
              id: promptId.current,
              type: f.get("type"),
              category: f.get("category"),
              text: f.get("text"),
            });
            promptId.current = null;
            form.reset();
            await onSaved();
          }, "Your prompt is ready for a future board.");
        }}
      >
        <h3>A prompt from you</h3>
        <label>
          Activity
          <select name="type">
            {boardTypes.map((t) => (
              <option key={t} value={t}>
                {boardLabels[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select name="category">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Your custom prompt
          <textarea
            name="text"
            required
            minLength={5}
            maxLength={300}
            rows={3}
            placeholder="If our sofa could fly, where would we take it?"
          />
        </label>
        <button className="button" disabled={busy}>
          Add custom prompt
        </button>
      </form>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {data.customPrompts.length > 0 && (
        <div>
          <h3>Prompts from our family</h3>
          <ul className="custom-prompts">
            {data.customPrompts.map((p) => (
              <li key={p.id}>
                <p>{p.text}</p>
                <span className="muted">
                  {boardLabels[p.type]} · {p.category}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
