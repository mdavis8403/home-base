"use client";
// The clubhouse world: the approved painterly interior (public/images/
// clubhouse-interior.png, 1672×941) as the primary room. Each destination has a
// generous transparent click target with a TIGHT visible highlight (muted-brass
// outline + soft warm glow + tooltip) that hugs the real object. A point-and-
// click "camera" (CSS transform on the camera frame) glides toward the chosen
// place. The moon is an ambient easter egg: clicking it sends one subtle
// shooting star across the window sky (clipped to the window, honoring reduced
// motion). Alignment is aspect-locked: the image lives in a 16:9 cover box and
// all coordinates are fractions of that box, so they track the artwork.
import { useEffect, useRef, useState } from "react";
import {
  DESTINATIONS,
  AMBIENT_SPOTS,
  WINDOW_SKY,
  STAR_PATHS,
  framingFor,
  type CameraView,
  type DestinationId,
} from "@/lib/shared/clubhouse";

interface Star {
  id: number;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  ang: number;
  dur: number;
  reduce: boolean;
}

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
  const [star, setStar] = useState<Star | null>(null);
  const sparkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const starTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (sparkTimer.current) clearTimeout(sparkTimer.current);
      if (starTimer.current) clearTimeout(starTimer.current);
    },
    [],
  );

  function playSpark(id: string) {
    setSparkle(id);
    if (sparkTimer.current) clearTimeout(sparkTimer.current);
    sparkTimer.current = setTimeout(() => setSparkle(null), 1300);
  }

  function fireStar() {
    if (star) return; // one at a time — ignore clicks during an active streak
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const p = STAR_PATHS[Math.floor(Math.random() * STAR_PATHS.length)];
    const ang = (Math.atan2(p.ey - p.sy, p.ex - p.sx) * 180) / Math.PI;
    const dur = 950;
    setStar({ id: Date.now(), ...p, ang, dur, reduce });
    if (starTimer.current) clearTimeout(starTimer.current);
    starTimer.current = setTimeout(
      () => setStar(null),
      reduce ? 320 : dur + 60,
    );
  }

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
          {/* Destination hotspots — generous click target, tight visible highlight */}
          {DESTINATIONS.map((d) => {
            const ringStyle = {
              left: `${((d.highlight.x - d.hotspot.x) / d.hotspot.w) * 100}%`,
              top: `${((d.highlight.y - d.hotspot.y) / d.hotspot.h) * 100}%`,
              width: `${(d.highlight.w / d.hotspot.w) * 100}%`,
              height: `${(d.highlight.h / d.hotspot.h) * 100}%`,
            } as React.CSSProperties;
            const waiting =
              (d.id === "messages" && unread > 0) ||
              (d.id === "board" && boardWaiting);
            return (
              <button
                key={d.id}
                type="button"
                className={`room-hotspot hotspot-${d.id} ${waiting ? "is-waiting" : ""}`}
                style={{
                  left: `${d.hotspot.x * 100}%`,
                  top: `${d.hotspot.y * 100}%`,
                  width: `${d.hotspot.w * 100}%`,
                  height: `${d.hotspot.h * 100}%`,
                }}
                aria-label={`${d.label} — ${d.affordance}`}
                onClick={() => onSelect(d.id)}
              >
                <span className="hotspot-ring" style={ringStyle} aria-hidden="true">
                  <span className="hotspot-tag">{d.label}</span>
                </span>
              </button>
            );
          })}
          {/* Ambient discovery — pure delight, no tracking */}
          {AMBIENT_SPOTS.map((a) =>
            a.effect === "moon" ? (
              <button
                key={a.id}
                type="button"
                className="room-ambient ambient-moon"
                style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
                aria-label="Make a shooting star"
                onClick={fireStar}
              />
            ) : (
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
            ),
          )}
          {/* Shooting-star overlay — clipped to the window sky, no pointer events */}
          <div
            className="sky-overlay"
            aria-hidden="true"
            style={{
              left: `${WINDOW_SKY.x * 100}%`,
              top: `${WINDOW_SKY.y * 100}%`,
              width: `${WINDOW_SKY.w * 100}%`,
              height: `${WINDOW_SKY.h * 100}%`,
            }}
          >
            {star && !star.reduce && (
              <div
                key={star.id}
                className="star-mover"
                style={
                  {
                    "--sx": `${star.sx}%`,
                    "--sy": `${star.sy}%`,
                    "--ex": `${star.ex}%`,
                    "--ey": `${star.ey}%`,
                    "--dur": `${star.dur}ms`,
                  } as React.CSSProperties
                }
              >
                <span
                  className="star-streak"
                  style={{ "--ang": `${star.ang}deg` } as React.CSSProperties}
                />
              </div>
            )}
            {star && star.reduce && (
              <span
                key={star.id}
                className="star-twinkle"
                style={{ left: `${star.sx}%`, top: `${star.sy}%` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
