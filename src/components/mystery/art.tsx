"use client";
import { useRef, useState, useEffect } from "react";
import type { Clue, Illustration } from "@/lib/shared/mystery/schema";
export function CaseArt({
  motif,
}: {
  motif: "owl" | "crown" | "music" | "mountain" | "castle";
}) {
  return (
    <svg
      className={"case-cover " + motif}
      viewBox="0 0 500 280"
      role="img"
      aria-label={
        {
          owl: "An owl carrying a sealed case beneath the stars",
          crown: "A crown above a lantern-lit magical academy",
          music: "Musical notes over a moonlit camp",
          mountain: "Mountains and a glowing waterfall under the stars",
          castle: "A castle of five towers lit by warm lanterns",
        }[motif]
      }
    >
      <rect width="500" height="280" fill="#203b45" />
      <circle cx="380" cy="66" r="29" fill="#ead09b" />
      {[35, 90, 150, 235, 310, 460].map((x, i) => (
        <path
          key={x}
          d={`M ${x} ${25 + (i % 3) * 17} v 8 m -4 -4 h 8`}
          stroke="#e2c78e"
          opacity=".75"
        />
      ))}
      <path d="M0 230 Q100 145 220 210 T500 190 V280 H0Z" fill="#36534f" />
      <path d="M0 265 Q230 185 500 250 V280 H0Z" fill="#152f39" />
      {motif === "owl" ? (
        <g stroke="#dcbf84" fill="#dcbf84">
          <path
            d="M185 75 L205 102 Q250 80 295 102 L315 75 L310 166 Q250 223 190 166Z"
            fill="#c6b489"
          />
          <circle cx="226" cy="132" r="23" fill="#f5eddd" />
          <circle cx="274" cy="132" r="23" fill="#f5eddd" />
          <circle cx="226" cy="132" r="8" fill="#192f3a" />
          <circle cx="274" cy="132" r="8" fill="#192f3a" />
          <path d="M242 156 L250 165 L258 156Z" fill="#192f3a" />
          <rect x="225" y="191" width="52" height="35" fill="#f5eddd" />
          <path d="M225 191 L251 211 L277 191" fill="none" stroke="#846f4c" />
        </g>
      ) : motif === "crown" ? (
        <g>
          <path
            d="M155 115 L167 173 H334 L345 115 L291 143 L250 96 L210 143Z"
            fill="#ead09b"
          />
          <path d="M180 187 H320" stroke="#e6aa96" strokeWidth="8" />
          {[100, 160, 340, 400].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 25V${100 + (i % 2) * 90}`} stroke="#997e51" />
              <rect
                x={x - 9}
                y={100 + (i % 2) * 90}
                width="18"
                height="25"
                rx="5"
                fill="#eacb89"
              />
            </g>
          ))}
        </g>
      ) : motif === "music" ? (
        <g>
          <path
            d="M145 230 L200 153 L252 230Z M265 230 L315 167 L368 230Z"
            fill="#b5b99a"
          />
          <path
            d="M209 110V53L270 42V98"
            fill="none"
            stroke="#ead09b"
            strokeWidth="7"
          />
          <ellipse cx="198" cy="113" rx="17" ry="12" fill="#ead09b" />
          <ellipse cx="259" cy="100" rx="17" ry="12" fill="#ead09b" />
          <path d="M60 150 Q250 50 440 150" stroke="#a6b697" fill="none" />
          {[80, 150, 350, 420].map((x) => (
            <circle
              key={x}
              cx={x}
              cy={x < 200 ? 140 - (x - 80) * 0.4 : 112 + (x - 350) * 0.4}
              r="6"
              fill="#e6aa96"
            />
          ))}
        </g>
      ) : motif === "mountain" ? (
        <g>
          <path
            d="M45 225 L166 78 L285 225 M190 235 L300 100 L430 235"
            fill="#6c837a"
          />
          <path
            d="M125 128 L166 78 L207 128 L168 111Z M265 143 L300 100 L340 145 L300 130Z"
            fill="#eee3cb"
          />
          <path
            d="M245 170 Q260 190 249 230 T275 277"
            fill="none"
            stroke="#bdcfd0"
            strokeWidth="13"
          />
        </g>
      ) : (
        <g fill="#cfbd96" stroke="#cfbd96">
          <path d="M130 240V140H370V240Z" />
          {[130, 190, 250, 310, 370].map((x, i) => (
            <g key={x}>
              <path
                d={`M${x - 17} 220V${115 - (i % 2) * 25}L${x} ${83 - (i % 2) * 25}L${x + 17} ${115 - (i % 2) * 25}V220Z`}
              />
              <rect x={x - 4} y="145" width="8" height="17" fill="#223d46" />
            </g>
          ))}
          <path d="M225 240V205Q250 175 275 205V240" fill="#192f3a" />
        </g>
      )}
      <path d="M18 18H482V262H18Z" fill="none" stroke="#b5a27d" opacity=".45" />
    </svg>
  );
}
export function Diagram({
  art,
  onChoose,
  selected,
}: {
  art: Illustration;
  onChoose?: (id: string) => void;
  selected?: string;
}) {
  return (
    <figure className="mystery-diagram">
      <div className="diagram-surface">
        <svg viewBox="0 0 800 440" role="img" aria-label={art.caption}>
          <rect
            width="800"
            height="440"
            rx="16"
            fill={art.theme === "stars" ? "#203642" : "#eee2c9"}
          />
          {["map", "park", "camp"].includes(art.theme) ? (
            <>
              <path
                d="M45 390 Q170 70 400 270 T760 55"
                fill="none"
                stroke="#95aaa0"
                strokeWidth="32"
              />
              <path
                d="M60 100 Q330 395 710 90"
                fill="none"
                stroke="#ad9369"
                strokeWidth="4"
                strokeDasharray="8 9"
              />
              <text x="390" y="35" fill="#344d49" fontSize="22">
                N ↑
              </text>
            </>
          ) : (
            <path d="M40 385H760 M40 55H760" stroke="#b4a282" />
          )}
          {art.objects.map((o) => (
            <g key={o.id}>
              <circle
                cx={o.x * 8}
                cy={o.y * 4.4}
                r="29"
                fill={art.theme === "stars" ? "#ead09b" : "#d7c49b"}
              />
              <text
                x={o.x * 8}
                y={o.y * 4.4 + 9}
                textAnchor="middle"
                fontSize="30"
                fill="#203642"
              >
                {o.glyph}
              </text>
              <text
                x={o.x * 8}
                y={o.y * 4.4 + 53}
                textAnchor="middle"
                fontSize="15"
                fill={art.theme === "stars" ? "#f5eddd" : "#203642"}
              >
                {o.label}
              </text>
            </g>
          ))}
        </svg>
        {onChoose &&
          art.objects.map((o) => (
            <button
              key={o.id}
              type="button"
              className="hotspot-pin"
              aria-label={"Select " + o.label}
              aria-pressed={selected === o.id}
              style={{ left: `${o.x}%`, top: `${o.y}%` }}
              onClick={() => onChoose(o.id)}
            >
              {selected === o.id ? "✓" : "+"}
            </button>
          ))}
      </div>
      <figcaption>{art.caption}</figcaption>
    </figure>
  );
}
export function ClueCard({ clue }: { clue: Clue }) {
  return (
    <article className={"clue-card " + clue.kind}>
      <p className="note-label">
        {clue.kind === "suspect"
          ? "PERSON OF INTEREST"
          : clue.kind === "timeline"
            ? "TIME RECORD"
            : clue.kind === "audio"
              ? "LISTEN OR READ"
              : "FIELD EVIDENCE"}
      </p>
      <h3>{clue.title}</h3>
      <p className="clue-text">{clue.text}</p>
      {clue.art && <Diagram art={clue.art} />}{" "}
      {clue.tones && <AudioClue tones={clue.tones} />}
    </article>
  );
}
function AudioClue({ tones }: { tones: NonNullable<Clue["tones"]> }) {
  const [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  const ctx = useRef<AudioContext | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
      void ctx.current?.close();
    },
    [],
  );
  const stop = () => {
    if (timeout.current) clearTimeout(timeout.current);
    void ctx.current?.close();
    ctx.current = null;
    setPlaying(false);
  };
  return (
    <>
      <button
        className="secondary-button"
        type="button"
        onClick={async () => {
          if (playing) {
            stop();
            return;
          }
          try {
            const a = new AudioContext();
            ctx.current = a;
            await a.resume();
            setError("");
            setPlaying(true);
            const frequencies = {
              C4: 261.63,
              D4: 293.66,
              E4: 329.63,
              F4: 349.23,
              G4: 392,
              A4: 440,
              B4: 493.88,
              C5: 523.25,
              rest: 0,
            };
            tones.forEach((n, i) => {
              if (n === "rest") return;
              const o = a.createOscillator(),
                gain = a.createGain();
              o.frequency.value = frequencies[n];
              o.type = "sine";
              o.connect(gain);
              gain.connect(a.destination);
              const start = a.currentTime + i * 0.55;
              gain.gain.setValueAtTime(0, start);
              gain.gain.linearRampToValueAtTime(0.13, start + 0.03);
              gain.gain.linearRampToValueAtTime(0, start + 0.45);
              o.start(start);
              o.stop(start + 0.5);
            });
            timeout.current = setTimeout(stop, tones.length * 550 + 50);
          } catch {
            stop();
            setError(
              "Sound is unavailable here. The written notes have the same clue.",
            );
          }
        }}
      >
        {playing ? "Stop sound" : "Play original clue"}
      </button>
      {error && <p role="status">{error}</p>}
    </>
  );
}
