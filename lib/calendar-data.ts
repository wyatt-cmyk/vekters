// One place that decides where calendar data comes from:
//   - demo mode  -> sample data from demo-data.ts
//   - otherwise  -> the signed-in user's real Google Calendar
// Pages call loadWeek() or loadCalendars() and don't care which one it is.
import "server-only";

import { auth } from "@/auth";
import { DEMO_CALENDARS, DEMO_TIME_ZONE, demoEventsForWeek } from "./demo-data";
import { listCalendars, listEvents, type Calendar, type CalendarEvent } from "./google-calendar";
import { fetchRangeForWeek, isDayKey, startOfWeek, todayIn, type DayKey } from "./week";

// Demo mode is on when the Google keys are missing, or when DEMO_MODE=true.
export function isDemoMode() {
  return process.env.DEMO_MODE === "true" || !process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET;
}

type Mode = "demo" | "google";

export type CalendarsResult =
  | { status: "signed-out"; expired: boolean }
  | { status: "error"; mode: Mode; userName?: string | null; message: string }
  | { status: "ok"; mode: Mode; userName?: string | null; timeZone: string; calendars: Calendar[] };

export type WeekResult =
  | Exclude<CalendarsResult, { status: "ok" }>
  | (Extract<CalendarsResult, { status: "ok" }> & { monday: DayKey; today: DayKey; events: CalendarEvent[] });

export async function loadCalendars(): Promise<CalendarsResult> {
  if (isDemoMode()) {
    return { status: "ok", mode: "demo", userName: "Demo student", timeZone: DEMO_TIME_ZONE, calendars: DEMO_CALENDARS };
  }

  const session = await auth();
  if (!session?.accessToken || session.error) {
    return { status: "signed-out", expired: session?.error === "RefreshTokenError" };
  }

  try {
    const calendars = await listCalendars(session.accessToken);
    // The primary calendar's time zone is the one the user set in Google.
    const timeZone = calendars.find((c) => c.primary)?.timeZone ?? "UTC";
    return { status: "ok", mode: "google", userName: session.user?.name, timeZone, calendars };
  } catch (err) {
    return { status: "error", mode: "google", userName: session.user?.name, message: errorMessage(err) };
  }
}

// `requestedWeek` is any date in the week (from the URL). Missing or invalid -> this week.
export async function loadWeek(requestedWeek?: string): Promise<WeekResult> {
  const base = await loadCalendars();
  if (base.status !== "ok") return base;

  const today = todayIn(base.timeZone);
  const monday = startOfWeek(isDayKey(requestedWeek) ? requestedWeek : today);

  if (base.mode === "demo") {
    return { ...base, today, monday, events: demoEventsForWeek(monday) };
  }

  try {
    const session = await auth();
    const { timeMin, timeMax } = fetchRangeForWeek(monday);
    const events = await listEvents(session!.accessToken!, base.calendars, timeMin, timeMax);
    return { ...base, today, monday, events };
  } catch (err) {
    return { status: "error", mode: base.mode, userName: base.userName, message: errorMessage(err) };
  }
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
