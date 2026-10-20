// Lists every calendar on the account and lets you tag it School, Sports, or Other.
// The tag decides the event color in the week view.

import { setCalendarTag } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Notice } from "@/components/notice";
import { SetupWarnings } from "@/components/setup-warnings";
import { SignInScreen } from "@/components/sign-in-screen";
import { loadCalendars } from "@/lib/calendar-data";
import { readSavedTags, TAG_LABELS, TAGS, tagsForCalendars, type Tag } from "@/lib/tags";

export default async function CalendarsPage() {
  const data = await loadCalendars();
  if (data.status === "signed-out") return <SignInScreen expired={data.expired} />;

  const header = <AppHeader mode={data.mode} userName={data.userName} link={{ href: "/", label: "Week" }} />;

  if (data.status === "error") {
    return (
      <>
        {header}
        <main className="p-4">
          <Notice>Couldn&apos;t load your calendars. {data.message}</Notice>
        </main>
      </>
    );
  }

  const tagOf = tagsForCalendars(data.calendars, await readSavedTags());

  return (
    <>
      {header}
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Your calendars</h1>
        <p className="mb-6 mt-2 max-w-prose text-muted">
          Tag each calendar so its events get the right colour in the week. Untagged calendars are guessed from their name.
        </p>

        <div className="mb-4 empty:mb-0">
          <SetupWarnings missingScopes={data.missingScopes} />
        </div>

        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {data.calendars.map((cal) => (
            <li key={cal.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: cal.backgroundColor ?? "#999" }} />
              <span className="min-w-0 flex-1 font-semibold">
                {cal.summary}
                {cal.primary && <span className="ml-2 text-sm font-normal text-muted">(primary)</span>}
              </span>

              {/* One form, three submit buttons. The clicked button's name/value ("tag"="school") is sent. */}
              <form action={setCalendarTag} className="flex overflow-hidden rounded-full border border-line-strong">
                <input type="hidden" name="calendarId" value={cal.id} />
                {TAGS.map((tag) => (
                  <TagButton key={tag} tag={tag} selected={tagOf.get(cal.id) === tag} />
                ))}
              </form>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

const SELECTED: Record<Tag, string> = {
  school: "bg-school text-white",
  sports: "bg-sports text-white",
  other: "bg-ink text-white",
};

function TagButton({ tag, selected }: { tag: Tag; selected: boolean }) {
  return (
    <button
      name="tag"
      value={tag}
      aria-pressed={selected}
      className={`min-h-11 border-l border-line px-4 text-sm font-semibold first:border-l-0 ${
        selected ? SELECTED[tag] : "bg-surface text-muted hover:bg-bg hover:text-ink"
      }`}
    >
      {TAG_LABELS[tag]}
    </button>
  );
}
