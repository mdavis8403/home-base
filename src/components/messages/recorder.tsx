"use client";
import { useEffect, useRef, useState } from "react";
export function Recorder({
  kind,
  onSave,
  onRecordingChange,
}: {
  kind: "audio" | "video";
  onSave: (blob: Blob) => void;
  onRecordingChange: (recording: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const alive = useRef(true);
  const limit = kind === "audio" ? 300 : 120;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      onRecordingChange(false);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onRecordingChange]);
  useEffect(() => {
    if (!recording) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setSeconds(elapsed);
      // Leave a small margin for browser/container timing at the server limit.
      if (elapsed >= limit - 1 && recorder.current?.state === "recording")
        recorder.current.stop();
    }, 250);
    return () => clearInterval(timer);
  }, [recording, limit]);
  async function start() {
    setError("");
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "Recording isn't available in this browser. You can choose an existing file below.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video:
          kind === "video"
            ? {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user",
              }
            : false,
      });
      if (!alive.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      if (video.current) {
        video.current.srcObject = media;
        void video.current.play();
      }
      const types =
        kind === "audio"
          ? ["audio/webm;codecs=opus", "audio/mp4"]
          : ["video/webm;codecs=vp8,opus", "video/mp4"];
      const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(media, {
        ...(mimeType ? { mimeType } : {}),
        ...(kind === "video"
          ? { videoBitsPerSecond: 1_200_000, audioBitsPerSecond: 64_000 }
          : { audioBitsPerSecond: 64_000 }),
      });
      const chunks: Blob[] = [];
      let bytes = 0;
      let failed = false;
      r.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.push(e.data);
          bytes += e.data.size;
          if (bytes > (kind === "video" ? 32 : 12) * 1024 * 1024) {
            failed = true;
            if (r.state === "recording") r.stop();
          }
        }
      };
      r.onerror = () => {
        failed = true;
        setRecording(false);
        onRecordingChange(false);
        setError("Recording stopped unexpectedly. Please try again.");
        media.getTracks().forEach((t) => t.stop());
      };
      r.onstop = () => {
        media.getTracks().forEach((t) => t.stop());
        if (alive.current) {
          setRecording(false);
          onRecordingChange(false);
          if (!failed) onSave(new Blob(chunks, { type: r.mimeType }));
          else
            setError(
              "That recording couldn't be saved. Please try a shorter one.",
            );
        }
      };
      recorder.current = r;
      setSeconds(0);
      setRecording(true);
      onRecordingChange(true);
      r.start(1000);
    } catch (error) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setRecording(false);
      onRecordingChange(false);
      setError(
        error instanceof Error && error.message.includes("existing file")
          ? error.message
          : "We couldn't start recording. Allow the camera or microphone in your browser, or choose a file.",
      );
    } finally {
      if (alive.current) setStarting(false);
    }
  }
  return (
    <section
      className="recording-box"
      aria-label={kind === "audio" ? "Voice recorder" : "Video recorder"}
    >
      {kind === "video" && (
        <video ref={video} muted playsInline aria-label="Camera preview" />
      )}
      <p>
        {kind === "audio"
          ? "A familiar voice can make a whole day."
          : "Leave a little moment from your day."}
      </p>
      <p className="muted">
        {kind === "audio" ? "Up to 5 minutes" : "Up to 2 minutes"} ·{" "}
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </p>
      <button
        type="button"
        className="button"
        disabled={starting}
        onClick={() => {
          if (recording) {
            if (recorder.current?.state === "recording")
              recorder.current.stop();
          } else {
            void start();
          }
        }}
      >
        {recording
          ? "Stop recording"
          : starting
            ? "Opening recorder…"
            : "Record"}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}
