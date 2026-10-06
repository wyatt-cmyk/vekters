// One place that decides where calendar data comes from:
//   - demo mode  -> sample data from demo-data.ts
//   - otherwise  -> the signed-in user's real Google Calendar
// Pages, the AI chat, and the Confirm button all go through here, so none of
// them need to care which one it is.
import "server-only";

import { auth } from "@/auth";
import { DEMO_CALENDARS, DEMO_TIME_ZONE, demoAddedEvents, demoEventsForWeek, demoOverrides, localIso } from "./demo-data";
import {
  getEvent,
  insertEvent,
  listCalendars,
  listEvents,
  patchEvent,
  type Calendar,
  type CalendarEvent,
} from "./google-calendar";
import { cancelledTitle, proposalDescription, proposalTimes, snapshotOf, type EventProposal, type EventSnapshot } from "./proposals";
import { addDays, eventDays, fetchRange, isDayKey, startOfWeek, todayIn, type DayKey } from "./week";

// Demo mode is on when the Google keys are missing, or when DEMO_MODE=true.
export function isDemoMode() {
  return process.env.DEMO_MODE === "true" || !process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET;
}

type Mode = "demo" | "google";

// Everything needed to read or write the user's calendar.
export type Source = {
  mode: Mode;
  timeZone: string;
  calendars: Calendar[];
  userName?: string | null;
  accessToken?: string; // only in google mode
  missingScopes: string[]; // permissions the student didn't grant on Google's screen
};

export type SignedOut = { status: "signed-out"; expired: boolean };

// Returns the data source, or SignedOut. Throws if Google returns an error.
export async function getSource(): Promise<Source | SignedOut> {
  if (isDemoMode()) {
    return { mode: "demo", timeZone: DEMO_TIME_ZONE, calendars: DEMO_CALENDARS, userName: "Demo student", missingScopes: [] };
  }

  const session = await auth();
  if (!session?.accessToken || session.error) {
    return { status: "signed-out", expired: session?.error === "RefreshTokenError" };
  }

  const calendars = await listCalendars(session.accessToken);
  // The primary calendar's time zone is the one the user set in Google.
  const timeZone = calendars.find((c) => c.primary)?.timeZone ?? "UTC";
  return {
    mode: "google",
    timeZone,
    calendars,
    userName: session.user?.name,
    accessToken: session.accessToken,
    missingScopes: session.missingScopes ?? [],
  };
}

export function isSignedOut(value: Source | SignedOut): value is SignedOut {
  return "status" in value;
}

/* ---------- reading ---------- */

// All events from `firstDay` through `lastDay` (both included), sorted by start.
export async function getEventsBetween(
  source: Source,
  firstDay: DayKey,
  lastDay: DayKey,
  failed?: string[], // optional: collects names of calendars that wouldn't load
): Promise<CalendarEvent[]> {
  let events: CalendarEvent[];

  if (source.mode === "demo") {
    // Demo data is generated one week at a time, plus anything added via the chat.
    events = [...demoAddedEvents()];
    for (let monday = startOfWeek(firstDay); monday <= lastDay; monday = addDays(monday, 7)) {
      events.push(...demoEventsForWeek(monday));
    }
  } else {
    const { timeMin, timeMax } = fetchRange(firstDay, addDays(lastDay, 1));
    events = await listEvents(source.accessToken!, source.calendars, timeMin, timeMax, failed);
  }

  // Keep only events that touch the requested days.
  return events
    .filter((e) => eventDays(e, source.timeZone).some((day) => day >= firstDay && day <= lastDay))
    .sort((a, b) => (a.start.dateTime ?? a.start.date ?? "").localeCompare(b.start.dateTime ?? b.start.date ?? ""));
}

type Loaded<T> = SignedOut | { status: "error"; mode: Mode; userName?: string | null; message: string } | ({ status: "ok" } & T);

export type CalendarsResult = Loaded<Source>;
export type WeekResult = Loaded<Source & { monday: DayKey; today: DayKey; events: CalendarEvent[]; failedCalendars: string[] }>;

export async function loadCalendars(): Promise<CalendarsResult> {
  try {
    const source = await getSource();
    return isSignedOut(source) ? source : { status: "ok", ...source };
  } catch (err) {
    return { status: "error", mode: isDemoMode() ? "demo" : "google", message: errorMessage(err) };
  }
}

// `requestedWeek` is any date in the week (from the URL). Missing or invalid -> this week.
export async function loadWeek(requestedWeek?: string): Promise<WeekResult> {
  try {
    const source = await getSource();
    if (isSignedOut(source)) return source;

    const today = todayIn(source.timeZone);
    const monday = startOfWeek(isDayKey(requestedWeek) ? requestedWeek : today);
    const failedCalendars: string[] = [];
    const events = await getEventsBetween(source, monday, addDays(monday, 6), failedCalendars);
    return { status: "ok", ...source, today, monday, events, failedCalendars };
  } catch (err) {
    return { status: "error", mode: isDemoMode() ? "demo" : "google", message: errorMessage(err) };
  }
}

/* ---------- writing (only after the user taps Confirm) ---------- */

// Runs a confirmation card. This is the only place events are written.
export async function applyProposal(source: Source, p: EventProposal) {
  if (p.action === "create") return createEvent(source, p);
  if (p.action === "update") return updateEvent(source, p);
  return cancelEvent(source, p);
}

async function createEvent(source: Source, p: EventProposal) {
  const { start, end } = proposalTimes(p, source.timeZone);

  if (source.mode === "google") {
    await insertEvent(source.accessToken!, p.calendarId, {
      summary: p.title,
      location: p.location || undefined,
      description: proposalDescription(p),
      start,
      end,
    });
    return;
  }

  // Demo mode: keep it in memory, shaped like a Google event.
  demoAddedEvents().push({
    id: p.id,
    summary: p.title,
    location: p.location || undefined,
    status: "confirmed",
    start: p.allDay ? start : { dateTime: localIso(p.date, p.startTime) },
    end: p.allDay ? end : { dateTime: localIso(end.dateTime!.slice(0, 10), p.endTime) },
    calendarId: p.calendarId,
    calendarName: p.calendarName,
  });
}

async function updateEvent(source: Source, p: EventProposal) {
  const { start, end } = proposalTimes(p, source.timeZone);

  if (source.mode === "google") {
    // PATCH changes only what we send, so anything else on the event survives.
    await patchEvent(source.accessToken!, p.calendarId, p.eventId!, {
      summary: p.title,
      location: p.location,
      start,
      end,
    });
    return;
  }

  patchDemoEvent(p.eventId!, (event) => ({
    ...event,
    summary: p.title,
    location: p.location || undefined,
    start: p.allDay ? start : { dateTime: localIso(p.date, p.startTime) },
    end: p.allDay ? end : { dateTime: localIso(end.dateTime!.slice(0, 10), p.endTime) },
  }));
}

// CLAUDE.md: cancelled events are marked, not deleted. We rename them so the
// student can still see that practice was called off.
async function cancelEvent(source: Source, p: EventProposal) {
  // Read the event's name from the calendar rather than trusting the card: the
  // card came from the browser and may be out of date if the event changed
  // since it was shown.
  const live = await getEventSnapshot(source, p.calendarId, p.eventId!);
  if (!live) throw new Error("That event is no longer on your calendar.");
  const title = cancelledTitle(live.title || p.title);

  if (source.mode === "google") {
    await patchEvent(source.accessToken!, p.calendarId, p.eventId!, { summary: title });
    return;
  }
  patchDemoEvent(p.eventId!, (event) => ({ ...event, summary: title }));
}

// Demo mode has two kinds of events: ones added through the app (editable in
// place) and ones generated per week (we store an override instead).
function patchDemoEvent(eventId: string, change: (event: CalendarEvent) => CalendarEvent) {
  const added = demoAddedEvents();
  const index = added.findIndex((e) => e.id === eventId);
  if (index >= 0) {
    added[index] = change(added[index]);
    return;
  }
  demoOverrides().set(eventId, change);
}

// Looks up what an existing event currently is, for the "before" on a card.
export async function getEventSnapshot(
  source: Source,
  calendarId: string,
  eventId: string,
): Promise<EventSnapshot | null> {
  if (source.mode === "google") {
    const event = await getEvent(source.accessToken!, calendarId, eventId);
    return snapshotOf({ ...event, calendarId, calendarName: "" }, source.timeZone);
  }
  // Demo mode: search the weeks around today for a matching event.
  const today = todayIn(source.timeZone);
  const events = await getEventsBetween(source, addDays(today, -60), addDays(today, 180));
  const event = events.find((e) => e.id === eventId && e.calendarId === calendarId);
  return event ? snapshotOf(event, source.timeZone) : null;
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
