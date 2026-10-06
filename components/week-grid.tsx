// The 7-column week. On narrow screens the days stack instead, because seven
// columns won't fit a phone.
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
};

export function WeekGrid({ days, eventsByDay, tagOf, today, timeZone }: Props) {
  return (
    // A single hairline grid: the gap shows the page colour through, so the
    // seven days read as one table rather than seven floating cards.
    <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-px border border-line bg-line lg:grid-cols-7">
      {days.map((day) => {
        const events = eventsByDay.get(day) ?? [];
        const isToday = day === today;
        return (
          <section
            key={day}
            aria-label={`${formatWeekday(day)} ${formatDayNumber(day)}`}
            className="flex flex-col bg-surface lg:min-h-80"
          >
            <h2 className={`flex items-baseline gap-2 px-3 py-2 ${isToday ? "bg-accent" : ""}`}>
              <span className={`text-[11px] font-bold uppercase tracking-widest ${isToday ? "text-accent-ink" : "text-muted"}`}>
                {formatWeekday(day)}
              </span>
              <span className="font-display nums text-3xl leading-none">{formatDayNumber(day)}</span>
            </h2>

            {events.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted">—</p>
            ) : (
              <ul className="flex flex-col">
                {events.map((event) => (
                  <EventCard
                    key={`${event.calendarId}-${event.id}`}
                    event={event}
                    tag={tagOf.get(event.calendarId) ?? "other"}
                    timeZone={timeZone}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

// A hard bar on the left in the category colour, rather than a pastel fill.
// It keeps the card white and the type crisp while still being scannable.
const BAR: Record<Tag, string> = {
  school: "border-l-school",
  sports: "border-l-sports",
  other: "border-l-muted",
};
const LABEL: Record<Tag, string> = {
  school: "text-school",
  sports: "text-sports",
  other: "text-muted",
};

function EventCard({ event, tag, timeZone }: { event: CalendarEvent; tag: Tag; timeZone: string }) {
  // Google hides events it treats as deleted, so we mark cancellations by
  // renaming them. Either signal counts.
  const cancelled = event.status === "cancelled" || isCancelledTitle(event.summary);

  return (
    <li className={`border-t border-line border-l-[3px] px-3 py-2 ${BAR[tag]} ${cancelled ? "opacity-55" : ""}`}>
      <p className={`truncate text-[10px] font-bold uppercase tracking-widest ${LABEL[tag]}`}>{event.calendarName}</p>
      <p className={`font-semibold leading-snug ${cancelled ? "line-through" : ""}`}>{event.summary ?? "(no title)"}</p>
      <p className="nums text-sm text-muted">{cancelled ? "Cancelled" : formatEventTime(event, timeZone)}</p>
      {event.location && <p className="truncate text-xs text-muted">{event.location}</p>}
    </li>
  );
}
