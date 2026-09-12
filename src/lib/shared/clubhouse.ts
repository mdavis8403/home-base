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
  /** Generous click target (0..1 of the artwork). */
  hotspot: Rect;
  /** Tight visible highlight around the actual object — kept on-screen at the
   *  supported landscape crops (separate from the larger click target). */
  highlight: Rect;
  camera: Framing;
}

/** A single clean corridor of open blue sky in the arched window — the band of
 *  uninterrupted sky above the tree line and to the LEFT of the moon (moon sits
 *  near x≈0.40, y≈0.13). Deliberately narrow so the shooting star never strays
 *  over the trees, the mountains, or the moon; the star is clipped to this box. */
export const WINDOW_SKY: Rect = { x: 0.33, y: 0.065, w: 0.062, h: 0.06 };

/** Hand-authored safe shooting-star paths in 0..100 of the WINDOW_SKY overlay.
 *  Both are short diagonals confined to the clean upper-left sky: they stay
 *  above the pine tops (overlay y ≲ 55%) and well left of the moon, which lies
 *  off the right edge of this corridor. */
export const STAR_PATHS: readonly { sx: number; sy: number; ex: number; ey: number }[] = [
  { sx: 12, sy: 24, ex: 66, ey: 58 },
  { sx: 22, sy: 14, ex: 74, ey: 46 },
];

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
    hotspot: { x: 0.015, y: 0.33, w: 0.25, h: 0.52 },
    highlight: { x: 0.045, y: 0.41, w: 0.14, h: 0.26 },
    camera: { cx: 0.14, cy: 0.55, zoom: 1.9 },
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
    hotspot: { x: 0.505, y: 0.14, w: 0.18, h: 0.47 },
    highlight: { x: 0.519, y: 0.171, w: 0.165, h: 0.272 },
    camera: { cx: 0.60, cy: 0.37, zoom: 2.0 },
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
    hotspot: { x: 0.705, y: 0.19, w: 0.15, h: 0.63 },
    highlight: { x: 0.744, y: 0.155, w: 0.09, h: 0.3 },
    camera: { cx: 0.785, cy: 0.5, zoom: 1.95 },
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
    hotspot: { x: 0.8, y: 0.5, w: 0.2, h: 0.48 },
    highlight: { x: 0.851, y: 0.71, w: 0.084, h: 0.08 },
    camera: { cx: 0.9, cy: 0.72, zoom: 1.9 },
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
  { id: "moon", x: 0.405, y: 0.11, label: "the evening moon", effect: "moon" },
  { id: "lamp", x: 0.135, y: 0.4, label: "the desk lamp", effect: "lamp" },
  { id: "dog", x: 0.57, y: 0.59, label: "the little dog bed", effect: "pillow" },
] as const;
