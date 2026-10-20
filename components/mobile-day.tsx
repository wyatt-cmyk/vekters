// The phone layout, following vekters-handoff/design/Mobile.dc.html: the
// monogram, a week of day pills, and the chosen day as an agenda.
//
// An hour grid is unreadable at 390px, so below 768px the week becomes a list
// where each event's height still reflects how long it runs.

import Image from "next/image";
import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";
import type { CalendarEvent } from "@/lib/google-calendar";
import { isCancelledTitle } from "@/lib/proposals";
import { FALLBACK_PAINT, type CalendarPaint } from "@/lib/settings";
import { isAllDay, minutesOn } from "@/lib/week-layout";
import { formatDayNumber, formatEventTime, formatMonthOnly, formatWeekday, type DayKey } from "@/lib/week";

type Props = {
  stripDays: DayKey[]; // the week around the chosen day
  anchor: DayKey; // the day being shown
  today: DayKey;
  eventsByDay: Map<DayKey, CalendarEvent[]>;
  timeZone: string;
  clock: "12" | "24";
  colorOf: Map<string, CalendarPaint>;
  accent: string;
  dayHref: (day: DayKey) => string;
  eventHref: (event: CalendarEvent) => string;
  newHref: string;
  assistantHref: string;
};

export function MobileDay({
  stripDays,
  anchor,
  today,
  eventsByDay,
  timeZone,
  clock,
  colorOf,
  accent,
  dayHref,
  eventHref,
  newHref,
  assistantHref,
}: Props) {
  const events = eventsByDay.get(anchor) ?? [];
  const allDay = events.filter(isAllDay);
  const timed = events
    .filter((event) => !isAllDay(event))
    .map((event) => ({ event, ...minutesOn(event, anchor, timeZone) }))
    .sort((a, b) => a.startMin - b.startMin);

  const dayTitle =
    anchor === today
      ? `Today, ${formatWeekday(anchor)} ${formatDayNumber(anchor)}`
      : `${formatWeekday(anchor)} ${formatDayNumber(anchor)}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-4 px-5 pb-3 pt-5">
        <div className="flex items-center justify-between">
          <Image src="/brand/vekters-v.png" alt="Vekters" width={220} height={172} priority className="h-[26px] w-auto" />
          <Link
            href={dayHref(today)}
            className="flex h-9 items-center rounded-control border border-line-strong bg-surface px-4 text-[14px]"
          >
            Today
          </Link>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Your calendar</p>
          <h1 className="font-display mt-1 text-[34px] leading-none tracking-[-0.01em]">
            {formatMonthOnly(anchor).split(" ")[0]} <em className="not-italic text-muted">{anchor.slice(0, 4)}</em>
          </h1>
        </div>

        {/* A week of days. The dot means that day has something on it. */}
        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1" role="group" aria-label="Choose a day">
          {stripDays.map((day) => {
            const chosen = day === anchor;
            const isToday = day === today;
            const busy = (eventsByDay.get(day) ?? []).length > 0;

            return (
              <Link
                key={day}
                href={dayHref(day)}
                aria-current={chosen ? "date" : undefined}
                aria-label={`${formatWeekday(day)} ${formatDayNumber(day)}`}
                className={`flex min-w-[46px] flex-1 flex-col items-center gap-1 rounded-control py-2 transition-colors duration-[var(--vk-dur-fast)] ${
                  chosen ? "text-white" : isToday ? "bg-nav-active" : ""
                }`}
                style={chosen ? { backgroundColor: accent } : undefined}
              >
                <span className={`text-[11px] font-medium tracking-[0.06em] ${chosen ? "text-white/70" : "text-muted"}`}>
                  {formatWeekday(day).toUpperCase()}
                </span>
                <span className="nums text-[18px]">{formatDayNumber(day)}</span>
                <span
                  aria-hidden="true"
                  className={`size-1 rounded-full ${busy ? (chosen ? "bg-white" : "bg-faint") : "bg-transparent"}`}
                />
              </Link>
            );
          })}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-28 pt-2">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[24px]">{dayTitle}</span>
          <span className="text-[12px] text-muted">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
        </div>

        {allDay.map((event) => (
          <AgendaCard
            key={`${event.calendarId}-${event.id}`}
            event={event}
            paint={colorOf.get(event.calendarId) ?? FALLBACK_PAINT}
            href={eventHref(event)}
            when="All day"
          />
        ))}

        {timed.map(({ event, startMin, endMin }) => (
          <div key={`${event.calendarId}-${event.id}`} className="flex items-stretch gap-3.5">
            <div className="flex w-[52px] shrink-0 flex-col pt-3">
              <span className="nums text-[13px] font-medium">{clockFace(startMin, clock).value}</span>
              <span className="text-[11px] text-muted">{clockFace(startMin, clock).suffix}</span>
            </div>
            <AgendaCard
              event={event}
              paint={colorOf.get(event.calendarId) ?? FALLBACK_PAINT}
              href={eventHref(event)}
              when={formatEventTime(event, timeZone, clock)}
              minHeight={Math.max(64, ((endMin - startMin) / 60) * 56)}
            />
          </div>
        ))}

        {events.length === 0 && (
          <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-[14px] text-muted">
            A clear day.
          </p>
        )}
      </div>

      {/* The two things you actually do on a phone. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-end gap-3 p-5">
        <Link
          href={assistantHref}
          aria-label="Open the assistant"
          className="pointer-events-auto grid size-14 place-items-center rounded-full border border-line-strong bg-surface shadow-lg"
        >
          <MessageSquare size={21} strokeWidth={1.7} />
        </Link>
        <Link
          href={newHref}
          aria-label="New event"
          className="pointer-events-auto grid size-14 place-items-center rounded-full text-white shadow-lg"
          style={{ backgroundColor: accent }}
        >
          <Plus size={22} strokeWidth={1.9} />
        </Link>
      </div>
    </div>
  );
}

function AgendaCard({
  event,
  paint,
  href,
  when,
  minHeight,
}: {
  event: CalendarEvent;
  paint: CalendarPaint;
  href: string;
  when: string;
  minHeight?: number;
}) {
  const cancelled = event.status === "cancelled" || isCancelledTitle(event.summary);
  const title = event.summary ?? "(no title)";

  return (
    <Link
      href={href}
      aria-label={`${title}, ${when}, ${event.calendarName}`}
      style={{ ["--ev-bg" as string]: paint.bg, ["--ev-dot" as string]: paint.dot, minHeight }}
      className={`ev flex flex-1 flex-col justify-center gap-0.5 rounded-card border px-4 py-3 ${
        cancelled ? "opacity-60" : ""
      }`}
    >
      <span className={`text-[14px] font-medium ${cancelled ? "line-through" : ""}`}>{title}</span>
      <span className="nums text-[12px] text-on-event">{cancelled ? "Cancelled" : when}</span>
      {event.location && <span className="truncate text-[12px] text-on-event">{event.location}</span>}
    </Link>
  );
}

// "6:30" + "AM", or "18:30" with nothing after it.
function clockFace(minutes: number, clock: "12" | "24") {
  const hours = Math.floor(minutes / 60);
  const mins = String(minutes % 60).padStart(2, "0");
  if (clock === "24") return { value: `${String(hours).padStart(2, "0")}:${mins}`, suffix: "" };
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return { value: minutes % 60 === 0 ? `${hour12}` : `${hour12}:${mins}`, suffix: hours < 12 ? "AM" : "PM" };
}
