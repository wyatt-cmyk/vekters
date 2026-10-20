// Month view: six rows of seven days, up to three event chips a day and a
// "+N more" when there are more. Tapping a date opens that day on its own.

import Link from "next/link";
import type { CalendarEvent } from "@/lib/google-calendar";
import { isCancelledTitle } from "@/lib/proposals";
import { isAllDay } from "@/lib/week-layout";
import { formatDayNumber, formatEventTime, sameMonth, weekdayInitials, type DayKey } from "@/lib/week";

const MAX_CHIPS = 3;

type Props = {
  days: DayKey[]; // 42 of them, starting on the student's week-start day
  month: DayKey; // any date in the month being shown
  eventsByDay: Map<DayKey, CalendarEvent[]>;
  today: DayKey;
  timeZone: string;
  clock: "12" | "24";
  colorOf: Map<string, string>;
  accent: string;
  weekStart: "mon" | "sun";
  eventHref: (event: CalendarEvent) => string;
  dayHref: (day: DayKey) => string;
  selectedId?: string;
};

export function MonthGrid({
  days,
  month,
  eventsByDay,
  today,
  timeZone,
  clock,
  colorOf,
  accent,
  weekStart,
  eventHref,
  dayHref,
  selectedId,
}: Props) {
  const weeks = Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-line bg-surface">
      <div className="grid grid-cols-7 border-b border-line">
        {weekdayInitials(weekStart).map((initial, index) => (
          <div key={index} className="px-2 py-2 text-center">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{initial}</span>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-[minmax(118px,1fr)] overflow-y-auto">
        {weeks.map((week, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-7 border-b border-line last:border-b-0">
            {week.map((day) => {
              const events = eventsByDay.get(day) ?? [];
              const outside = !sameMonth(day, month);
              const isToday = day === today;

              return (
                <div
                  key={day}
                  className={`flex min-h-0 flex-col gap-1 overflow-hidden border-l border-line p-1.5 first:border-l-0 ${
                    outside ? "bg-surface-muted" : isToday ? "bg-today-col" : ""
                  }`}
                >
                  <Link
                    href={dayHref(day)}
                    aria-label={`Open ${day} on its own`}
                    className="self-start rounded-full transition-colors duration-[var(--vk-dur-fast)]"
                  >
                    {isToday ? (
                      <span
                        className="nums inline-grid size-[24px] place-items-center rounded-full text-[13px] text-white"
                        style={{ backgroundColor: accent }}
                      >
                        {formatDayNumber(day)}
                      </span>
                    ) : (
                      <span
                        className={`nums inline-grid size-[24px] place-items-center rounded-full text-[13px] hover:bg-hover ${
                          outside ? "text-faint" : ""
                        }`}
                      >
                        {formatDayNumber(day)}
                      </span>
                    )}
                  </Link>

                  {events.slice(0, MAX_CHIPS).map((event) => (
                    <Chip
                      key={`${event.calendarId}-${event.id}`}
                      event={event}
                      color={colorOf.get(event.calendarId) ?? "#6b6b66"}
                      timeZone={timeZone}
                      clock={clock}
                      href={eventHref(event)}
                      selected={event.id === selectedId}
                    />
                  ))}

                  {events.length > MAX_CHIPS && (
                    <Link
                      href={dayHref(day)}
                      className="px-1 text-[11px] text-muted transition-colors duration-[var(--vk-dur-fast)] hover:text-ink"
                    >
                      +{events.length - MAX_CHIPS} more
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({
  event,
  color,
  timeZone,
  clock,
  href,
  selected,
}: {
  event: CalendarEvent;
  color: string;
  timeZone: string;
  clock: "12" | "24";
  href: string;
  selected: boolean;
}) {
  const cancelled = event.status === "cancelled" || isCancelledTitle(event.summary);
  const title = event.summary ?? "(no title)";
  const when = cancelled ? "Cancelled" : formatEventTime(event, timeZone, clock);

  // An all-day event reads as a filled chip; a timed one as a dot plus a time,
  // which is how the design separates them at this size.
  if (isAllDay(event)) {
    return (
      <Link
        href={href}
        data-selected={selected ? "" : undefined}
        aria-label={`${title}, ${when}, ${event.calendarName}`}
        style={{ ["--ev" as string]: color }}
        className={`ev truncate rounded-chip border px-1.5 py-[2px] text-[11px] font-medium ${
          cancelled ? "line-through opacity-60" : ""
        }`}
      >
        {title}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      data-selected={selected ? "" : undefined}
      aria-label={`${title}, ${when}, ${event.calendarName}`}
      className={`flex items-center gap-1.5 rounded-chip px-1 py-[1px] transition-colors duration-[var(--vk-dur-fast)] hover:bg-hover ${
        cancelled ? "opacity-60" : ""
      }`}
    >
      <span aria-hidden="true" className="size-[6px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className={`truncate text-[11px] ${cancelled ? "line-through" : ""}`}>{title}</span>
    </Link>
  );
}
