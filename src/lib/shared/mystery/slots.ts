// The Mystery Club bookshelf slot system.
//
// The bookshelf artwork (public/images/mystery-bookshelf-bg.png, 1672×941) is a
// permanent, scalable library. Mystery titles are overlaid dynamically on
// selected book spines via HTML/CSS — nothing is baked into the image. Slots are
// percentage-based so the overlay stays responsive, numbered left-to-right then
// top-to-bottom (shelf-major), and chosen to sit on clear upright spines away
// from the plants/decorations. Mysteries are assigned to slots by index, so
// dozens more can be added later without touching the artwork.

export interface BookSlot {
  /** Slot index (0-based), numbered left-to-right, top-to-bottom. */
  index: number;
  /** Spine rectangle in 0..1 fractions of the image. */
  x: number;
  y: number;
  w: number;
  h: number;
}

// Per-shelf bands (fractions), with x-ranges that avoid the ivy/plants at the
// shelf ends. Counts keep each spine a comfortable, readable width.
const SHELVES: { y: number; h: number; x0: number; x1: number; count: number }[] = [
  { y: 0.045, h: 0.155, x0: 0.125, x1: 0.845, count: 9 }, // plants both ends
  { y: 0.258, h: 0.152, x0: 0.055, x1: 0.965, count: 11 },
  { y: 0.452, h: 0.152, x0: 0.155, x1: 0.965, count: 9 }, // plant left
  { y: 0.642, h: 0.152, x0: 0.055, x1: 0.845, count: 9 }, // plant + stack right
  { y: 0.835, h: 0.148, x0: 0.045, x1: 0.965, count: 11 },
];

const GAP = 0.006;

export const BOOK_SLOTS: readonly BookSlot[] = (() => {
  const slots: BookSlot[] = [];
  let index = 0;
  for (const s of SHELVES) {
    const step = (s.x1 - s.x0) / s.count;
    for (let c = 0; c < s.count; c++) {
      slots.push({
        index: index++,
        x: s.x0 + c * step + GAP / 2,
        y: s.y,
        w: step - GAP,
        h: s.h,
      });
    }
  }
  return slots;
})();

export const BOOK_SLOT_COUNT = BOOK_SLOTS.length;
