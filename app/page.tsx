// The week view (home page). It's a server component, so all calendar data is
// fetched on the server and the Google access token never reaches the browser.
//
// The URL controls what's shown, so every view can be bookmarked or shared:
//   /?week=2026-09-28               -> the week containing that date
//   /?week=2026-09-28&hide=sports   -> same week with Sports events hidden

import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, FileInput, Minus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ChatPanel } from "@/components/chat-panel";
import { Notice } from "@/components/notice";
import { SetupWarnings } from "@/components/setup-warnings";
import { SignInScreen } from "@/components/sign-in-screen";
import { WeekGrid } from "@/components/week-grid";
import { loadWeek } from "@/lib/calendar-data";
import { isTag, readSavedTags, TAG_LABELS, tagsForCalendars, type Tag } from "@/lib/tags";
import { addDays, formatWeekRange, groupByDay, weekDays, type DayKey } from "@/lib/week";

export default async function WeekPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const requestedWeek = typeof params.week === "string" ? params.week : undefined;
  const hidden = parseHidden(params.hide);

  const data = await loadWeek(requestedWeek);

  if (data.status === "signed-out") return <SignInScreen expired={data.expired} />;

  const header = (
    <AppHeader mode={data.mode} userName={data.userName} link={{ href: "/calendars", label: "Calendars" }} />
  );

  if (data.status === "error") {
    return (
      <>
        {header}
        <main className="p-4">
          <Notice>Couldn&apos;t load your calendar. {data.message}</Notice>
        </main>
      </>
    );
  }

  // Work out each calendar's tag, then drop events from hidden tags.
  const tagOf = tagsForCalendars(data.calendars, await readSavedTags());
  const visibleEvents = data.events.filter((event) => !hidden.has(tagOf.get(event.calendarId) ?? "other"));
  const days = weekDays(data.monday);
  const eventsByDay = groupByDay(visibleEvents, days, data.timeZone);

  // Only show the "Other" chip if some calendar is actually tagged Other.
  const chipTags: Tag[] = ["school", "sports"];
  if ([...tagOf.values()].includes("other")) chipTags.push("other");

  const isThisWeek = days.includes(data.today);

  // On wide screens (1280px+, like a Chromebook): week on the left, chat on the
  // right, each scrolling on its own. On narrower screens: chat on top.
  return (
    <div className="flex flex-1 flex-col xl:h-dvh">
      {header}
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 xl:overflow-y-auto">
          {/* Toolbar: the date leads, controls sit to the right of it. */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex">
              <NavLink href={weekHref(addDays(data.monday, -7), hidden)} label="Previous week">
                <ChevronLeft size={20} strokeWidth={2.25} />
              </NavLink>
              <NavLink href={weekHref(addDays(data.monday, 7), hidden)} label="Next week">
                <ChevronRight size={20} strokeWidth={2.25} />
              </NavLink>
            </div>

            <h1 className="font-display text-3xl leading-none tracking-tight">{formatWeekRange(data.monday)}</h1>

            {!isThisWeek && (
              <Link
                href={weekHref(undefined, hidden)}
                className="flex min-h-11 items-center border border-line bg-surface px-4 text-sm font-semibold hover:border-ink"
              >
                This week
              </Link>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2" aria-label="Show or hide calendars">
              {chipTags.map((tag) => (
                <FilterChip key={tag} tag={tag} monday={data.monday} hidden={hidden} />
              ))}
              <Link
                href="/import"
                className="flex min-h-11 items-center gap-2 bg-ink px-5 font-semibold text-white hover:bg-ink/90"
              >
                <FileInput size={16} strokeWidth={2.25} />
                Import
              </Link>
            </div>
          </div>

          <SetupWarnings missingScopes={data.missingScopes} failedCalendars={data.failedCalendars} />

          {data.mode === "demo" && (
            <Notice>
              <strong>Demo mode.</strong> These are sample events. Add your Google keys to <code>.env.local</code> (see
              SETUP.md) to see your real calendar.
            </Notice>
          )}

          <WeekGrid days={days} eventsByDay={eventsByDay} tagOf={tagOf} today={data.today} timeZone={data.timeZone} />

          <p className="shrink-0 text-sm text-muted">
            Times in {data.timeZone}. Colours wrong?{" "}
            <Link href="/calendars" className="font-semibold text-ink underline underline-offset-2">
              Tag your calendars
            </Link>
            .
          </p>
        </main>

        <ChatPanel />
      </div>
    </div>
  );
}

/* ---------- helpers for this page ---------- */

// "?hide=sports,other" -> Set { "sports", "other" }. Unknown values are ignored.
function parseHidden(value: string | string[] | undefined): Set<Tag> {
  const text = Array.isArray(value) ? value.join(",") : (value ?? "");
  return new Set(text.split(",").filter(isTag));
}

// Builds a URL for a week + hidden tags. No week means "this week".
function weekHref(week: DayKey | undefined, hidden: Set<Tag>) {
  const params = new URLSearchParams();
  if (week) params.set("week", week);
  if (hidden.size > 0) params.set("hide", [...hidden].join(","));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function NavLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-11 items-center justify-center border border-line bg-surface hover:border-ink -ml-px first:ml-0"
    >
      {children}
    </Link>
  );
}

const CHIP_ON: Record<Tag, string> = {
  school: "border-school bg-school-fill text-school",
  sports: "border-sports bg-sports-fill text-sports",
  other: "border-ink bg-surface text-ink",
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
      className={`flex min-h-11 items-center gap-2 border px-4 text-sm font-semibold ${
        isShown ? CHIP_ON[tag] : "border-line bg-surface text-muted"
      }`}
    >
      {isShown ? <Check size={15} strokeWidth={3} /> : <Minus size={15} strokeWidth={3} />}
      {TAG_LABELS[tag]}
    </Link>
  );
}
