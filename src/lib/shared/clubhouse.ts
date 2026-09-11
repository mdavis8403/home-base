// The Clubhouse integration contract — the single source of truth binding the
// immersive world to the application. Nothing else in the app depends on scene
// internals: the Spline object/event/camera names live here, and so does the
// fallback room's hotspot/camera geometry. Swapping or re-authoring the Spline
// scene only touches this file.
//
// Two layers render the same world through this contract:
//   • SplineWorld   — the real 3D scene (progressive enhancement) loaded from
//                     NEXT_PUBLIC_SPLINE_SCENE; emits `event`, receives cameras.
//   • Room          — a clean, design-system-derived SVG room (always works);
//                     uses `hotspot` + `camera` in 0..1 of its 1600×900 stage.
//
// React → world:  goToHome() / goTo(<id>)  ⇒ apply CameraView.
// world → React:  a destination emits `select(<id>)` ("messagesSelected", …).

export type DestinationId = "messages" | "board" | "mystery" | "story";
export type CameraView = "home" | DestinationId;

/** Rectangle in 0..1 of the room stage (1600×900), origin top-left. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fallback camera framing: focal point (0..1) + zoom over the stage. */
export interface Framing {
  cx: number;
  cy: number;
  zoom: number;
}

export interface Destination {
  id: DestinationId;
  /** Existing app route — deep-linkable and the accessible fallback link. */
  href: string;
  label: string;
  /** In-world affordance line shown on hover/focus (no permanent labels). */
  affordance: string;
  /** Conceptual world event this destination emits when chosen. */
  event: `${DestinationId}Selected`;
  /** Whether it opens a redesigned in-world overlay (Messages) or navigates
   *  to the existing feature route for now. */
  mode: "overlay" | "route";
  /** Named invisible hit mesh in the Spline scene whose MouseDown runs a
   *  SwitchCamera to this destination's camera. React drives the camera by
   *  emitEvent('mouseDown', splineObject); real clicks on it fire the same. */
  splineObject: string;
  /** Named Spline camera for its close-up state. */
  splineCamera: string;
  /** Name prefixes of the visible meshes that make up this place, so a real
   *  runtime click on any of them still resolves to this destination. */
  splinePrefixes: string[];
  /** Fallback room hit target + camera framing. */
  hotspot: Rect;
  camera: Framing;
}

export const HOME_FRAMING: Framing = { cx: 0.5, cy: 0.5, zoom: 1 };
export const HOME_CAMERA = "Cam Home";
/** Invisible Spline mesh whose MouseDown switches back to Cam Home. */
export const SPLINE_HOME_TRIGGER = "Home Trigger";

/** Resolve a clicked Spline mesh name (hit box or a visible child) to a
 *  destination — so real 3D clicks work however the ray lands. */
export function destinationForSplineName(name: string | undefined): DestinationId | null {
  if (!name) return null;
  const hit = DESTINATIONS.find((d) =>
    d.splinePrefixes.some((p) => name === p || name.startsWith(p)),
  );
  return hit ? hit.id : null;
}

/** The Spline mesh React should emit MouseDown on to move the camera to a view. */
export function splineTriggerFor(view: CameraView): string {
  const d = destinationById(view);
  return d ? d.splineObject : SPLINE_HOME_TRIGGER;
}

export const DESTINATIONS: readonly Destination[] = [
  {
    id: "messages",
    href: "/messages",
    label: "The writing desk",
    affordance: "Leave a little something",
    event: "messagesSelected",
    mode: "overlay",
    splineObject: "Hit Messages",
    splineCamera: "Cam Messages",
    splinePrefixes: ["Hit Messages", "Desk", "Lamp", "Slot", "Message Indicator", "Stationery", "Letter Tray"],
    hotspot: { x: 0.03, y: 0.5, w: 0.22, h: 0.38 },
    camera: { cx: 0.16, cy: 0.62, zoom: 1.85 },
  },
  {
    id: "board",
    href: "/family-board",
    label: "The family wall",
    affordance: "See what today holds",
    event: "boardSelected",
    mode: "route",
    splineObject: "Hit Board",
    splineCamera: "Cam Board",
    splinePrefixes: ["Hit Board", "Board"],
    hotspot: { x: 0.62, y: 0.34, w: 0.19, h: 0.26 },
    camera: { cx: 0.71, cy: 0.44, zoom: 1.8 },
  },
  {
    id: "mystery",
    href: "/mystery-club",
    label: "The secret study",
    affordance: "Something is hidden back there",
    event: "mysterySelected",
    mode: "route",
    splineObject: "Hit Mystery",
    splineCamera: "Cam Mystery",
    splinePrefixes: ["Hit Mystery", "Mystery"],
    hotspot: { x: 0.82, y: 0.33, w: 0.11, h: 0.5 },
    camera: { cx: 0.86, cy: 0.5, zoom: 1.9 },
  },
  {
    id: "story",
    href: "/our-story",
    label: "The storybook",
    affordance: "A tale only we could tell",
    event: "storySelected",
    mode: "route",
    splineObject: "Hit Story",
    splineCamera: "Cam Story",
    splinePrefixes: ["Hit Story", "Story", "Chair"],
    hotspot: { x: 0.28, y: 0.62, w: 0.16, h: 0.28 },
    camera: { cx: 0.34, cy: 0.72, zoom: 1.75 },
  },
] as const;

export function destinationById(id: string | null | undefined): Destination | null {
  return DESTINATIONS.find((d) => d.id === id) ?? null;
}

export function framingFor(view: CameraView): Framing {
  return destinationById(view)?.camera ?? HOME_FRAMING;
}

export function splineCameraFor(view: CameraView): string {
  return destinationById(view)?.splineCamera ?? HOME_CAMERA;
}

/** Map an existing route back to a camera view (deep-link support). */
export function viewForPath(path: string): CameraView {
  const d = DESTINATIONS.find((x) => x.href === path);
  return d ? d.id : "home";
}

/** Ambient, non-functional discovery spots ("Mia layer"): pure delight, no
 *  scoring, tracking, or required interaction. Positions in 0..1 of the stage. */
export interface AmbientSpot {
  id: string;
  x: number;
  y: number;
  label: string;
  effect: "moon" | "lamp" | "book" | "pillow";
}

export const AMBIENT_SPOTS: readonly AmbientSpot[] = [
  { id: "moon", x: 0.47, y: 0.3, label: "the evening moon", effect: "moon" },
  { id: "lamp", x: 0.13, y: 0.52, label: "the desk lamp", effect: "lamp" },
  { id: "pillow", x: 0.55, y: 0.56, label: "a soft cushion", effect: "pillow" },
] as const;
