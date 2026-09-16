import "server-only";
import { Temporal } from "@js-temporal/polyfill";
export function familyDate(timezone: string, instant = new Date()) {
  return Temporal.Instant.from(instant.toISOString())
    .toZonedDateTimeISO(timezone)
    .toPlainDate()
    .toString();
}
// Deterministic activity cadence: four Question days, then one Photo day, so the
// board averages ~80% questions / ~20% photos without randomness or streaks.
export function boardActivityForDate(date: string): "question" | "photo" {
  const days = Math.floor(
    Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) /
      86_400_000,
  );
  return days % 5 === 4 ? "photo" : "question";
}
export function revealInstant(date: string, time: string, timezone: string) {
  // Match the existing later occurrence on autumn overlap, forward on spring gap.
  return Temporal.PlainDateTime.from(`${date}T${time}`)
    .toZonedDateTime(timezone, { disambiguation: "later" })
    .toInstant()
    .toString({ fractionalSecondDigits: 3 });
}
