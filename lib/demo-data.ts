// Sample calendars and events for demo mode (used until Google is set up).
// Everything is shaped exactly like real Google Calendar data, so the rest of
// the app can't tell the difference. The same pattern repeats every week, so
// you can click through weeks and always see something.

import type { Calendar, CalendarEvent } from "./google-calendar";
import { addDays, type DayKey } from "./week";

// Demo times use this computer's own time zone.
export const DEMO_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const primary: Calendar = { id: "demo-primary", summary: "Alex Rivera", primary: true, accessRole: "owner", backgroundColor: "#9fc6e7", timeZone: DEMO_TIME_ZONE };
const toddle: Calendar = { id: "demo-toddle", summary: "Toddle", accessRole: "reader", backgroundColor: "#4986e7" };
const soccer: Calendar = { id: "demo-soccer", summary: "Varsity Soccer", accessRole: "owner", backgroundColor: "#16a765" };
const holidays: Calendar = { id: "demo-holidays", summary: "Holidays in United States", accessRole: "reader", backgroundColor: "#cca6ac" };

export const DEMO_CALENDARS: Calendar[] = [primary, toddle, soccer, holidays];

// dayOffset: 0 = Monday ... 6 = Sunday
export function demoEventsForWeek(monday: DayKey): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // A timed event. "15:30" means 3:30 PM on this computer's clock.
  const timed = (cal: Calendar, dayOffset: number, start: string, end: string, summary: string, location?: string) => {
    const day = addDays(monday, dayOffset);
    events.push({
      id: `${cal.id}-${day}-${start}`,
      summary,
      location,
      status: "confirmed",
      start: { dateTime: localIso(day, start) },
      end: { dateTime: localIso(day, end) },
      calendarId: cal.id,
      calendarName: cal.summary,
    });
  };

  // An all-day event, like an assignment due date.
  const allDay = (cal: Calendar, dayOffset: number, summary: string) => {
    const day = addDays(monday, dayOffset);
    events.push({
      id: `${cal.id}-${day}-${summary}`,
      summary,
      status: "confirmed",
      start: { date: day },
      end: { date: addDays(day, 1) },
      calendarId: cal.id,
      calendarName: cal.summary,
    });
  };

  // School (Toddle)
  allDay(toddle, 0, "Biology: Lab report due");
  timed(toddle, 1, "08:00", "08:30", "English: Essay draft due");
  allDay(toddle, 2, "Algebra II: Problem set 4 due");
  timed(toddle, 3, "09:00", "10:00", "History: Unit 2 test");
  timed(toddle, 4, "10:15", "10:45", "Spanish: Vocab quiz");

  // Sports
  timed(soccer, 0, "15:30", "17:30", "Practice", "Main field");
  timed(soccer, 1, "15:30", "17:30", "Practice", "Main field");
  timed(soccer, 2, "18:00", "20:00", "Game vs. Lincoln High", "Home stadium");
  timed(soccer, 3, "15:30", "17:00", "Recovery practice", "Weight room");
  timed(soccer, 4, "14:30", "15:00", "Bus departs", "Front lot");
  timed(soccer, 4, "16:00", "18:00", "Game @ Westview", "Westview HS");
  timed(soccer, 5, "10:00", "11:00", "Film session", "Room 114");

  // Personal
  timed(primary, 1, "18:30", "19:15", "Dentist");
  timed(primary, 6, "15:00", "17:00", "Study group", "Library");

  // Apply any edits and deletions made through the app in demo mode.
  const overrides = demoOverrides();
  const deleted = demoDeleted();
  return events.filter((e) => !deleted.has(e.id)).map((e) => overrides.get(e.id)?.(e) ?? e);
}

// Events "added" in demo mode are kept in the server's memory, so they vanish
// when the dev server restarts. globalThis keeps one shared list even when
// Next.js reloads this file during development.
const memory = globalThis as unknown as {
  demoAddedEvents?: CalendarEvent[];
  demoOverrides?: Map<string, (event: CalendarEvent) => CalendarEvent>;
  demoDeleted?: Set<string>;
};

export function demoAddedEvents(): CalendarEvent[] {
  return (memory.demoAddedEvents ??= []);
}

// Edits to the generated sample events, kept by event id. Demo mode regenerates
// those events on every request, so changes have to be re-applied each time.
export function demoOverrides(): Map<string, (event: CalendarEvent) => CalendarEvent> {
  return (memory.demoOverrides ??= new Map());
}

// Ids of sample events deleted through the app in demo mode.
export function demoDeleted(): Set<string> {
  return (memory.demoDeleted ??= new Set());
}


// "2026-09-28" + "15:30" -> exact ISO time, using this computer's time zone.
export function localIso(day: DayKey, time: string) {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}
