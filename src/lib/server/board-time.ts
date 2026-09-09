import "server-only";
import { Temporal } from "@js-temporal/polyfill";
export function familyDate(timezone: string, instant = new Date()) {
  return Temporal.Instant.from(instant.toISOString())
    .toZonedDateTimeISO(timezone)
    .toPlainDate()
    .toString();
}
export function revealInstant(date: string, time: string, timezone: string) {
  // Match the existing later occurrence on autumn overlap, forward on spring gap.
  return Temporal.PlainDateTime.from(`${date}T${time}`)
    .toZonedDateTime(timezone, { disambiguation: "later" })
    .toInstant()
    .toString({ fractionalSecondDigits: 3 });
}
