// Date helpers for the week view.
//
// The trick that keeps this simple: we treat a day as a plain date string like
// "2026-09-28" (a "day key"). Plain dates have no time zone, so adding days or
// finding Monday can't go wrong because of daylight saving or server location.
// We only use the user's time zone when turning an event's exact time into a day key.

import type { CalendarEvent } from "./google-calendar";

export type DayKey = string; // "YYYY-MM-DD"

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: unknown): value is DayKey {
  return typeof value === "string" && DAY_KEY_PATTERN.test(value) && !isNaN(Date.parse(value));
}

// Today's date in the user's time zone. The "en-CA" locale formats as YYYY-MM-DD.
export function todayIn(timeZone: string): DayKey {
  return toDayKey(new Date(), timeZone);
}

export function toDayKey(instant: Date, timeZone: string): DayKey {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

// Date.UTC is only used as a calculator here: it never shifts because of time zones.
function toUtcDate(day: DayKey) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(day: DayKey, n: number): DayKey {
  const date = toUtcDate(day);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

// Weeks start on Monday so a weekend of games stays together.
export function startOfWeek(day: DayKey): DayKey {
  const weekday = toUtcDate(day).getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const daysSinceMonday = (weekday + 6) % 7;
  return addDays(day, -daysSinceMonday);
}

export function weekDays(monday: DayKey): DayKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// The exact time range to ask Google for. It's padded by half a day on each
// side so it covers the whole week in any time zone; extra events outside the
// week are dropped when we group events by day.
export function fetchRangeForWeek(monday: DayKey) {
  const hour = 60 * 60 * 1000;
  return {
    timeMin: new Date(toUtcDate(monday).getTime() - 14 * hour).toISOString(),
    timeMax: new Date(toUtcDate(addDays(monday, 7)).getTime() + 14 * hour).toISOString(),
  };
}

// Which days an event appears on. Timed events show on their start day.
// All-day events can span several days; Google's end date is exclusive.
export function eventDays(event: CalendarEvent, timeZone: string): DayKey[] {
  if (event.start.date) {
    const days: DayKey[] = [];
    const end = event.end.date ?? addDays(event.start.date, 1);
    for (let day = event.start.date; day < end; day = addDays(day, 1)) days.push(day);
    return days;
  }
  return [toDayKey(new Date(event.start.dateTime!), timeZone)];
}

// Builds { "2026-09-28": [events...], ... } for exactly the 7 days of the week.
// Events arrive sorted by start time, so each day's list stays sorted.
export function groupByDay(events: CalendarEvent[], days: DayKey[], timeZone: string) {
  const groups = new Map<DayKey, CalendarEvent[]>(days.map((day) => [day, []]));
  for (const event of events) {
    for (const day of eventDays(event, timeZone)) {
      groups.get(day)?.push(event); // days outside this week are ignored
    }
  }
  // All-day items (like assignments) go first in each day.
  for (const list of groups.values()) {
    list.sort((a, b) => Number(Boolean(b.start.date)) - Number(Boolean(a.start.date)));
  }
  return groups;
}

/* ---------- display formatting ---------- */

export function formatWeekday(day: DayKey) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(toUtcDate(day));
}

export function formatDayNumber(day: DayKey) {
  return String(toUtcDate(day).getUTCDate());
}

// "Sep 28 – Oct 4, 2026"
export function formatWeekRange(monday: DayKey) {
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const sunday = addDays(monday, 6);
  return `${fmt.format(toUtcDate(monday))} – ${fmt.format(toUtcDate(sunday))}, ${sunday.slice(0, 4)}`;
}

// "3:30 – 5:30 PM", "11 AM – 1 PM", or "All day"
export function formatEventTime(event: CalendarEvent, timeZone: string) {
  if (event.start.date) return "All day";
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" })
      .format(new Date(iso))
      .replace(":00", ""); // "3:00 PM" -> "3 PM"
  const start = fmt(event.start.dateTime!);
  const end = fmt(event.end.dateTime!);
  // Drop the first "PM" when both times share it: "3:30 – 5:30 PM".
  const period = / ?[AP]M$/;
  const samePeriod = start.match(period)?.[0].trim() === end.match(period)?.[0].trim();
  return `${samePeriod ? start.replace(period, "") : start} – ${end}`;
}
