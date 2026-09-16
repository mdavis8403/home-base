"use client";
import { useState } from "react";
import {
  adventureLabels,
  adventureTypes,
  castLabels,
  castMembers,
  lengthLabels,
  lengthModes,
  moodLabels,
  moods,
  type AdventureType,
  type CastMember,
  type LengthMode,
  type Mood,
} from "@/lib/shared/story/types";
export function StorySetup({
  busy,
  onBegin,
  onBack,
}: {
  busy: boolean;
  onBegin: (payload: {
    adventureType: AdventureType;
    mood: Mood;
    lengthMode: LengthMode;
    cast: (CastMember | "everyone")[];
  }) => void;
  onBack: () => void;
}) {
  const [adventure, setAdventure] = useState<AdventureType>("mystery");
  const [mood, setMood] = useState<Mood>("funny");
  const [length, setLength] = useState<LengthMode>("night");
  const [cast, setCast] = useState<Set<CastMember>>(new Set(castMembers));
  const everyone = castMembers.every((m) => cast.has(m));
  function toggle(member: CastMember) {
    setCast((prev) => {
      const next = new Set(prev);
      if (next.has(member)) next.delete(member);
      else next.add(member);
      return next.size ? next : new Set([member]);
    });
  }
  return (
    <div className="story-book setup-book">
      <div className="book-spread is-setup">
        <div className="book-leaf leaf-left setup-intro">
          <p className="chapter-eyebrow">A NEW STORY</p>
          <h2 className="opening-title">What are we telling tonight?</h2>
          <p className="story-prose">
            <span>
              Pick a shape for the adventure, choose who stars in it, and we’ll
              open the book together. You can always start another.
            </span>
          </p>
          <button className="story-btn ghost" onClick={onBack} disabled={busy}>
            ‹ Back to the reading nook
          </button>
        </div>
        <div className="book-leaf leaf-right setup-form">
          <fieldset className="setup-field">
            <legend>Adventure type</legend>
            <div className="chip-row">
              {adventureTypes.map((a) => (
                <button
                  key={a}
                  type="button"
                  className="story-chip"
                  aria-pressed={adventure === a}
                  onClick={() => setAdventure(a)}
                >
                  {adventureLabels[a]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="setup-field">
            <legend>Stars</legend>
            <div className="chip-row">
              {castMembers.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="story-chip"
                  aria-pressed={cast.has(m)}
                  onClick={() => toggle(m)}
                >
                  {castLabels[m]}
                </button>
              ))}
              <button
                type="button"
                className="story-chip chip-everyone"
                aria-pressed={everyone}
                onClick={() => setCast(new Set(castMembers))}
              >
                Everyone
              </button>
            </div>
          </fieldset>
          <fieldset className="setup-field">
            <legend>Mood</legend>
            <div className="chip-row">
              {moods.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="story-chip"
                  aria-pressed={mood === m}
                  onClick={() => setMood(m)}
                >
                  {moodLabels[m]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="setup-field">
            <legend>Length</legend>
            <div className="chip-row">
              {lengthModes.map((l) => (
                <button
                  key={l}
                  type="button"
                  className="story-chip"
                  aria-pressed={length === l}
                  onClick={() => setLength(l)}
                >
                  {lengthLabels[l]}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            className="story-btn primary begin-btn"
            disabled={busy}
            onClick={() =>
              onBegin({
                adventureType: adventure,
                mood,
                lengthMode: length,
                cast: everyone ? ["everyone"] : [...cast],
              })
            }
          >
            {busy ? "Opening the book…" : "Begin our story"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
