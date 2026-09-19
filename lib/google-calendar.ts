// Small helpers that talk to the Google Calendar REST API.
// "server-only" makes the build fail if this file is ever imported into
// browser code, which keeps the access token on the server.
import "server-only";

const BASE_URL = "https://www.googleapis.com/calendar/v3";

export type Calendar = {
  id: string;
  summary: string; // the calendar's name
  primary?: boolean;
  timeZone?: string;
  backgroundColor?: string;
  accessRole: "owner" | "writer" | "reader" | "freeBusyReader";
};

// Google gives timed events a `dateTime` and all-day events a `date`.
export type EventTime = { dateTime?: string; date?: string; timeZone?: string };

export type CalendarEvent = {
  id: string;
  summary?: string;
  location?: string;
  status: "confirmed" | "tentative" | "cancelled";
  start: EventTime;
  end: EventTime;
  // Added by us so we know which calendar each event came from.
  calendarId: string;
  calendarName: string;
};

// One generic GET helper so every call handles auth and errors the same way.
async function googleGet<T>(
  accessToken: string,
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(BASE_URL + path);
  url.search = new URLSearchParams(params).toString();

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store", // always fetch fresh calendar data
  });

  if (!res.ok) {
    throw new Error(`Google Calendar ${path} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function listCalendars(accessToken: string): Promise<Calendar[]> {
  const data = await googleGet<{ items?: Calendar[] }>(accessToken, "/users/me/calendarList");
  return data.items ?? [];
}

// Fetches events from every calendar for the next `days` days and merges them
// into one list sorted by start time.
export async function listUpcomingEvents(
  accessToken: string,
  calendars: Calendar[],
  days = 7,
): Promise<CalendarEvent[]> {
  const now = new Date();
  const later = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const perCalendar = await Promise.all(
    calendars.map(async (cal) => {
      const data = await googleGet<{ items?: Omit<CalendarEvent, "calendarId" | "calendarName">[] }>(
        accessToken,
        `/calendars/${encodeURIComponent(cal.id)}/events`,
        {
          timeMin: now.toISOString(),
          timeMax: later.toISOString(),
          singleEvents: "true", // expand repeating events into individual ones
          orderBy: "startTime",
          maxResults: "100",
        },
      );
      return (data.items ?? []).map((event) => ({
        ...event,
        calendarId: cal.id,
        calendarName: cal.summary,
      }));
    }),
  );

  return perCalendar.flat().sort((a, b) => startOf(a).localeCompare(startOf(b)));
}

// ISO strings sort correctly as plain text, so this is enough for ordering.
function startOf(event: CalendarEvent) {
  return event.start.dateTime ?? event.start.date ?? "";
}
