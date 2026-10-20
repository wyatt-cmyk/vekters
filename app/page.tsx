// The week view (home page). It's a server component, so all calendar data is
// fetched on the server and the Google access token never reaches the browser.
//
// The URL controls what's shown, so every view can be bookmarked or shared:
//   /?week=2026-09-28               -> the week containing that date
//   /?week=2026-09-28&hide=sports   -> same week with Sports events hidden

import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";
import { Notice } from "@/components/notice";
import { SetupWarnings } from "@/components/setup-warnings";
import { Landing } from "@/components/landing";
import { DeleteConfirm, EventDetail, EventForm } from "@/components/event-dialog";
import { Sidebar } from "@/components/sidebar";
import { WeekGrid } from "@/components/week-grid";
import { findEvent, loadWeek } from "@/lib/calendar-data";
import { canWrite } from "@/lib/google-calendar";
import { snapshotOf } from "@/lib/proposals";
import { accentHex, colorsForCalendars, readSettings } from "@/lib/settings";
import { isTag, readSavedTags, TAG_LABELS, tagsForCalendars, type Tag } from "@/lib/tags";
import { addDays, formatMonthTitle, formatWeekRange, groupByDay, weekDays, type DayKey } from "@/lib/week";

export default async function WeekPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const requestedWeek = typeof params.week === "string" ? params.week : undefined;
  const hidden = parseHidden(params.hide);
  const text = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

  const settings = await readSettings();
  const data = await loadWeek(requestedWeek, settings.weekStart);

  // Not signed in: show the front door rather than a bare sign-in box.
  if (data.status === "signed-out") return <Landing />;

  if (data.status === "error") {
    return (
      <main className="p-6">
        <Notice>Couldn&apos;t load your calendar. {data.message}</Notice>
      </main>
    );
  }

  // Work out each calendar's tag, then drop events from hidden tags.
  const tagOf = tagsForCalendars(data.calendars, await readSavedTags());
  const colorOf = colorsForCalendars(settings, tagOf);
  const accent = accentHex(settings);
  const visibleEvents = data.events.filter((event) => !hidden.has(tagOf.get(event.calendarId) ?? "other"));
  const days = weekDays(data.monday);
  const eventsByDay = groupByDay(visibleEvents, days, data.timeZone);

  // Only show the "Other" chip if some calendar is actually tagged Other.
  const chipTags: Tag[] = ["school", "sports"];
  if ([...tagOf.values()].includes("other")) chipTags.push("other");

  const isThisWeek = days.includes(data.today);

  // Every link keeps the week and the filters, so closing a dialog or saving an
  // event puts you back exactly where you were.
  const base = (extra: Record<string, string> = {}) => buildHref(requestedWeek ? data.monday : undefined, hidden, extra);
  const closeHref = base();

  const writable = data.calendars.filter(canWrite);
  const calendarOptions = writable.map((c) => ({ id: c.id, name: c.summary }));
  const selected =
    text("cal") && text("ev") ? await findEvent(data, text("cal")!, text("ev")!) : null;

  const calendarRows = data.calendars.map((c) => ({
    id: c.id,
    name: c.summary,
    color: colorOf.get(c.id) ?? "#6b6b66",
  }));

  // The shell the design fixes: 252px sidebar, flexible calendar, 316px rail.
  // The assistant lives in the rail; the event details panel joins it there in
  // a later phase, and until then details stay in the dialog below.
  return (
    // The chosen colour overrides the --color-accent token for this page, so
    // every bg-accent / text-accent below picks it up with no extra wiring.
    <div className="flex h-dvh flex-col" style={{ "--color-accent": accent } as React.CSSProperties}>
      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:flex">
          <Sidebar
            mode={data.mode}
            userName={data.userName}
            calendars={calendarRows}
            active="calendar"
            todayHref={buildHref(undefined, hidden)}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex flex-wrap items-end gap-x-6 gap-y-4 px-6 pb-5 pt-6">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Your calendar</p>
              <h1 className="font-display mt-1 text-[clamp(2rem,3.4vw,3.375rem)] leading-none tracking-[-0.01em]">
                {formatMonthTitle(days[0], days[6])}
              </h1>
              <p className="nums mt-1.5 text-[13px] text-muted">{formatWeekRange(data.monday)}</p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {!isThisWeek && (
                <Link
                  href={weekHref(undefined, hidden)}
                  className="flex h-9 items-center rounded-control border border-line-strong bg-surface px-4 text-[14px] transition-colors duration-[var(--vk-dur-fast)] hover:bg-hover"
                >
                  Today
                </Link>
              )}
              <div className="flex">
                <NavLink href={weekHref(addDays(data.monday, -7), hidden)} label="Previous week" side="left">
                  <ChevronLeft size={17} strokeWidth={1.8} />
                </NavLink>
                <NavLink href={weekHref(addDays(data.monday, 7), hidden)} label="Next week" side="right">
                  <ChevronRight size={17} strokeWidth={1.8} />
                </NavLink>
              </div>

              {chipTags.map((tag) => (
                <FilterChip key={tag} tag={tag} monday={data.monday} hidden={hidden} />
              ))}

              <Link
                href={base({ new: "1" })}
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

            <WeekGrid
              days={days}
              eventsByDay={eventsByDay}
              today={data.today}
              timeZone={data.timeZone}
              colorOf={colorOf}
              clock={settings.clock}
              accent={accent}
              eventHref={(event) => base({ cal: event.calendarId, ev: event.id })}
              slotHref={(day, time) => base({ new: "1", date: day, at: time })}
              selectedId={selected?.id}
            />

            <p className="shrink-0 text-[12px] text-muted">Times shown in {data.timeZone}.</p>
          </div>
        </main>

        <ChatPanel />
      </div>

      {/* New event */}
      {text("new") === "1" && calendarOptions.length > 0 && (
        <EventForm
          calendars={calendarOptions}
          closeHref={closeHref}
          returnTo={closeHref}
          defaultCalendarId={(writable.find((c) => c.primary) ?? writable[0])?.id}
          defaultDate={text("date") ?? data.today}
          defaultStart={text("at")}
        />
      )}

      {/* An existing event: details, or the edit form */}
      {selected && text("del") === "1" && (
        <DeleteConfirm
          event={selected}
          timeZone={data.timeZone}
          backHref={base({ cal: selected.calendarId, ev: selected.id })}
          returnTo={closeHref}
        />
      )}

      {selected &&
        text("del") !== "1" &&
        (text("edit") === "1" ? (
          <EventForm
            calendars={calendarOptions}
            closeHref={base({ cal: selected.calendarId, ev: selected.id })}
            returnTo={closeHref}
            defaultDate={data.today}
            event={{
              id: selected.id,
              calendarId: selected.calendarId,
              when: snapshotOf(selected, data.timeZone),
              notes: "",
            }}
          />
        ) : (
          <EventDetail
            event={selected}
            tag={tagOf.get(selected.calendarId) ?? "other"}
            timeZone={data.timeZone}
            closeHref={closeHref}
            editHref={base({ cal: selected.calendarId, ev: selected.id, edit: "1" })}
            deleteHref={base({ cal: selected.calendarId, ev: selected.id, del: "1" })}
            canEdit={writable.some((c) => c.id === selected.calendarId)}
          />
        ))}
    </div>
  );
}

/* ---------- helpers for this page ---------- */

// "?hide=sports,other" -> Set { "sports", "other" }. Unknown values are ignored.
function parseHidden(value: string | string[] | undefined): Set<Tag> {
  const text = Array.isArray(value) ? value.join(",") : (value ?? "");
  return new Set(text.split(",").filter(isTag));
}

// Builds a URL for a week + hidden tags, plus anything else (the dialog params).
// No week means "this week".
function buildHref(week: DayKey | undefined, hidden: Set<Tag>, extra: Record<string, string> = {}) {
  const params = new URLSearchParams();
  if (week) params.set("week", week);
  if (hidden.size > 0) params.set("hide", [...hidden].join(","));
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

const weekHref = (week: DayKey | undefined, hidden: Set<Tag>) => buildHref(week, hidden);

// The two arrows sit together as one control, sharing their middle border.
function NavLink({
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

// A dot in the category colour, so the chip reads even before you read it.
const DOT: Record<Tag, string> = {
  school: "bg-school",
  sports: "bg-sports",
  other: "bg-muted",
};

// A chip is a link that toggles its tag in the "hide" list.
function FilterChip({ tag, monday, hidden }: { tag: Tag; monday: DayKey; hidden: Set<Tag> }) {
  const isShown = !hidden.has(tag);
  const next = new Set(hidden);
  if (isShown) next.add(tag);
  else next.delete(tag);

  return (
    <Link
      href={weekHref(monday, next)}
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
