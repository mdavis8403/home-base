"use client";
// Progressive-enhancement 3D world. Renders the published Spline clubhouse when
// NEXT_PUBLIC_SPLINE_SCENE is set; otherwise the caller uses <Room>. The Spline
// runtime is loaded from CDN at runtime *only* when a scene URL exists, so it
// never touches the initial bundle or the fallback path, and no npm dependency
// is compiled in. On any failure we call onFail so the experience falls back to
// the SVG room — the app never depends on 3D.
import { useEffect, useRef } from "react";
import {
  destinationForSplineName,
  splineTriggerFor,
  type CameraView,
  type DestinationId,
} from "@/lib/shared/clubhouse";

// Vanilla runtime (no React wrapper → no React-version conflict). Pinned major.
const RUNTIME_URL = "https://esm.sh/@splinetool/runtime@1";

interface SplineApp {
  load: (url: string) => Promise<void>;
  addEventListener?: (type: string, cb: (e: { target?: { name?: string } }) => void) => void;
  emitEvent?: (type: string, name: string) => void;
  dispose?: () => void;
}

export function SplineWorld({
  scene,
  view,
  onSelect,
  onFail,
}: {
  scene: string;
  view: CameraView;
  onSelect: (id: DestinationId) => void;
  onFail: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const app = useRef<SplineApp | null>(null);

  useEffect(() => {
    let cancelled = false;
    let instance: SplineApp | null = null;
    (async () => {
      try {
        const mod = (await import(/* webpackIgnore: true */ RUNTIME_URL)) as {
          Application: new (c: HTMLCanvasElement) => SplineApp;
        };
        if (cancelled || !canvas.current) return;
        instance = new mod.Application(canvas.current);
        await instance.load(scene);
        if (cancelled) {
          instance.dispose?.();
          return;
        }
        app.current = instance;
        // Move the camera to Home once the scene is ready.
        instance.emitEvent?.("mouseDown", splineTriggerFor("home"));
        instance.addEventListener?.("mouseDown", (e) => {
          const id = destinationForSplineName(e?.target?.name);
          if (id) onSelect(id);
        });
      } catch {
        if (!cancelled) onFail();
      }
    })();
    return () => {
      cancelled = true;
      try {
        instance?.dispose?.();
      } catch {
        /* best effort */
      }
      app.current = null;
    };
  }, [scene, onSelect, onFail]);

  // Drive the camera: emit MouseDown on the view's hit mesh, whose authored
  // SwitchCamera event animates to the matching Spline camera.
  useEffect(() => {
    try {
      app.current?.emitEvent?.("mouseDown", splineTriggerFor(view));
    } catch {
      /* the scene still renders at Home if a trigger is missing */
    }
  }, [view]);

  return (
    <div className="world-3d">
      <canvas ref={canvas} />
    </div>
  );
}
