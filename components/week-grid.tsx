// The 7-column week. Each day is a stack of white cards under its own date
// header, sitting on the page background, rather than a bordered panel. On
// narrow screens the days stack, because seven columns won't fit a phone.
import Link from "next/link";
import type { CalendarEvent } from "@/lib/google-calendar";
import { isCancelledTitle } from "@/lib/proposals";
import type { Tag } from "@/lib/tags";
import { formatDayNumber, formatEventTime, formatWeekday, type DayKey } from "@/lib/week";

type Props = {
  days: DayKey[];
  eventsByDay: Map<DayKey, CalendarEvent[]>;
  tagOf: Map<string, Tag>; // calendar id -> tag
  today: DayKey;
  timeZone: string;
  // Where tapping an event goes. Built by the page so it keeps the week and filters.
  eventHref: (event: CalendarEvent) => string;
};

export function WeekGrid({ days, eventsByDay, tagOf, today, timeZone, eventHref }: Props) {
  return (
    <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-7">
      {days.map((day) => {
        const events = eventsByDay.get(day) ?? [];
        const isToday = day === today;
        const isWeekend = ["Sat", "Sun"].includes(formatWeekday(day));

        return (
          <section
            key={day}
            aria-label={`${formatWeekday(day)} ${formatDayNumber(day)}${isToday ? ", today" : ""}`}
            className="flex flex-col gap-2"
          >
            <h2 className="flex items-center gap-2 px-1 pb-0.5">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  isToday ? "text-accent" : isWeekend ? "text-faint/80" : "text-faint"
                }`}
              >
                {formatWeekday(day)}
              </span>
              {isToday ? (
                <span className="nums font-display inline-grid h-7 min-w-7 place-items-center rounded-full bg-accent px-2 text-base font-semibold text-accent-ink">
                  {formatDayNumber(day)}
                </span>
              ) : (
                <span className={`nums font-display text-xl font-semibold ${isWeekend ? "text-muted" : ""}`}>
                  {formatDayNumber(day)}
                </span>
              )}
            </h2>

            {events.map((event) => (
              <EventCard
                key={`${event.calendarId}-${event.id}`}
                event={event}
                tag={tagOf.get(event.calendarId) ?? "other"}
                timeZone={timeZone}
                href={eventHref(event)}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

// Category reads as a small coloured label rather than a bar down the side.
const LABEL: Record<Tag, string> = {
  school: "text-school",
  sports: "text-sports",
  other: "text-muted",
};

function EventCard({
  event,
  tag,
  timeZone,
  href,
}: {
  event: CalendarEvent;
  tag: Tag;
  timeZone: string;
  href: string;
}) {
  // Google hides events it treats as deleted, so we mark cancellations by
  // renaming them. Either signal counts.
  const cancelled = event.status === "cancelled" || isCancelledTitle(event.summary);

  return (
    // The whole card is the link, so it's an easy target on a touchscreen.
    <Link
      href={href}
      className={`block rounded-card border border-line bg-surface px-3 py-2.5 hover:border-line-strong hover:bg-bg ${
        cancelled ? "opacity-60" : ""
      }`}
    >
      <p className={`truncate text-[10px] font-bold uppercase tracking-wider ${LABEL[tag]}`}>{event.calendarName}</p>
      <p className={`text-sm font-semibold leading-snug ${cancelled ? "line-through" : ""}`}>
        {event.summary ?? "(no title)"}
      </p>
      <p className="nums mt-0.5 text-xs text-muted">{cancelled ? "Cancelled" : formatEventTime(event, timeZone)}</p>
      {event.location && <p className="truncate text-xs text-muted">{event.location}</p>}
    </Link>
  );
}
