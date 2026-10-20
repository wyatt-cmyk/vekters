// The week as an hour grid: a 64px time gutter, seven day columns, one hour
// every 64px, a sticky header with an all-day row, overlapping events split
// into side-by-side lanes, and the current time drawn across today.
//
// Rendered on the server. Only the now line and the opening scroll position
// need the browser (see week-client.tsx).

import Link from "next/link";
import type { CalendarEvent } from "@/lib/google-calendar";
import { isCancelledTitle } from "@/lib/proposals";
import {
  boxOf,
  hourLabel,
  hourLabelValue,
  hourWindow,
  HOUR_PX,
  isAllDay,
  placeDay,
  type Placed,
} from "@/lib/week-layout";
import { formatDayNumber, formatEventTime, formatWeekday, type DayKey } from "@/lib/week";
import { NowLine, ScrollToHour } from "./week-client";

type Props = {
  days: DayKey[];
  eventsByDay: Map<DayKey, CalendarEvent[]>;
  today: DayKey;
  timeZone: string;
  colorOf: Map<string, string>; // calendar id -> the colour the student chose
  clock: "12" | "24";
  accent: string;
  eventHref: (event: CalendarEvent) => string;
  // Where tapping an empty hour goes: a new event starting at that hour.
  slotHref: (day: DayKey, time: string) => string;
  selectedId?: string;
};

// 64px gutter, then seven equal day columns. The three rows share it so the
// headings, the all-day row and the grid all line up.
const COLUMNS = { gridTemplateColumns: "var(--spacing-gutter) repeat(7, minmax(0, 1fr))" };

export function WeekGrid({
  days,
  eventsByDay,
  today,
  timeZone,
  colorOf,
  clock,
  accent,
  eventHref,
  slotHref,
  selectedId,
}: Props) {
  const placedByDay = new Map(days.map((day) => [day, placeDay(eventsByDay.get(day) ?? [], day, timeZone)]));
  const allDayByDay = new Map(days.map((day) => [day, (eventsByDay.get(day) ?? []).filter(isAllDay)]));

  const { startHour, endHour } = hourWindow(placedByDay);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const hasAllDay = [...allDayByDay.values()].some((list) => list.length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-line bg-surface">
      <div data-week-scroll className="min-h-0 flex-1 overflow-y-auto">
        {/* Opens on the morning rather than at the top of the day. */}
        {/* A little short of 7 so the hour label clears the sticky header. */}
        <ScrollToHour offset={Math.max(0, (7 - startHour) * HOUR_PX - 10)} />

        {/* Sticky: weekday headings, then the all-day row. */}
        <div className="sticky top-0 z-30 bg-surface">
          <div className="grid border-b border-line" style={COLUMNS}>
            <div />
            {days.map((day) => {
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={`flex items-center gap-2 border-l border-line px-3 py-2.5 ${isToday ? "bg-today-col" : ""}`}
                >
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
                    <span className="nums text-[18px]">{formatDayNumber(day)}</span>
                  )}
                </div>
              );
            })}
          </div>

          {hasAllDay && (
            <div className="grid border-b border-line" style={COLUMNS}>
              <div className="flex items-start justify-end py-2 pr-2">
                <span className="text-[11px] uppercase tracking-[0.08em] text-muted">All day</span>
              </div>
              {days.map((day) => (
                <div
                  key={day}
                  className={`flex min-h-10 flex-col gap-1 border-l border-line p-1.5 ${
                    day === today ? "bg-today-col" : ""
                  }`}
                >
                  {(allDayByDay.get(day) ?? []).map((event) => (
                    <EventBlock
                      key={`${event.calendarId}-${event.id}`}
                      event={event}
                      color={colorOf.get(event.calendarId) ?? "#6b6b66"}
                      timeZone={timeZone}
                      clock={clock}
                      href={eventHref(event)}
                      selected={event.id === selectedId}
                      compact
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* The hour grid itself. */}
        <div className="grid" style={{ ...COLUMNS, height: hours.length * HOUR_PX }}>
          <div className="relative">
            {hours.map((hour, index) =>
              index === 0 ? null : (
                <span
                  key={hour}
                  className="nums absolute right-2 -translate-y-1/2 text-[11px] text-muted"
                  style={{ top: index * HOUR_PX }}
                >
                  {hourLabel(hour, clock)}
                </span>
              ),
            )}
          </div>

          {days.map((day) => (
            <div key={day} className={`relative border-l border-line ${day === today ? "bg-today-col" : ""}`}>
              {/* Empty hours. Tapping one starts a new event at that hour.
                  They sit outside the tab order on purpose: 112 extra links
                  would swamp keyboard navigation, and the New event button
                  reaches the same form. */}
              {hours.map((hour, index) => (
                <Link
                  key={hour}
                  href={slotHref(day, hourLabelValue(hour))}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-line-soft transition-colors duration-[var(--vk-dur-fast)] hover:bg-cell-hover"
                  style={{ top: index * HOUR_PX, height: HOUR_PX }}
                />
              ))}

              {(placedByDay.get(day) ?? []).map((item) => (
                <PositionedEvent
                  key={`${item.event.calendarId}-${item.event.id}`}
                  item={item}
                  startHour={startHour}
                  color={colorOf.get(item.event.calendarId) ?? "#6b6b66"}
                  timeZone={timeZone}
                  clock={clock}
                  href={eventHref(item.event)}
                  selected={item.event.id === selectedId}
                />
              ))}

              {day === today && <NowLine timeZone={timeZone} startHour={startHour} endHour={endHour} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- one event ---------- */

function PositionedEvent({
  item,
  startHour,
  color,
  timeZone,
  clock,
  href,
  selected,
}: {
  item: Placed;
  startHour: number;
  color: string;
  timeZone: string;
  clock: "12" | "24";
  href: string;
  selected: boolean;
}) {
  const { top, height } = boxOf(item, startHour);
  const width = 100 / item.lanes;

  return (
    <div className="absolute z-10 p-[2px]" style={{ top, height, left: `${item.lane * width}%`, width: `${width}%` }}>
      <EventBlock
        event={item.event}
        color={color}
        timeZone={timeZone}
        clock={clock}
        href={href}
        selected={selected}
        short={height < 46}
      />
    </div>
  );
}

function EventBlock({
  event,
  color,
  timeZone,
  clock,
  href,
  selected,
  compact,
  short,
}: {
  event: CalendarEvent;
  color: string;
  timeZone: string;
  clock: "12" | "24";
  href: string;
  selected: boolean;
  compact?: boolean; // in the all-day row
  short?: boolean; // too little height for a second line
}) {
  // Google hides events it treats as deleted, so cancellations are marked by
  // renaming instead. Either signal counts.
  const cancelled = event.status === "cancelled" || isCancelledTitle(event.summary);
  const title = event.summary ?? "(no title)";
  const when = cancelled ? "Cancelled" : formatEventTime(event, timeZone, clock);

  return (
    <Link
      href={href}
      data-selected={selected ? "" : undefined}
      aria-label={`${title}, ${when}, ${event.calendarName}`}
      style={{ ["--ev" as string]: color }}
      className={`ev flex h-full flex-col overflow-hidden rounded-event border px-2 ${
        compact ? "py-[3px]" : "py-1"
      } ${cancelled ? "opacity-60" : ""}`}
    >
      <span className={`truncate text-[13px] font-medium leading-[1.25] ${cancelled ? "line-through" : ""}`}>
        {title}
      </span>
      {!compact && !short && <span className="nums truncate text-[11px] text-on-event">{when}</span>}
      {!compact && !short && event.location && (
        <span className="truncate text-[11px] text-on-event">{event.location}</span>
      )}
    </Link>
  );
}
