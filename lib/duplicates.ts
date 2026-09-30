// Simple rules (no AI) for spotting events that are probably already on the calendar.

import type { CalendarEvent } from "./google-calendar";
import type { EventProposal } from "./proposals";
import { eventDays } from "./week";

// "Game vs. Lincoln High!" -> "game vs lincoln high"
function normalize(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Titles "match" if they're the same, or one contains the other
// ("Practice" and "Soccer practice").
export function titlesMatch(a: string, b: string) {
  const x = normalize(a);
  const y = normalize(b);
  return x !== "" && y !== "" && (x === y || x.includes(y) || y.includes(x));
}

// An existing event on the same day with a matching title, if there is one.
// Same day + same title is flagged even at a different time, because that's
// often a time change ("practice moved to 4:30"), not a new event.
export function findSimilarEvent(p: EventProposal, existing: CalendarEvent[], timeZone: string) {
  return existing.find((e) => eventDays(e, timeZone).includes(p.date) && titlesMatch(p.title, e.summary ?? ""));
}

// True if an earlier proposal in the same list is the same event.
export function repeatsEarlier(p: EventProposal, earlier: EventProposal[]) {
  return earlier.some(
    (q) => q.date === p.date && q.allDay === p.allDay && q.startTime === p.startTime && titlesMatch(q.title, p.title),
  );
}
