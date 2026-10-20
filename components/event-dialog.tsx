// The event dialog: look at an event, edit it, delete it, or create a new one.
//
// It's driven entirely by the URL, the same way the week and the filters are:
//   ?cal=<calendar id>&ev=<event id>          -> details
//   ?cal=…&ev=…&edit=1                        -> edit form
//   ?cal=…&ev=…&del=1                         -> "are you sure?" before deleting
//   ?new=1&date=2026-10-20                    -> new event form
// That means no browser-side state, the back button works, and you can send
// someone a link straight to an event.

import Link from "next/link";
import { Trash2, X } from "lucide-react";
import { deleteEventForm, saveEventForm } from "@/app/actions";
import type { CalendarEvent } from "@/lib/google-calendar";
import { addHours, describeWhen, snapshotOf, type EventSnapshot } from "@/lib/proposals";

type CalendarOption = { id: string; name: string };

/* ---------- the shell ---------- */

function Dialog({
  title,
  closeHref,
  children,
}: {
  title: string;
  closeHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      {/* The backdrop is a link, so clicking away closes the dialog. */}
      <Link href={closeHref} aria-label="Close" className="fixed inset-0 bg-ink/35" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-dialog-title"
        className="relative my-auto w-full max-w-md rounded-card border border-line bg-surface shadow-xl"
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <h2 id="event-dialog-title" className="font-display flex-1 text-xl font-semibold tracking-tight">
            {title}
          </h2>
          <Link
            href={closeHref}
            aria-label="Close"
            className="-m-2 flex size-10 items-center justify-center rounded-full text-muted hover:bg-bg"
          >
            <X size={18} strokeWidth={2.2} />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- creating and editing ---------- */

export function EventForm({
  calendars,
  closeHref,
  returnTo,
  event,
  defaultCalendarId,
  defaultDate,
  defaultStart,
}: {
  calendars: CalendarOption[];
  closeHref: string;
  returnTo: string;
  event?: { id: string; calendarId: string; when: EventSnapshot; notes: string };
  defaultCalendarId?: string;
  defaultDate: string;
  defaultStart?: string; // "HH:MM", when you tapped an empty hour on the grid
}) {
  const when = event?.when;
  const field = "w-full rounded-card border border-line bg-bg px-3 py-2.5 focus:border-line-strong focus:outline-none";
  const label = "flex flex-col gap-1 text-sm font-semibold";

  return (
    <Dialog title={event ? "Edit event" : "New event"} closeHref={closeHref}>
      <form action={saveEventForm} className="flex flex-col gap-3 px-5 py-4">
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="eventId" value={event?.id ?? ""} />

        <label className={label}>
          Title
          <input name="title" required maxLength={200} defaultValue={when?.title ?? ""} className={field} />
        </label>

        <label className={label}>
          Calendar
          <select name="calendarId" defaultValue={event?.calendarId ?? defaultCalendarId} className={field}>
            {calendars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          Date
          <input type="date" name="date" required defaultValue={when?.date ?? defaultDate} className={`nums ${field}`} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Starts
            <input type="time" name="startTime" defaultValue={when?.startTime || defaultStart || "15:30"} className={`nums ${field}`} />
          </label>
          <label className={label}>
            Ends
            <input
              type="time"
              name="endTime"
              // Tapping an hour on the grid means that hour, so fill one hour in.
              // A blank end still becomes two hours, the rule the assistant uses.
              defaultValue={when?.endTime ?? (defaultStart ? addHours(defaultStart, 1) : "")}
              className={`nums ${field}`}
            />
          </label>
        </div>
        <p className="-mt-2 text-xs text-muted">Leave the end time blank and it becomes two hours.</p>

        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="allDay" defaultChecked={when?.allDay} className="size-5 accent-ink" />
          All day <span className="font-normal text-muted">(the times above are ignored)</span>
        </label>

        <label className={label}>
          Where <span className="font-normal text-muted">optional</span>
          <input name="location" maxLength={300} defaultValue={when?.location ?? ""} className={field} />
        </label>

        <label className={label}>
          Notes <span className="font-normal text-muted">optional</span>
          <textarea name="notes" rows={2} maxLength={2000} defaultValue={event?.notes ?? ""} className={field} />
        </label>

        <div className="flex gap-2 border-t border-line pt-3">
          <button className="min-h-11 flex-1 rounded-full bg-ink px-5 font-semibold text-white hover:opacity-90">
            {event ? "Save changes" : "Add event"}
          </button>
          <Link
            href={closeHref}
            className="flex min-h-11 items-center rounded-full border border-line-strong px-5 font-semibold hover:bg-bg"
          >
            Cancel
          </Link>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------- are you sure? ---------- */

export function DeleteConfirm({
  event,
  timeZone,
  backHref,
  returnTo,
}: {
  event: CalendarEvent;
  timeZone: string;
  backHref: string;
  returnTo: string;
}) {
  const when = snapshotOf(event, timeZone);

  return (
    <Dialog title="Delete this event?" closeHref={backHref}>
      <div className="flex flex-col gap-2 px-5 py-4">
        <p className="font-semibold">{event.summary ?? "(no title)"}</p>
        <p className="nums text-muted">{describeWhen(when)}</p>
        <p className="mt-1 text-sm text-warn">
          This removes it from your calendar for good. If a game or practice was only called off, ask the assistant to
          cancel it instead, which keeps it on the calendar marked cancelled.
        </p>
      </div>

      <div className="flex gap-2 border-t border-line px-5 py-4">
        {/* A plain form post, so deleting works even with no JavaScript. */}
        <form action={deleteEventForm} className="flex-1">
          <input type="hidden" name="calendarId" value={event.calendarId} />
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-warn px-5 font-semibold text-white hover:opacity-90">
            <Trash2 size={16} strokeWidth={2.2} />
            Delete it
          </button>
        </form>
        <Link
          href={backHref}
          className="flex min-h-11 items-center rounded-full border border-line-strong px-5 font-semibold hover:bg-bg"
        >
          Keep it
        </Link>
      </div>
    </Dialog>
  );
}
