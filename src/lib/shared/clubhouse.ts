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
  /** Named group in the Spline scene (for emitEvent / hit-testing). */
  splineObject: string;
  /** Named Spline camera for its close-up state. */
  splineCamera: string;
  /** Fallback room hit target + camera framing. */
  hotspot: Rect;
  camera: Framing;
}

export const HOME_FRAMING: Framing = { cx: 0.5, cy: 0.5, zoom: 1 };
export const HOME_CAMERA = "Cam Home";

export const DESTINATIONS: readonly Destination[] = [
  {
    id: "messages",
    href: "/messages",
    label: "The writing desk",
    affordance: "Leave a little something",
    event: "messagesSelected",
    mode: "overlay",
    splineObject: "Messages Nook",
    splineCamera: "Cam Messages",
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
    splineObject: "Family Board",
    splineCamera: "Cam Board",
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
    splineObject: "Mystery Study",
    splineCamera: "Cam Mystery",
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
    splineObject: "Our Story",
    splineCamera: "Cam Story",
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
