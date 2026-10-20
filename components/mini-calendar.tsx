// The small month in the sidebar. Jumps to any date, and shades the days the
// main view is currently showing so you can see where you are.

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addMonths,
  formatDayNumber,
  formatMonthOnly,
  sameMonth,
  startOfMonth,
  startOfWeek,
  weekdayInitials,
  type DayKey,
} from "@/lib/week";

type Props = {
  month: DayKey; // any date in the month to draw
  today: DayKey;
  weekStart: "mon" | "sun";
  // The span the main view is showing, so it can be shaded.
  visibleFrom: DayKey;
  visibleTo: DayKey;
  accent: string;
  dayHref: (day: DayKey) => string; // jump the main view to this date
  monthHref: (month: DayKey) => string; // move the mini calendar itself
};

export function MiniCalendar({
  month,
  today,
  weekStart,
  visibleFrom,
  visibleTo,
  accent,
  dayHref,
  monthHref,
}: Props) {
  const first = startOfWeek(startOfMonth(month), weekStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));

  return (
    <section aria-label="Pick a date">
      <div className="mb-2 flex items-center gap-1">
        <h2 className="flex-1 text-[13px] font-medium">{formatMonthOnly(month)}</h2>
        <Link
          href={monthHref(addMonths(month, -1))}
          aria-label="Previous month"
          className="grid size-7 place-items-center rounded-control text-muted transition-colors duration-[var(--vk-dur-fast)] hover:bg-hover hover:text-ink"
        >
          <ChevronLeft size={15} strokeWidth={1.8} />
        </Link>
        <Link
          href={monthHref(addMonths(month, 1))}
          aria-label="Next month"
          className="grid size-7 place-items-center rounded-control text-muted transition-colors duration-[var(--vk-dur-fast)] hover:bg-hover hover:text-ink"
        >
          <ChevronRight size={15} strokeWidth={1.8} />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {weekdayInitials(weekStart).map((initial, index) => (
          <span key={index} className="py-1 text-center text-[10px] font-medium uppercase text-muted">
            {initial}
          </span>
        ))}

        {days.map((day) => {
          const outside = !sameMonth(day, month);
          const isToday = day === today;
          const inView = day >= visibleFrom && day <= visibleTo;

          return (
            <Link
              key={day}
              href={dayHref(day)}
              aria-current={isToday ? "date" : undefined}
              className={`nums grid h-7 place-items-center text-[12px] transition-colors duration-[var(--vk-dur-fast)] ${
                inView && !isToday ? "bg-nav-active" : ""
              } ${outside ? "text-faint" : ""} ${isToday ? "" : "hover:bg-hover"}`}
            >
              {isToday ? (
                <span
                  className="grid size-[22px] place-items-center rounded-full text-white"
                  style={{ backgroundColor: accent }}
                >
                  {formatDayNumber(day)}
                </span>
              ) : (
                formatDayNumber(day)
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
