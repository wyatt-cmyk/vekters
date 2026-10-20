// The calendar. A server component, so all calendar data is fetched on the
// server and the Google access token never reaches the browser.
//
// The URL says everything about what's on screen, so any view can be
// bookmarked, shared, or reached with the back button:
//   /?view=day&d=2026-10-20          a single day
//   /?view=month&d=2026-10-20        that month
//   /?d=2026-10-20&hide=sports       that week, Sports hidden
//   /?cal=…&ev=…                     an event open (see event-dialog.tsx)

import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { DeleteConfirm, EventForm } from "@/components/event-dialog";
import { EventPanel } from "@/components/event-panel";
import { Landing } from "@/components/landing";
import { MobileDay } from "@/components/mobile-day";
import { MonthGrid } from "@/components/month-grid";
import { Notice } from "@/components/notice";
import { SearchBox } from "@/components/search-box";
import { RightRail } from "@/components/right-rail";
import { SetupWarnings } from "@/components/setup-warnings";
import { Sidebar } from "@/components/sidebar";
import { WeekGrid } from "@/components/week-grid";
import { findEvent, loadRange } from "@/lib/calendar-data";
import { canWrite } from "@/lib/google-calendar";
import { snapshotOf } from "@/lib/proposals";
import { accentHex, colorsForCalendars, FALLBACK_PAINT, readSettings } from "@/lib/settings";
import { isTag, readSavedTags, TAG_LABELS, tagsForCalendars, type Tag } from "@/lib/tags";
import {
  addDays,
  addMonths,
  formatFullDate,
  formatMonthOnly,
  formatMonthTitle,
  formatWeekRange,
  groupByDay,
  isDayKey,
  startOfMonth,
  startOfWeek,
  weekDays,
  type DayKey,
} from "@/lib/week";

const VIEWS = ["day", "week", "month"] as const;
type View = (typeof VIEWS)[number];
const isView = (value: unknown): value is View => VIEWS.includes(value as View);

export default async function CalendarPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const text = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

  const view: View = isView(text("view")) ? (text("view") as View) : "week";
  const requested = isDayKey(text("d")) ? text("d")! : undefined;
  const hidden = parseHidden(params.hide);

  const settings = await readSettings();
  const weekStart = settings.weekStart;

  // One trip: work out the window from today and the time zone, then fetch it.
  const data = await loadRange(({ today }) => {
    const anchor = requested ?? today;
    // Day view still loads the week: the phone shows a strip of days above
    // the agenda, and the desktop grid simply renders one of them.
    if (view === "day") {
      const first = startOfWeek(anchor, weekStart);
      return { firstDay: first, lastDay: addDays(first, 6) };
    }
    if (view === "month") {
      const first = startOfWeek(startOfMonth(anchor), weekStart);
      return { firstDay: first, lastDay: addDays(first, 41) };
    }
    const first = startOfWeek(anchor, weekStart);
    return { firstDay: first, lastDay: addDays(first, 6) };
  });

  // Not signed in: show the front door rather than a bare sign-in box.
  if (data.status === "signed-out") return <Landing />;

  if (data.status === "error") {
    return (
      <main className="p-6">
        <Notice>Couldn&apos;t load your calendar. {data.message}</Notice>
      </main>
    );
  }

  const anchor = requested ?? data.today;
  const days = daysBetween(data.firstDay, data.lastDay);
  const gridDays = view === "day" ? [anchor] : days;
  const stripDays = weekDays(startOfWeek(anchor, weekStart));

  const tagOf = tagsForCalendars(data.calendars, await readSavedTags());
  const colorOf = colorsForCalendars(settings, tagOf);
  const accent = accentHex(settings);
  const query = (text("q") ?? "").trim().toLowerCase();
  const visibleEvents = data.events.filter(
    (event) =>
      !hidden.has(tagOf.get(event.calendarId) ?? "other") &&
      !settings.hiddenCalendars.includes(event.calendarId) &&
      (!query || (event.summary ?? "").toLowerCase().includes(query)),
  );
  const eventsByDay = groupByDay(visibleEvents, days, data.timeZone);

  // Only offer the "Other" chip when some calendar actually is Other.
  const chipTags: Tag[] = ["school", "sports"];
  if ([...tagOf.values()].includes("other")) chipTags.push("other");

  const showsToday = data.firstDay <= data.today && data.today <= data.lastDay;

  // Every link keeps the view, the date and the filters, so closing a dialog
  // or saving an event puts you back exactly where you were.
  const href = (changes: { d?: DayKey; view?: View } & Record<string, string | undefined> = {}) => {
    const { d, view: nextView, ...extra } = changes;
    return buildHref({ d: d ?? anchor, view: nextView ?? view, hidden, extra: { q: query || undefined, ...extra } });
  };
  const closeHref = href();

  // Which way the arrows move depends on the view.
  const step = (direction: 1 | -1) =>
    view === "month" ? addMonths(anchor, direction) : addDays(anchor, direction * (view === "day" ? 1 : 7));

  const writable = data.calendars.filter(canWrite);
  const calendarOptions = writable.map((c) => ({ id: c.id, name: c.summary }));
  const selected = text("cal") && text("ev") ? await findEvent(data, text("cal")!, text("ev")!) : null;

  const miniMonth = isDayKey(text("mc")) ? text("mc")! : anchor;

  // Selecting an event shows its details in the rail. The Assistant tab goes
  // back to the chat without dropping the selection.
  const eventParams = selected ? { cal: selected.calendarId, ev: selected.id } : {};
  const railTab = selected && text("tab") !== "chat" ? "details" : "assistant";

  return (
    // The chosen colour overrides the --color-accent token for this page, so
    // every bg-accent / text-accent below picks it up with no extra wiring.
    <div className="flex h-dvh flex-col" style={{ "--color-accent": accent } as React.CSSProperties}>
      {/* The sidebar is a lot of links to tab past. */}
      <a href="#calendar" className="skip-link">
        Skip to the calendar
      </a>

      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:flex">
          <Sidebar
            mode={data.mode}
            userName={data.userName}
            calendars={data.calendars.map((c) => ({
              id: c.id,
              name: c.summary,
              dot: (colorOf.get(c.id) ?? FALLBACK_PAINT).dot,
              hidden: settings.hiddenCalendars.includes(c.id),
            }))}
            active="calendar"
            todayHref={buildHref({ view, hidden })}
            mini={{
              month: miniMonth,
              today: data.today,
              weekStart,
              visibleFrom: data.firstDay,
              visibleTo: data.lastDay,
              accent,
              dayHref: (day) => href({ d: day, mc: undefined }),
              monthHref: (month) => href({ mc: month }),
            }}
          />
        </div>

        <main id="calendar" tabIndex={-1} className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Phone: an agenda for one day. An hour grid is unreadable at 390px. */}
          <div className="flex min-h-0 flex-1 flex-col md:hidden">
            <MobileDay
              stripDays={stripDays}
              anchor={anchor}
              today={data.today}
              eventsByDay={eventsByDay}
              timeZone={data.timeZone}
              clock={settings.clock}
              colorOf={colorOf}
              accent={accent}
              dayHref={(day) => href({ d: day })}
              eventHref={(event) => href({ cal: event.calendarId, ev: event.id })}
              newHref={href({ new: "1", date: anchor })}
              assistantHref={href({ tab: "chat" })}
            />
          </div>

          {/* Tablet and up: the calendar proper. */}
          <div className="hidden min-h-0 flex-1 flex-col md:flex">
          <header className="flex flex-wrap items-end gap-x-6 gap-y-4 px-6 pb-5 pt-6">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Your calendar</p>
              <h1 className="font-display mt-1 text-[clamp(2rem,3.4vw,3.375rem)] leading-none tracking-[-0.01em]">
                {view === "week" ? formatMonthTitle(gridDays[0], gridDays[gridDays.length - 1]) : formatMonthOnly(anchor)}
              </h1>
              <p className="nums mt-1.5 text-[13px] text-muted">
                {view === "day" ? formatFullDate(anchor) : view === "week" ? formatWeekRange(data.firstDay) : " "}
              </p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {!showsToday && (
                <Link
                  href={buildHref({ view, hidden })}
                  className="flex h-9 items-center rounded-control border border-line-strong bg-surface px-4 text-[14px] transition-colors duration-[var(--vk-dur-fast)] hover:bg-hover"
                >
                  Today
                </Link>
              )}

              <div className="flex">
                <Arrow href={href({ d: step(-1) })} label={`Previous ${view}`} side="left">
                  <ChevronLeft size={17} strokeWidth={1.8} />
                </Arrow>
                <Arrow href={href({ d: step(1) })} label={`Next ${view}`} side="right">
                  <ChevronRight size={17} strokeWidth={1.8} />
                </Arrow>
              </div>

              <div className="flex rounded-control bg-nav-active p-[3px]" role="group" aria-label="Choose a view">
                {VIEWS.map((option) => (
                  <Link
                    key={option}
                    href={href({ view: option })}
                    aria-current={view === option ? "true" : undefined}
                    className={`flex h-[30px] items-center rounded-[6px] px-3 text-[13px] capitalize transition-colors duration-[var(--vk-dur-fast)] ${
                      view === option ? "bg-surface text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    {option}
                  </Link>
                ))}
              </div>

              <SearchBox initial={text("q") ?? ""} />

              {chipTags.map((tag) => (
                <FilterChip
                  key={tag}
                  tag={tag}
                  hidden={hidden}
                  hrefFor={(next) => buildHref({ d: anchor, view, hidden: next })}
                />
              ))}

              <Link
                href={href({ new: "1", date: anchor })}
                className="flex h-9 items-center gap-2 rounded-control bg-ink px-4 text-[14px] text-white transition-colors duration-[var(--vk-dur-fast)] hover:bg-black"
              >
                <Plus size={15} strokeWidth={2} />
                New event
              </Link>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-6">
            {text("error") && <Notice>{text("error")}</Notice>}
            <SetupWarnings missingScopes={data.missingScopes} failedCalendars={data.failedCalendars} />
            {data.mode === "demo" && (
              <Notice>
                <strong>Demo mode.</strong> These are sample events. Add your Google keys to <code>.env.local</code>{" "}
                (see SETUP.md) to see your real calendar.
              </Notice>
            )}

            {view === "month" ? (
              <MonthGrid
                days={gridDays}
                month={anchor}
                eventsByDay={eventsByDay}
                today={data.today}
                timeZone={data.timeZone}
                clock={settings.clock}
                colorOf={colorOf}
                accent={accent}
                weekStart={weekStart}
                eventHref={(event) => href({ cal: event.calendarId, ev: event.id })}
                dayHref={(day) => href({ d: day, view: "day" })}
                selectedId={selected?.id}
              />
            ) : (
              <WeekGrid
                days={gridDays}
                eventsByDay={eventsByDay}
                today={data.today}
                timeZone={data.timeZone}
                colorOf={colorOf}
                clock={settings.clock}
                accent={accent}
                eventHref={(event) => href({ cal: event.calendarId, ev: event.id })}
                slotHref={(day, time) => href({ new: "1", date: day, at: time })}
                dayHref={view === "week" ? (day) => href({ d: day, view: "day" }) : undefined}
                selectedId={selected?.id}
              />
            )}

            <p className="shrink-0 text-[12px] text-muted">
              {query
                ? `${visibleEvents.length} ${visibleEvents.length === 1 ? "event" : "events"} matching “${query}”. Times in ${data.timeZone}.`
                : `Times shown in ${data.timeZone}.`}
            </p>
          </div>
          </div>
        </main>

        <RightRail
          open={Boolean(selected) || text("tab") === "chat"}
          closeHref={closeHref}
          viewing={{ date: anchor, view }}
          tab={railTab}
          assistantHref={href({ ...eventParams, tab: "chat" })}
          detailsHref={selected ? href(eventParams) : undefined}
          details={
            selected && (
              <EventPanel
                event={selected}
                paint={colorOf.get(selected.calendarId) ?? FALLBACK_PAINT}
                timeZone={data.timeZone}
                editHref={href({ ...eventParams, edit: "1" })}
                deleteHref={href({ ...eventParams, del: "1" })}
                canEdit={writable.some((c) => c.id === selected.calendarId)}
              />
            )
          }
        />
      </div>

      {/* New event */}
      {text("new") === "1" && calendarOptions.length > 0 && (
        <EventForm
          calendars={calendarOptions}
          closeHref={closeHref}
          returnTo={closeHref}
          defaultCalendarId={(writable.find((c) => c.primary) ?? writable[0])?.id}
          defaultDate={text("date") ?? anchor}
          defaultStart={text("at")}
        />
      )}

      {/* An existing event: details, the edit form, or the delete check */}
      {selected && text("del") === "1" && (
        <DeleteConfirm
          event={selected}
          timeZone={data.timeZone}
          backHref={href({ cal: selected.calendarId, ev: selected.id })}
          returnTo={closeHref}
        />
      )}

      {/* Editing stays a dialog: a form needs the focus, and the rail is narrow. */}
      {selected && text("del") !== "1" && text("edit") === "1" && (
        <EventForm
          calendars={calendarOptions}
          closeHref={href(eventParams)}
          returnTo={closeHref}
          defaultDate={anchor}
          event={{
            id: selected.id,
            calendarId: selected.calendarId,
            when: snapshotOf(selected, data.timeZone),
            notes: selected.description ?? "",
          }}
        />
      )}

    </div>
  );
}

/* ---------- helpers for this page ---------- */

function daysBetween(first: DayKey, last: DayKey) {
  const days: DayKey[] = [];
  for (let day = first; day <= last; day = addDays(day, 1)) days.push(day);
  return days;
}

// "?hide=sports,other" -> Set { "sports", "other" }. Unknown values are ignored.
function parseHidden(value: string | string[] | undefined): Set<Tag> {
  const text = Array.isArray(value) ? value.join(",") : (value ?? "");
  return new Set(text.split(",").filter(isTag));
}

// Builds a URL. Leaving `d` out means today; leaving `view` out means the week.
function buildHref({
  d,
  view,
  hidden,
  extra = {},
}: {
  d?: DayKey;
  view?: View;
  hidden: Set<Tag>;
  extra?: Record<string, string | undefined>;
}) {
  const params = new URLSearchParams();
  if (d) params.set("d", d);
  if (view && view !== "week") params.set("view", view);
  if (hidden.size > 0) params.set("hide", [...hidden].join(","));
  for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

// The two arrows sit together as one control, sharing their middle border.
function Arrow({
  href,
  label,
  side,
  children,
}: {
  href: string;
  label: string;
  side: "left" | "right";
  children: React.ReactNode;
}) {
  const corners = side === "left" ? "rounded-l-control border-r-0" : "rounded-r-control";
  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex size-9 items-center justify-center border border-line-strong bg-surface transition-colors duration-[var(--vk-dur-fast)] hover:bg-hover ${corners}`}
    >
      {children}
    </Link>
  );
}

// A dot in the category colour, so the chip reads before you read it.
const DOT: Record<Tag, string> = { school: "bg-school", sports: "bg-sports", other: "bg-muted" };

// A chip is a link that toggles its tag in the "hide" list.
function FilterChip({
  tag,
  hidden,
  hrefFor,
}: {
  tag: Tag;
  hidden: Set<Tag>;
  hrefFor: (next: Set<Tag>) => string;
}) {
  const isShown = !hidden.has(tag);
  const next = new Set(hidden);
  if (isShown) next.add(tag);
  else next.delete(tag);

  return (
    <Link
      href={hrefFor(next)}
      aria-label={`${isShown ? "Hide" : "Show"} ${TAG_LABELS[tag]} events`}
      className={`flex h-9 items-center gap-2 rounded-control border px-3.5 text-[14px] transition-colors duration-[var(--vk-dur-fast)] ${
        isShown ? "border-line-strong bg-surface hover:bg-hover" : "border-line bg-bg text-faint"
      }`}
    >
      <span aria-hidden="true" className={`size-2.5 rounded-[3px] ${isShown ? DOT[tag] : "bg-line-strong"}`} />
      {TAG_LABELS[tag]}
    </Link>
  );
}
