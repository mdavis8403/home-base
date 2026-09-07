"use client";
import { useRef, useState, type PointerEvent } from "react";
type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string; width: number };
const palette = ["#192f3a", "#ad483b", "#397457", "#855ca2", "#b07718"];
export function Doodle({ onSave }: { onSave: (blob: Blob) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef(false);
  const [color, setColor] = useState(palette[0]);
  const [width, setWidth] = useState(6);
  const [eraser, setEraser] = useState(false);
  const [count, setCount] = useState(0);
  function render() {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff9ed";
    ctx.fillRect(0, 0, c.width, c.height);
    for (const stroke of strokes.current) {
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      stroke.points.forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      ctx.stroke();
      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        ctx.beginPath();
        ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  function point(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * 800) / rect.width,
      y: ((e.clientY - rect.top) * 500) / rect.height,
    };
  }
  return (
    <section className="doodle-box" aria-label="Drawing tools">
      <div className="message-controls">
        <button
          type="button"
          className="secondary-button"
          aria-pressed={!eraser}
          onClick={() => setEraser(false)}
        >
          Pen
        </button>
        <button
          type="button"
          className="secondary-button"
          aria-pressed={eraser}
          onClick={() => setEraser(true)}
        >
          Eraser
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!count}
          onClick={() => {
            strokes.current.pop();
            setCount(strokes.current.length);
            render();
          }}
        >
          Undo
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!count}
          onClick={() => {
            strokes.current = [];
            setCount(0);
            render();
          }}
        >
          Clear
        </button>
      </div>
      <div className="message-controls">
        {palette.map((c, i) => (
          <button
            type="button"
            key={c}
            className="color-choice"
            style={{ background: c }}
            aria-label={
              ["Navy pen", "Coral pen", "Green pen", "Purple pen", "Gold pen"][
                i
              ]
            }
            aria-pressed={color === c && !eraser}
            onClick={() => {
              setColor(c);
              setEraser(false);
            }}
          >
            {color === c && !eraser ? "✓" : ""}
          </button>
        ))}
        <label>
          Line thickness{" "}
          <input
            aria-label="Line thickness"
            type="range"
            min="2"
            max="28"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>
      </div>
      <canvas
        ref={canvas}
        width={800}
        height={500}
        aria-label="Draw here with your finger or pen"
        onPointerDown={(e) => {
          if (drawing.current) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          strokes.current.push({
            points: [point(e)],
            color: eraser ? "#fff9ed" : color,
            width: eraser ? width * 3 : width,
          });
          setCount(strokes.current.length);
          render();
        }}
        onPointerMove={(e) => {
          if (drawing.current) {
            strokes.current.at(-1)!.points.push(point(e));
            render();
          }
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      <p className="muted">
        Draw with a finger, stylus, or mouse. A written note or photo works too.
      </p>
      <button
        type="button"
        className="button"
        disabled={!count}
        onClick={() =>
          canvas.current?.toBlob((blob) => {
            if (blob) onSave(blob);
          }, "image/png")
        }
      >
        Use this drawing
      </button>
    </section>
  );
}
