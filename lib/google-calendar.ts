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

// An error from Google, with a message that tells the student what to fix.
export class GoogleCalendarError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
    message: string,
  ) {
    super(message);
  }
}

// Google sends errors as JSON like:
//   { "error": { "code": 403, "message": "...", "errors": [{ "reason": "..." }] } }
// This turns the common ones into something a student can act on. Anything
// unexpected keeps Google's own wording so we can still debug it.
function explain(status: number, reason: string, googleMessage: string) {
  if (status === 401) {
    return "Your Google sign-in expired or was turned off. Sign out and sign in again.";
  }
  if (status === 403) {
    if (reason === "accessNotConfigured" || /has not been used in project|is disabled/i.test(googleMessage)) {
      return "The Google Calendar API isn't turned on for your Google Cloud project. See step 2 in SETUP.md.";
    }
    if (reason === "insufficientPermissions" || /insufficient|scope/i.test(googleMessage)) {
      return "This app wasn't given calendar permission. Sign out, sign in again, and tick BOTH calendar boxes on Google's screen.";
    }
    if (reason === "rateLimitExceeded" || reason === "userRateLimitExceeded" || reason === "quotaExceeded") {
      return "Google is limiting how fast we can ask for your calendar. Wait a minute and reload.";
    }
    return `Google said no: ${googleMessage}`;
  }
  if (status === 404) return "That calendar doesn't exist any more.";
  if (status === 429) return "Google is limiting how fast we can ask for your calendar. Wait a minute and reload.";
  if (status >= 500) return "Google Calendar is having trouble right now. Try again in a minute.";
  return `Google Calendar returned an error (${status}): ${googleMessage}`;
}

// One helper for every call, so auth and errors are handled the same way.
async function googleRequest<T>(
  accessToken: string,
  path: string,
  options: { params?: Record<string, string>; method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const url = new URL(BASE_URL + path);
  url.search = new URLSearchParams(options.params ?? {}).toString();

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store", // always fetch fresh calendar data
    });
  } catch {
    // No network, DNS failure, etc.
    throw new GoogleCalendarError(0, "network", "Couldn't reach Google. Check your internet connection.");
  }

  if (!res.ok) {
    const body = await res.text();
    let reason = "";
    let googleMessage = body.slice(0, 300);
    try {
      const parsed = JSON.parse(body);
      reason = parsed?.error?.errors?.[0]?.reason ?? parsed?.error?.status ?? "";
      googleMessage = parsed?.error?.message ?? googleMessage;
    } catch {
      // Not JSON; keep the raw text.
    }
    // The full detail goes to the server log; the student sees the short version.
    console.error(`Google Calendar ${options.method ?? "GET"} ${path} failed (${res.status}):`, body.slice(0, 1000));
    throw new GoogleCalendarError(res.status, reason, explain(res.status, reason, googleMessage));
  }

  // DELETE comes back empty, so there is no JSON to parse.
  if (res.status === 204) return undefined as T;
  return res.json();
}

const googleGet = <T>(accessToken: string, path: string, params: Record<string, string> = {}) =>
  googleRequest<T>(accessToken, path, { params });

// Every calendar in the user's list. School accounts often have a lot, and
// Google sends them 250 at a time, so keep asking until there are no more.
export async function listCalendars(accessToken: string): Promise<Calendar[]> {
  const calendars: Calendar[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 10; page++) {
    const data = await googleGet<{ items?: RawCalendar[]; nextPageToken?: string }>(
      accessToken,
      "/users/me/calendarList",
      { maxResults: "250", ...(pageToken ? { pageToken } : {}) },
    );
    for (const item of data.items ?? []) {
      calendars.push({
        ...item,
        // If the student renamed a shared calendar in Google, that new name is
        // in summaryOverride. Show the name they chose.
        summary: item.summaryOverride || item.summary || "(unnamed calendar)",
      });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return calendars;
}

type RawCalendar = Calendar & { summaryOverride?: string };

// Fetches events between timeMin and timeMax (ISO strings) from every calendar
// and merges them into one list sorted by start time.
// `failed` (optional) collects the names of calendars that wouldn't load, so
// the page can tell the student instead of quietly showing fewer events.
export async function listEvents(
  accessToken: string,
  calendars: Calendar[],
  timeMin: string,
  timeMax: string,
  failed?: string[],
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
        // One broken calendar shouldn't hide all the others, but don't hide the
        // problem either: record it so the page can mention it.
        console.error(`Skipping calendar "${cal.summary}":`, err);
        failed?.push(cal.summary);
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

// One event, by id. Used to show "before" on an update or cancel card, and to
// make sure the event still exists before we change it.
export async function getEvent(accessToken: string, calendarId: string, eventId: string) {
  return googleGet<Omit<CalendarEvent, "calendarId" | "calendarName">>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
  );
}

// Changes only the fields we send; everything else on the event is left alone.
export async function patchEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  changes: Partial<NewEvent>,
) {
  return googleRequest<{ id: string }>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: changes },
  );
}

// Removes an event for good. Used by the Delete button, which asks first.
export async function deleteEvent(accessToken: string, calendarId: string, eventId: string) {
  await googleRequest<void>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
}
