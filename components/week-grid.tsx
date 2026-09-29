// The 7-column week grid. On narrow screens (phones, small tablets) the days
// stack vertically instead, because 7 columns won't fit.
import type { CalendarEvent } from "@/lib/google-calendar";
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
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-7">
      {days.map((day) => {
        const events = eventsByDay.get(day) ?? [];
        const isToday = day === today;
        return (
          <section
            key={day}
            aria-label={`${formatWeekday(day)} ${formatDayNumber(day)}`}
            className={`flex flex-col rounded-lg border bg-surface p-2 lg:min-h-80 ${
              isToday ? "border-ink" : "border-line"
            }`}
          >
            <h2 className="mb-2 flex items-baseline gap-2 px-1">
              <span className="font-heading text-sm font-semibold uppercase tracking-wider text-muted">
                {formatWeekday(day)}
              </span>
              <span
                className={`font-heading text-2xl font-bold leading-none ${
                  isToday ? "rounded bg-ink px-1.5 py-0.5 text-white" : ""
                }`}
              >
                {formatDayNumber(day)}
              </span>
            </h2>

            {events.length === 0 ? (
              <p className="px-1 text-sm text-muted">Nothing scheduled</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
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

// Colors per tag, from the design brief.
const CARD_STYLES: Record<Tag, { card: string; label: string }> = {
  school: { card: "bg-school-fill", label: "text-school" },
  sports: { card: "bg-sports-fill", label: "text-sports" },
  other: { card: "bg-bg", label: "text-muted" },
};

function EventCard({ event, tag, timeZone }: { event: CalendarEvent; tag: Tag; timeZone: string }) {
  const style = CARD_STYLES[tag];
  const cancelled = event.status === "cancelled";
  return (
    <li className={`rounded-md px-2 py-1.5 ${style.card} ${cancelled ? "opacity-60" : ""}`}>
      {/* Small uppercase label: which calendar (class or sport) it came from. */}
      <p className={`truncate text-[11px] font-bold uppercase tracking-wider ${style.label}`}>{event.calendarName}</p>
      <p className={`font-semibold leading-snug ${cancelled ? "line-through" : ""}`}>{event.summary ?? "(no title)"}</p>
      <p className="font-heading text-sm font-semibold tabular-nums text-muted">
        {cancelled ? "Cancelled" : formatEventTime(event, timeZone)}
      </p>
      {event.location && <p className="truncate text-xs text-muted">{event.location}</p>}
    </li>
  );
}
