// An "event proposal" is what the AI suggests adding. It's shown as a
// confirmation card, and only becomes a real calendar event after the user taps
// Confirm. This file has no secrets and no server code, so both the chat panel
// (browser) and the server can use it.

import type { CalendarEvent, EventTime } from "./google-calendar";
import type { Tag } from "./tags";
import { addDays, formatMonthDay, formatWeekday, isDayKey, type DayKey } from "./week";

// What the card asks the user to approve.
//   create  - add a brand new event
//   update  - change an event that already exists
//   cancel  - mark an existing event cancelled (we never delete it)
export type ProposalAction = "create" | "update" | "cancel";

// How an existing event looks right now, so a card can show "before -> after".
export type EventSnapshot = {
  title: string;
  date: DayKey;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
};

export type EventProposal = {
  id: string;
  action: ProposalAction;
  // For update and cancel: which Google event this changes.
  eventId?: string;
  before?: EventSnapshot;
  calendarId: string;
  calendarName: string;
  tag: Tag;
  title: string;
  date: DayKey;
  allDay: boolean;
  startTime: string; // "16:30" (24-hour, user's local time). "" for all-day events.
  endTime: string; // "18:30". If it's earlier than startTime, the event ends the next day.
  endTimeDefaulted: boolean; // true when the message had no end time and we used 2 hours
  location: string;
  notes: string;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTime(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

// "16:30" + 2 hours -> "18:30". Wraps past midnight ("23:00" + 2 -> "01:00").
export function addHours(time: string, hours: number) {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + hours * 60) % (24 * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

// "16:30" -> "4:30 PM", "18:00" -> "6 PM"
export function formatClock(time: string) {
  const [h, m] = time.split(":").map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minutes = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${hour12}${minutes} ${h < 12 ? "AM" : "PM"}`;
}

// "Wed, Sep 30 · 4:30 PM – 6:30 PM"
export function describeWhen(p: EventProposal | EventSnapshot) {
  const day = `${formatWeekday(p.date)}, ${formatMonthDay(p.date)}`;
  if (p.allDay) return `${day} · All day`;
  return `${day} · ${formatClock(p.startTime)} – ${formatClock(p.endTime)}`;
}

// The prefix that marks an event cancelled. CLAUDE.md says cancelled events stay
// on the calendar rather than being deleted, so we rename instead of removing.
export const CANCELLED_PREFIX = "Cancelled: ";

export function isCancelledTitle(title: string | undefined) {
  return (title ?? "").startsWith(CANCELLED_PREFIX);
}

export function cancelledTitle(title: string) {
  return isCancelledTitle(title) ? title : CANCELLED_PREFIX + title;
}

// Turns a real calendar event into the "before" picture shown on a card.
export function snapshotOf(event: CalendarEvent, timeZone: string): EventSnapshot {
  const localParts = (iso: string) => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
    const time = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
    return { date, time };
  };
  if (event.start.date) {
    return { title: event.summary ?? "", date: event.start.date, allDay: true, startTime: "", endTime: "", location: event.location ?? "" };
  }
  const start = localParts(event.start.dateTime!);
  const end = localParts(event.end.dateTime!);
  return {
    title: event.summary ?? "",
    date: start.date,
    allDay: false,
    startTime: start.time,
    endTime: end.time,
    location: event.location ?? "",
  };
}

// A short description of what an update changes, e.g. "time, location".
export function changedFields(p: EventProposal): string[] {
  if (!p.before) return [];
  const changed: string[] = [];
  if (p.before.title !== p.title) changed.push("name");
  if (p.before.date !== p.date) changed.push("date");
  if (p.before.allDay !== p.allDay || p.before.startTime !== p.startTime || p.before.endTime !== p.endTime) changed.push("time");
  if (p.before.location !== p.location) changed.push("location");
  return changed;
}

// Checks a proposal before it's shown or saved. Returns a problem description,
// or null if it's fine. `writableCalendarIds` are calendars the user can add to.
export function checkProposal(p: EventProposal, writableCalendarIds: string[]): string | null {
  if (!writableCalendarIds.includes(p.calendarId)) return "calendar_id must be one of the writable calendars.";
  if (p.action !== "create" && !p.eventId) return "event_id is missing, so there's nothing to change.";
  if (!p.title.trim()) return "title is empty.";
  if (p.title.length > 200) return "title is too long.";
  if (!isDayKey(p.date)) return "date must look like YYYY-MM-DD.";
  if (!p.allDay) {
    if (!isTime(p.startTime)) return "start_time must look like HH:MM (24-hour) for events that aren't all-day.";
    if (!isTime(p.endTime)) return "end_time must look like HH:MM (24-hour), or be empty.";
    if (p.endTime === p.startTime) return "end_time can't be the same as start_time.";
  }
  if (p.location.length > 300 || p.notes.length > 2000) return "location or notes are too long.";
  return null;
}

// Turns a proposal into the start/end format Google Calendar expects.
// Google accepts a local time plus a time zone name, so we don't need to do
// any time zone math ourselves.
export function proposalTimes(p: EventProposal, timeZone: string): { start: EventTime; end: EventTime } {
  if (p.allDay) {
    return { start: { date: p.date }, end: { date: addDays(p.date, 1) } }; // Google's end date is exclusive
  }
  const endDate = p.endTime < p.startTime ? addDays(p.date, 1) : p.date; // e.g. 10 PM - 1 AM
  return {
    start: { dateTime: `${p.date}T${p.startTime}:00`, timeZone },
    end: { dateTime: `${endDate}T${p.endTime}:00`, timeZone },
  };
}

export function proposalDescription(p: EventProposal) {
  return [p.notes.trim(), "Added with Vekters"].filter(Boolean).join("\n\n");
}
