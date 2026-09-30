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

// One helper for every call, so auth and errors are handled the same way.
async function googleRequest<T>(
  accessToken: string,
  path: string,
  options: { params?: Record<string, string>; method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const url = new URL(BASE_URL + path);
  url.search = new URLSearchParams(options.params ?? {}).toString();

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store", // always fetch fresh calendar data
  });

  if (!res.ok) {
    throw new Error(`Google Calendar ${path} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

const googleGet = <T>(accessToken: string, path: string, params: Record<string, string> = {}) =>
  googleRequest<T>(accessToken, path, { params });

export async function listCalendars(accessToken: string): Promise<Calendar[]> {
  const data = await googleGet<{ items?: Calendar[] }>(accessToken, "/users/me/calendarList");
  return data.items ?? [];
}

// Fetches events between timeMin and timeMax (ISO strings) from every calendar
// and merges them into one list sorted by start time.
export async function listEvents(
  accessToken: string,
  calendars: Calendar[],
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  // "freeBusyReader" calendars only share busy/free blocks, not event details.
  const readable = calendars.filter((cal) => cal.accessRole !== "freeBusyReader");

  const perCalendar = await Promise.all(
    readable.map(async (cal) => {
      try {
        // Google returns at most 250 events per "page". Long ranges (like a
        // whole season) can need several pages, so keep asking until done.
        const items: Omit<CalendarEvent, "calendarId" | "calendarName">[] = [];
        let pageToken: string | undefined;
        for (let page = 0; page < 10; page++) {
          const data = await googleGet<{ items?: typeof items; nextPageToken?: string }>(
            accessToken,
            `/calendars/${encodeURIComponent(cal.id)}/events`,
            {
              timeMin,
              timeMax,
              singleEvents: "true", // expand repeating events into individual ones
              orderBy: "startTime",
              maxResults: "250",
              ...(pageToken ? { pageToken } : {}),
            },
          );
          items.push(...(data.items ?? []));
          pageToken = data.nextPageToken;
          if (!pageToken) break;
        }
        return items.map((event) => ({
          ...event,
          calendarId: cal.id,
          calendarName: cal.summary,
        }));
      } catch (err) {
        // One broken calendar shouldn't hide all the others.
        console.error(`Skipping calendar "${cal.summary}":`, err);
        return [];
      }
    }),
  );

  return perCalendar.flat().sort((a, b) => startOf(a).localeCompare(startOf(b)));
}

// ISO strings sort correctly as plain text, so this is enough for ordering.
function startOf(event: CalendarEvent) {
  return event.start.dateTime ?? event.start.date ?? "";
}

export type NewEvent = {
  summary: string;
  location?: string;
  description?: string;
  start: EventTime;
  end: EventTime;
};

// Adds an event to one calendar. Only ever called after the user taps Confirm.
export async function insertEvent(accessToken: string, calendarId: string, event: NewEvent) {
  return googleRequest<{ id: string; htmlLink: string }>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: event },
  );
}

// Calendars the user is allowed to add events to.
export function canWrite(calendar: Calendar) {
  return calendar.accessRole === "owner" || calendar.accessRole === "writer";
}
