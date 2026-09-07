/* eslint-disable @next/next/no-img-element -- Private media and local previews must bypass the public image optimization cache. */
"use client";
import { useEffect, useRef, useState } from "react";
import type { Profile, MediaType } from "@/lib/shared/types";
import { base64, messageRequest } from "./api";
import { Doodle } from "./doodle";
import { Recorder } from "./recorder";
const people = [
  { key: "mom", name: "Mom" },
  { key: "dad", name: "Dad" },
  { key: "mia", name: "Mia" },
] as const;
export function Composer({
  profile,
  onClose,
  onSent,
}: {
  profile: Profile;
  onClose: () => void;
  onSent: (later: boolean) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [everyone, setEveryone] = useState(false);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<MediaType | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [alt, setAlt] = useState("");
  const [later, setLater] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const id = useRef("");
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const previewRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    id.current = crypto.randomUUID();
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setPreview(url);
    requestAnimationFrame(() =>
      previewRegion.current?.focus({ preventScroll: true }),
    );
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  function choose(type: MediaType) {
    setKind(type);
    setBlob(null);
    setPreview("");
    setAlt("");
    setError("");
  }
  function file(file: File | undefined) {
    if (!file) return;
    if (
      file.size >
      (kind === "video" ? 32 : kind === "audio" ? 12 : 8) * 1024 * 1024
    ) {
      setError("This file is a little too big. Please choose a smaller one.");
      return;
    }
    setError("");
    setBlob(file);
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current || recording) return;
    setError("");
    if (!everyone && !selected.length) {
      setError("Who is this for? Choose someone first.");
      return;
    }
    if (!text.trim() && !blob) {
      setError("Write a note or add something before sending.");
      return;
    }
    if (blob && !alt.trim()) {
      setError("Add a description or the words in your recording.");
      return;
    }
    let sendAt: string | null = null;
    if (later) {
      const planned = new Date(date + "T" + time);
      if (
        !date ||
        !time ||
        !Number.isFinite(planned.getTime()) ||
        planned.getTime() <= Date.now()
      ) {
        setError("Choose a date and time in the future.");
        return;
      }
      sendAt = planned.toISOString();
    }
    lock.current = true;
    setBusy(true);
    try {
      await messageRequest("", {
        id: id.current,
        recipients: everyone ? people.map((p) => p.key) : selected,
        everyone,
        text,
        sendAt,
        attachment:
          blob && kind
            ? { kind, data: await base64(blob), altText: alt }
            : null,
      });
      onSent(later);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "We couldn't send this yet. Please try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="composer">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A LITTLE SOMETHING, JUST FOR THEM</p>
          <h2 tabIndex={-1} ref={heading}>
            Leave something special.
          </h2>
        </div>
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={onClose}
        >
          Back to messages
        </button>
      </div>
      <form onSubmit={send} className="entry-form">
        <fieldset disabled={busy}>
          <legend>Who is it for?</legend>
          <div className="message-controls recipients">
            {people
              .filter((p) => p.key !== profile.key)
              .map((p) => (
                <button
                  type="button"
                  className="secondary-button"
                  key={p.key}
                  aria-pressed={!everyone && selected.includes(p.key)}
                  onClick={() => {
                    setEveryone(false);
                    setSelected(
                      selected.includes(p.key)
                        ? selected.filter((k) => k !== p.key)
                        : [...selected, p.key],
                    );
                  }}
                >
                  {p.name}
                </button>
              ))}
            <button
              type="button"
              className="secondary-button"
              aria-pressed={everyone}
              onClick={() => {
                setEveryone(!everyone);
                setSelected([]);
              }}
            >
              Everyone
            </button>
          </div>
          <p className="muted">
            {everyone
              ? "For all three of us, including you."
              : "Pick one person or both."}
          </p>
        </fieldset>
        <label htmlFor="message-note">Your note</label>
        <textarea
          id="message-note"
          maxLength={3000}
          rows={5}
          value={text}
          disabled={busy}
          placeholder="Something funny. Something lovely. Something only they would understand."
          onChange={(e) => setText(e.target.value)}
        />
        <fieldset disabled={busy}>
          <legend>
            Add a little more <span className="muted">(optional)</span>
          </legend>
          <div className="message-controls attachment-types">
            {(["photo", "audio", "video", "doodle"] as const).map((type, i) => (
              <button
                type="button"
                key={type}
                className="secondary-button"
                aria-pressed={kind === type}
                onClick={() => choose(type)}
              >
                {["▧ Photo", "♫ Voice", "▷ Video", "✎ Drawing"][i]}
              </button>
            ))}
          </div>
        </fieldset>
        {kind && !busy && (
          <div className="attachment-box">
            {!blob && kind === "doodle" && <Doodle onSave={setBlob} />}
            {!blob && (kind === "audio" || kind === "video") && (
              <Recorder
                key={kind}
                kind={kind}
                onSave={setBlob}
                onRecordingChange={setRecording}
              />
            )}
            {!blob && kind !== "doodle" && (
              <label className="file-picker">
                Choose{" "}
                {kind === "audio"
                  ? "an audio"
                  : kind === "video"
                    ? "a video"
                    : "a photo"}{" "}
                file
                <input
                  type="file"
                  accept={
                    kind === "photo"
                      ? "image/jpeg,image/png,image/webp"
                      : kind === "audio"
                        ? "audio/*"
                        : "video/mp4,video/webm"
                  }
                  onChange={(e) => file(e.target.files?.[0])}
                />
                <span className="muted">
                  {kind === "photo"
                    ? "JPEG, PNG or WebP · up to 8 MB"
                    : kind === "video"
                      ? "MP4 or WebM · up to 2 minutes / 32 MB"
                      : "Up to 5 minutes / 12 MB"}
                </span>
              </label>
            )}
            {blob && (
              <div
                className="media-preview"
                ref={previewRegion}
                tabIndex={-1}
                role="group"
                aria-label="Attachment preview"
              >
                {(kind === "photo" || kind === "doodle") && preview && (
                  <img src={preview} alt={alt || "Your attachment preview"} />
                )}
                {kind === "audio" && preview && (
                  <audio
                    controls
                    src={preview}
                    aria-label="Preview your voice message"
                  />
                )}
                {kind === "video" && preview && (
                  <video
                    controls
                    playsInline
                    src={preview}
                    aria-label="Preview your video message"
                  />
                )}
                <label htmlFor="media-description">
                  {kind === "audio" || kind === "video"
                    ? "Words in the recording / description"
                    : "Describe your picture"}
                </label>
                <textarea
                  id="media-description"
                  value={alt}
                  maxLength={1000}
                  rows={2}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="So everyone can enjoy it, even without sound or a picture."
                />
              </div>
            )}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setBlob(null);
                setPreview("");
                setKind(null);
                setAlt("");
              }}
            >
              Discard attachment
            </button>
          </div>
        )}
        <fieldset disabled={busy}>
          <legend>When should it arrive?</legend>
          <div className="message-controls">
            <button
              type="button"
              className="secondary-button"
              aria-pressed={!later}
              onClick={() => setLater(false)}
            >
              Send Now
            </button>
            <button
              type="button"
              className="secondary-button"
              aria-pressed={later}
              onClick={() => setLater(true)}
            >
              Send Later
            </button>
          </div>
          {later && (
            <div className="schedule-fields">
              <label>
                Delivery date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
              <label>
                Delivery time
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </label>
              <p className="muted">
                Using this device’s time zone:{" "}
                {Intl.DateTimeFormat().resolvedOptions().timeZone}. Only you can
                see it until then.
              </p>
            </div>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button send-button" disabled={busy || recording}>
          {busy
            ? "Leaving your something…"
            : later
              ? "Schedule this message"
              : "Send this message"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </form>
    </section>
  );
}
