// The 7-column week. Each day is a stack of white cards under its own date
// header, sitting on the page background, rather than a bordered panel. On
// narrow screens the days stack, because seven columns won't fit a phone.
import Link from "next/link";
import type { CalendarEvent } from "@/lib/google-calendar";
import { isCancelledTitle } from "@/lib/proposals";
import { formatDayNumber, formatEventTime, formatWeekday, type DayKey } from "@/lib/week";

type Props = {
  days: DayKey[];
  eventsByDay: Map<DayKey, CalendarEvent[]>;
  today: DayKey;
  timeZone: string;
  colorOf: Map<string, string>; // calendar id -> the colour the student chose
  clock: "12" | "24";
  accent: string;
  // Where tapping an event goes. Built by the page so it keeps the week and filters.
  eventHref: (event: CalendarEvent) => string;
};

export function WeekGrid({ days, eventsByDay, today, timeZone, colorOf, clock, accent, eventHref }: Props) {
  return (
    <div className="grid flex-1 grid-cols-1 gap-2 lg:grid-cols-7">
      {days.map((day) => {
        const events = eventsByDay.get(day) ?? [];
        const isToday = day === today;
        const isWeekend = ["Sat", "Sun"].includes(formatWeekday(day));

        return (
          <section
            key={day}
            aria-label={`${formatWeekday(day)} ${formatDayNumber(day)}${isToday ? ", today" : ""}`}
            className="flex flex-col gap-1.5"
          >
            <h2 className="flex items-center gap-2 px-1 pb-0.5">
              <span
                className={`text-[12px] font-medium uppercase tracking-[0.08em] ${
                  isToday ? "text-ink" : "text-muted"
                }`}
              >
                {formatWeekday(day)}
              </span>
              {isToday ? (
                <span
                  className="nums inline-grid size-[26px] place-items-center rounded-full text-[15px] text-white"
                  style={{ backgroundColor: accent }}
                >
                  {formatDayNumber(day)}
                </span>
              ) : (
                <span className={`nums text-[18px] ${isWeekend ? "text-faint" : ""}`}>
                  {formatDayNumber(day)}
                </span>
              )}
            </h2>

            {events.map((event) => (
              <EventCard
                key={`${event.calendarId}-${event.id}`}
                event={event}
                color={colorOf.get(event.calendarId) ?? "#5a6360"}
                timeZone={timeZone}
                clock={clock}
                href={eventHref(event)}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

// The design's event block: a colour dot for the calendar, then the title and
// time. The calendar's name doesn't fit a 107px column, so it moves to the
// block's accessible name and to the legend in the sidebar.
function EventCard({
  event,
  color,
  timeZone,
  clock,
  href,
}: {
  event: CalendarEvent;
  color: string;
  timeZone: string;
  clock: "12" | "24";
  href: string;
}) {
  // Google hides events it treats as deleted, so we mark cancellations by
  // renaming them. Either signal counts.
  const cancelled = event.status === "cancelled" || isCancelledTitle(event.summary);
  const title = event.summary ?? "(no title)";
  const when = cancelled ? "Cancelled" : formatEventTime(event, timeZone, clock);

  return (
    // The whole block is the link, so it's an easy target on a touchscreen.
    <Link
      href={href}
      aria-label={`${title}, ${when}, ${event.calendarName}`}
      className={`block rounded-event border border-line bg-surface px-2.5 py-2 transition-colors duration-[var(--vk-dur-fast)] hover:bg-cell-hover ${
        cancelled ? "opacity-55" : ""
      }`}
    >
      <span className="flex items-start gap-1.5">
        <span
          aria-hidden="true"
          className="mt-[5px] size-2 shrink-0 rounded-[2px]"
          style={{ backgroundColor: color }}
        />
        <span className="min-w-0 flex-1">
          <span className={`block text-[13px] font-medium leading-[1.25] ${cancelled ? "line-through" : ""}`}>
            {title}
          </span>
          <span className="nums mt-0.5 block text-[11px] text-on-event">{when}</span>
          {event.location && <span className="mt-0.5 block truncate text-[11px] text-muted">{event.location}</span>}
        </span>
      </span>
    </Link>
  );
}
