// Home page (a server component: it runs on the server, so the access token
// never reaches the browser).
//
// Signed out  -> show a "Sign in with Google" button.
// Signed in   -> list the user's calendars and their events for the next 7 days.

import { auth, signIn, signOut } from "@/auth";
import { listCalendars, listUpcomingEvents, type CalendarEvent } from "@/lib/google-calendar";

export default async function HomePage() {
  const session = await auth();

  // No session, or the refresh token stopped working: ask them to sign in.
  if (!session?.accessToken || session.error) {
    return <SignInScreen expired={session?.error === "RefreshTokenError"} />;
  }

  let calendars, events;
  try {
    calendars = await listCalendars(session.accessToken);
    events = await listUpcomingEvents(session.accessToken, calendars);
  } catch (err) {
    return (
      <Page userName={session.user?.name}>
        <Notice>
          Couldn&apos;t load your calendar. {err instanceof Error ? err.message : String(err)}
        </Notice>
      </Page>
    );
  }

  // Use the primary calendar's time zone so times match what the user sees in Google.
  const timeZone = calendars.find((c) => c.primary)?.timeZone ?? "UTC";
  const eventsByDay = groupByDay(events, timeZone);

  return (
    <Page userName={session.user?.name}>
      <section className="mb-8">
        <h2 className="font-heading text-2xl font-bold uppercase tracking-wide">Your calendars</h2>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
          {calendars.map((cal) => (
            <li key={cal.id} className="flex min-h-11 items-center gap-3 px-4 py-2">
              <span
                className="inline-block size-3 rounded-full"
                style={{ backgroundColor: cal.backgroundColor ?? "#999" }}
              />
              <span className="font-semibold">{cal.summary}</span>
              {cal.primary && <span className="text-sm text-muted">(primary)</span>}
              <span className="ml-auto text-sm text-muted">{cal.accessRole}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-heading text-2xl font-bold uppercase tracking-wide">Next 7 days</h2>
        <p className="text-sm text-muted">
          {events.length} events · times shown in {timeZone}
        </p>

        {events.length === 0 && <Notice>No events in the next 7 days.</Notice>}

        {[...eventsByDay.entries()].map(([dayLabel, dayEvents]) => (
          <div key={dayLabel} className="mt-5">
            <h3 className="font-heading text-lg font-semibold uppercase text-muted">{dayLabel}</h3>
            <ul className="mt-2 space-y-2">
              {dayEvents.map((event) => (
                <li
                  key={`${event.calendarId}-${event.id}`}
                  className="flex min-h-11 flex-wrap items-baseline gap-x-3 rounded-lg border border-line bg-surface px-4 py-2"
                >
                  <span className="font-heading w-28 shrink-0 text-base font-semibold tabular-nums">
                    {formatTime(event, timeZone)}
                  </span>
                  <span className={`font-semibold ${event.status === "cancelled" ? "line-through text-muted" : ""}`}>
                    {event.summary ?? "(no title)"}
                  </span>
                  <span className="text-sm text-muted">{event.calendarName}</span>
                  {event.location && <span className="w-full text-sm text-muted">{event.location}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </Page>
  );
}

/* ---------- small pieces used above ---------- */

// Shared frame: header with app name, user name and sign-out.
function Page({ userName, children }: { userName?: string | null; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-8 flex items-center justify-between border-b border-line pb-4">
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">Athlete Calendar</h1>
        <div className="flex items-center gap-3">
          {userName && <span className="text-sm text-muted">{userName}</span>}
          {/* Server action: runs signOut on the server when the form is submitted. */}
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="min-h-11 rounded-md border border-line bg-surface px-4 font-semibold hover:bg-bg">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </main>
  );
}

function SignInScreen({ expired }: { expired: boolean }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-heading text-5xl font-bold uppercase tracking-wide">Athlete Calendar</h1>
      <p className="max-w-md text-muted">
        School and sports in one place. Sign in with the Google account your school calendar is on.
      </p>
      {expired && <Notice>Your Google session expired. Please sign in again.</Notice>}
      <form
        action={async () => {
          "use server";
          await signIn("google");
        }}
      >
        <button className="min-h-11 rounded-md bg-ink px-6 font-semibold text-white hover:opacity-90">
          Sign in with Google
        </button>
      </form>
    </main>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-md border border-warn-line bg-warn-fill px-4 py-3 text-warn">{children}</p>
  );
}

/* ---------- date helpers ---------- */

// Turns a flat list of events into a Map of "Thu, Sep 18" -> [events on that day].
// A Map keeps insertion order, and the events are already sorted, so days come out in order.
function groupByDay(events: CalendarEvent[], timeZone: string) {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const label = formatDay(event, timeZone);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(event);
  }
  return groups;
}

function formatDay(event: CalendarEvent, timeZone: string) {
  if (event.start.date) {
    // All-day event: "2026-09-20" has no time zone, so read it as a plain date.
    const [y, m, d] = event.start.date.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(
      new Date(y, m - 1, d),
    );
  }
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(
    new Date(event.start.dateTime!),
  );
}

function formatTime(event: CalendarEvent, timeZone: string) {
  if (event.start.date) return "All day";
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  return `${fmt.format(new Date(event.start.dateTime!))} – ${fmt.format(new Date(event.end.dateTime!))}`;
}
