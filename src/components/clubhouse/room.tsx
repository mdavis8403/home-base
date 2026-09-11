"use client";
// The clubhouse world: the approved painterly interior (public/images/
// clubhouse-interior.png, 1672×941) as the primary room, with transparent
// responsive hotspots over the writing nook, family wall, study door and
// reading chair. A point-and-click "camera" (CSS transform on the camera
// frame) glides toward the chosen place. Hover/focus shows only a soft warm
// affordance + a contextual tooltip — no permanent labels on the image.
//
// Alignment is aspect-locked: the image lives in a 16:9 cover box, and hotspots
// are positioned as fractions of that box, so they track the artwork's objects
// at every breakpoint (the viewport simply crops the oversized box).
import { useEffect, useRef, useState } from "react";
import {
  DESTINATIONS,
  AMBIENT_SPOTS,
  framingFor,
  type CameraView,
  type DestinationId,
} from "@/lib/shared/clubhouse";

export function Room({
  view,
  onSelect,
  unread = 0,
  boardWaiting = false,
}: {
  view: CameraView;
  onSelect: (id: DestinationId) => void;
  unread?: number;
  boardWaiting?: boolean;
}) {
  const framing = framingFor(view);
  const [sparkle, setSparkle] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  function playSpark(id: string) {
    setSparkle(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSparkle(null), 1300);
  }

  // Camera: zoom toward the destination's focal point (fraction of the image).
  const frameStyle = {
    transformOrigin: `${framing.cx * 100}% ${framing.cy * 100}%`,
    transform: `scale(${framing.zoom}) translate(${(0.5 - framing.cx) * 100}%, ${(0.5 - framing.cy) * 100}%)`,
  } as React.CSSProperties;

  return (
    <div className={`room-stage room-view-${view}`}>
      <div className="room-scene">
        <div className="room-frame" style={frameStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed room art must not be re-cropped by the image optimizer. */}
          <img
            className="room-photo"
            src="/images/clubhouse-interior.png"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            draggable={false}
          />
          {/* Destination hotspots — transparent, aligned to the artwork */}
          {DESTINATIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`room-hotspot hotspot-${d.id} ${
                d.id === "messages" && unread > 0 ? "is-waiting" : ""
              } ${d.id === "board" && boardWaiting ? "is-waiting" : ""}`}
              style={{
                left: `${d.hotspot.x * 100}%`,
                top: `${d.hotspot.y * 100}%`,
                width: `${d.hotspot.w * 100}%`,
                height: `${d.hotspot.h * 100}%`,
              }}
              aria-label={`${d.label} — ${d.affordance}`}
              onClick={() => onSelect(d.id)}
            >
              <span className="hotspot-tag" aria-hidden="true">
                {d.label}
              </span>
            </button>
          ))}
          {/* Ambient discovery — pure delight, no tracking */}
          {AMBIENT_SPOTS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`room-ambient ambient-${a.effect} ${
                sparkle === a.id ? "is-sparkling" : ""
              }`}
              style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
              aria-label={`Look at ${a.label}`}
              tabIndex={-1}
              onClick={() => playSpark(a.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
