"use client";
// The fallback clubhouse world: a clean, art-directed SVG room derived from the
// Home Base design system (teal wainscot, cream plaster, walnut, brass, a
// moonlit window). It is the reliable base layer — the Spline scene enhances it
// when published. Navigation is by tapping meaningful places, with a camera
// (CSS transform) that glides toward the chosen destination.
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
  const sceneStyle = {
    "--focus-x": `${framing.cx * 100}%`,
    "--focus-y": `${framing.cy * 100}%`,
    "--zoom": framing.zoom,
    transform: `scale(var(--zoom)) translate(${(0.5 - framing.cx) * 100}%, ${(0.5 - framing.cy) * 100}%)`,
    transformOrigin: `var(--focus-x) var(--focus-y)`,
  } as React.CSSProperties;

  return (
    <div className={`room-stage room-view-${view}`}>
      <div className="room-scene" style={sceneStyle}>
        <RoomArt unread={unread} boardWaiting={boardWaiting} sparkle={sparkle} />
        {/* Destination hotspots — environmental affordances, labels on hover/focus */}
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
  );
}

/** The room artwork — one layered SVG, 1600×900, matched to the Spline scene. */
function RoomArt({
  unread,
  boardWaiting,
  sparkle,
}: {
  unread: number;
  boardWaiting: boolean;
  sparkle: string | null;
}) {
  return (
    <svg
      className="room-art"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rmWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe6d1" />
          <stop offset="1" stopColor="#e4d8bd" />
        </linearGradient>
        <linearGradient id="rmTeal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#295751" />
          <stop offset="1" stopColor="#1f4741" />
        </linearGradient>
        <linearGradient id="rmFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f2f22" />
          <stop offset="1" stopColor="#2b2018" />
        </linearGradient>
        <radialGradient id="rmMoonGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#bcd2f2" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#4d6ea3" stopOpacity="0.45" />
          <stop offset="1" stopColor="#1b2f4d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rmNight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#20386090" />
          <stop offset="1" stopColor="#16284680" />
        </linearGradient>
        <radialGradient id="rmLamp" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#ffd98f" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#e0a85a" stopOpacity="0.25" />
          <stop offset="1" stopColor="#e0a85a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rmVignette" cx="0.5" cy="0.52" r="0.72">
          <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#05100f" stopOpacity="0.55" />
        </radialGradient>
      </defs>

      {/* Architecture: ceiling, walls, wainscot, floor */}
      <rect x="0" y="0" width="1600" height="150" fill="#132630" />
      <rect x="0" y="150" width="1600" height="330" fill="url(#rmWall)" />
      <rect x="0" y="470" width="1600" height="150" fill="url(#rmTeal)" />
      <rect x="0" y="462" width="1600" height="10" fill="#5a4130" />
      <polygon points="0,620 1600,620 1600,900 0,900" fill="url(#rmFloor)" />
      {/* Beams */}
      <rect x="0" y="150" width="1600" height="16" fill="#3c2c20" opacity="0.8" />
      <rect x="360" y="150" width="26" height="150" fill="#3c2c20" opacity="0.55" />
      <rect x="1180" y="150" width="26" height="150" fill="#3c2c20" opacity="0.55" />

      {/* Rug */}
      <ellipse cx="800" cy="795" rx="470" ry="96" fill="#2f4a45" />
      <ellipse cx="800" cy="792" rx="410" ry="78" fill="#6f7f66" opacity="0.9" />
      <ellipse cx="800" cy="790" rx="250" ry="44" fill="#c98f74" opacity="0.35" />

      {/* ---- Central arched moonlit window (focal) ---- */}
      <g>
        <rect x="640" y="470" width="70" height="12" fill="#3c2c20" opacity="0.4" />
        <path
          d="M672 470 v-150 a128 128 0 0 1 256 0 v150 Z"
          fill="url(#rmNight)"
          stroke="#4a3728"
          strokeWidth="14"
        />
        <circle cx="880" cy="300" r="150" fill="url(#rmMoonGlow)" />
        <circle
          cx="866"
          cy="286"
          r="26"
          fill="#eaeef5"
          className={sparkle === "moon" ? "rm-moon is-spark" : "rm-moon"}
        />
        <line x1="800" y1="200" x2="800" y2="470" stroke="#4a3728" strokeWidth="9" />
        <line x1="672" y1="330" x2="928" y2="330" stroke="#4a3728" strokeWidth="7" />
        {/* Window seat + coral pillow */}
        <rect x="656" y="470" width="288" height="70" rx="10" fill="#4a3728" />
        <rect x="666" y="452" width="268" height="26" rx="12" fill="#e7dcc4" />
        <rect
          x="856"
          y="430"
          width="58"
          height="44"
          rx="14"
          fill="#d98e77"
          className={sparkle === "pillow" ? "rm-pillow is-spark" : "rm-pillow"}
        />
      </g>

      {/* ---- Messages: writing desk + lamp (left) ---- */}
      <g>
        <ellipse cx="150" cy="520" rx="170" ry="150" fill="url(#rmLamp)" />
        {/* correspondence slot + indicator */}
        <rect x="150" y="520" width="150" height="10" rx="4" fill="#161b1d" />
        <rect x="150" y="512" width="150" height="4" rx="2" fill="#b08a4e" />
        <circle
          cx="150"
          cy="548"
          r="9"
          fill={unread > 0 ? "#ffd98f" : "#7a6a43"}
          className={unread > 0 ? "rm-indicator is-on" : "rm-indicator"}
        />
        {/* desk */}
        <polygon points="60,600 330,600 300,690 60,690" fill="#4a3728" />
        <polygon points="60,600 330,600 340,612 60,612" fill="#5a4432" />
        <rect x="300" y="612" width="10" height="80" fill="#3c2c20" />
        <rect x="70" y="612" width="10" height="80" fill="#3c2c20" />
        {/* stationery + tray */}
        <rect x="120" y="576" width="70" height="26" rx="3" fill="#efe7d5" />
        <rect x="210" y="580" width="70" height="20" rx="3" fill="#3c2c20" />
        {/* lamp */}
        <rect x="98" y="560" width="8" height="44" fill="#b08a4e" />
        <path d="M74 560 h56 l-12 -34 h-32 Z" fill="#f0e4c8" />
        <ellipse cx="102" cy="520" rx="14" ry="6" fill="#fff2cf" opacity="0.9" />
      </g>

      {/* ---- Family Board: framed linen display (right of window) ---- */}
      <g className={boardWaiting ? "rm-board is-waiting" : "rm-board"}>
        <rect x="1010" y="330" width="196" height="150" rx="6" fill="#4a3728" />
        <rect x="1026" y="346" width="164" height="118" rx="4" fill="#d9c9ab" />
        <rect x="1044" y="360" width="46" height="58" rx="3" fill="#f2ead9" transform="rotate(-4 1067 389)" />
        <rect x="1120" y="360" width="46" height="36" rx="3" fill="#f2ead9" transform="rotate(3 1143 378)" />
        <rect x="1092" y="410" width="40" height="42" rx="3" fill="#dd9a83" transform="rotate(-2 1112 431)" />
      </g>

      {/* ---- Mystery: recessed dark study door (right, kept in frame) ---- */}
      <g>
        <rect x="1320" y="300" width="126" height="292" fill="#14110d" />
        <rect x="1336" y="300" width="104" height="285" rx="4" fill="#2a2721" />
        <rect x="1332" y="292" width="112" height="12" fill="#4a3728" />
        <circle cx="1350" cy="452" r="7" fill="#b08a4e" />
      </g>

      {/* ---- Our Story: reading table, book, chair (front-left) ---- */}
      <g>
        <rect x="470" y="640" width="10" height="70" fill="#4a3728" />
        <ellipse cx="475" cy="640" rx="66" ry="20" fill="#5a4432" />
        <ellipse cx="475" cy="636" rx="66" ry="18" fill="#4a3728" />
        <rect x="446" y="612" width="60" height="20" rx="3" fill="#2f4a3a" transform="rotate(-8 476 622)" />
        <rect x="452" y="610" width="48" height="14" rx="2" fill="#efe6d2" transform="rotate(-8 476 617)" />
        <rect x="360" y="700" width="96" height="20" rx="6" fill="#e4d9c1" />
        <rect x="360" y="640" width="96" height="66" rx="8" fill="#e4d9c1" />
        <rect x="366" y="716" width="10" height="40" fill="#4a3728" />
        <rect x="440" y="716" width="10" height="40" fill="#4a3728" />
      </g>

      {/* Cinematic vignette */}
      <rect x="0" y="0" width="1600" height="900" fill="url(#rmVignette)" />
    </svg>
  );
}
