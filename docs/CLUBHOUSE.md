# The Clubhouse

Home Base is no longer a dashboard. After the magic word and choosing Mom, Dad
or Mia, the family arrives **inside** an enchanted cottage room and navigates by
tapping meaningful places. This is the vertical slice: entry → clubhouse →
Messages → back.

## Layers

- **World** — the 3D place. A real Spline scene (progressive enhancement) or the
  design-system **Room** fallback. Never an AI-generated room image.
- **Interaction** — `ClubhouseExperience` owns the camera view, browser history,
  the in-world chrome, and whether a place opens an overlay (Messages) or glides
  the camera and hands off to an existing route (Board, Mystery, Story).
- **Application** — the existing Messages / Board / Mystery features, unchanged.
- **Overlay** — the redesigned 2D interfaces (the Messages folio) on the warm
  paper surface.

The single contract binding these is [`src/lib/shared/clubhouse.ts`](../src/lib/shared/clubhouse.ts).
Nothing else depends on scene internals.

## Art direction

Modern enchanted cottage, restrained. Early-evening interior: cool twilight
outside, warm safe light inside. Palette — deep teal, midnight navy, warm cream,
forest green, walnut, muted brass, soft coral, restrained amber. Magic comes
from light, material, depth and interaction, not from props. Destinations are
architectural, not theme-park objects:

| Place | In the room | Opens |
| --- | --- | --- |
| The writing desk | Built-in desk, letter tray, correspondence slot, brass "waiting" indicator | Messages (in-world folio) |
| The family wall | Framed linen display | `/family-board` |
| The secret study | Recessed dark study door | `/mystery-club` |
| The storybook | Reading nook: pedestal table + book + chair | `/our-story` |
| (focal) | Arched moonlit window + window seat | — |

## The Spline scene

Authored in Spline (real 3D scene graph, not a textured plane). Groups:
`Shell`, `Window Nook`, `Messages Nook`, `Family Board`, `Mystery Study`,
`Our Story`. Five posed cameras: `Cam Home`, `Cam Messages`, `Cam Board`,
`Cam Mystery`, `Cam Story`. Restrained lighting (one warm practical lamp, cool
moonlight fill, AO); ~66 objects.

### Going live (one manual step)

The scene renders the moment a published URL is provided; until then the app
uses the Room fallback (which is a complete, intentional experience).

1. In Spline, open the Home Base scene and **Publish** it (or export a
   `scene.splinecode`).
2. Set the public runtime URL as an env var and redeploy:
   `NEXT_PUBLIC_SPLINE_SCENE="https://prod.spline.design/<id>/scene.splinecode"`
   (add it in the Cloudflare Worker settings / `wrangler.jsonc` `vars`).
3. `SplineWorld` lazy-loads the Spline runtime from CDN **only when this URL is
   set**, so it never touches the initial payload or the fallback path. On any
   load failure it falls back to the Room automatically.

### React ↔ Spline contract

- React → world: applying a `CameraView` triggers the destination's named camera
  (`splineCamera`) via `emitEvent`. To enable the camera glides in 3D, add a
  `SwitchCamera` event on each destination object in Spline named to match
  `splineObject` (e.g. "Messages Nook") that switches to its `splineCamera`.
- world → React: a click on a destination object (matched by `splineObject`
  name) emits `select(<id>)`, which opens the overlay or routes.

## The fallback Room

A clean, art-directed SVG room ([`room.tsx`](../src/components/clubhouse/room.tsx))
derived from the design system — the reliable base layer, and the required
graceful fallback. It carries the same composition, hotspots with hover/focus
affordances, ambient discovery (moon, lamp, cushion), content-state hints
(unread → the desk's brass indicator glows and the wayfinding badge appears),
and CSS camera glides toward each place.

## Accessibility & motion

- Every place is reachable without pixel-precise clicking: the "ways" pill is a
  keyboard-operable `<nav>` of the destinations, and a `<noscript>` link list is
  present.
- Focus is trapped and restored around the Messages folio; Escape closes it.
- `prefers-reduced-motion` removes camera glides, the arrival bloom, and folio
  animation; functional transitions remain.
- No global presence: the room reflects content waiting for the current user
  only (unread), never who is online or when anyone was last here.

## Responsive

- **iPad landscape (hero):** the full room with all four places in frame.
- **Laptop:** same composition, wider.
- **Phone:** the room becomes an atmospheric backdrop tightly framed on the
  window; the wayfinding pill leads; overlays are near full-screen.

## Bespoke asset manifest (generate separately — never inline)

The clubhouse currently needs **no** raster assets (the room is vector and the
Spline scene is authored geometry). Future bespoke art, when wanted, should be
produced by Matt and dropped in `public/images/`:

| Asset | Purpose | Spec |
| --- | --- | --- |
| `clubhouse-poster.jpg` | Optional loading/still frame shown before the 3D scene streams in | 1600×900, painterly, matches the exterior; < 250 KB |
| Framed family illustration | A picture on the family wall | ~600×420 PNG, transparent optional |
| Storybook cover | The book in the reading nook (Our Story phase) | ~512×640 PNG |

## Next visual phases

- **Family Board** → open `Cam Board`; present today's prompt / photo / drawing
  as pinned cards on the linen wall that flip/reveal in place; sealed cards
  before reveal.
- **Mystery Club** → move *through* the study door: a darker, mysterious
  sub-room (bookcase, brass mechanism, maps) for lobby + puzzle play.
- **Our Story** → the reading nook opens the enchanted storybook as a 2D
  spread-turning interface.
