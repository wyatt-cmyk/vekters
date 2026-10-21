// Settings: how the app looks and behaves, then one row per calendar for its
// category and colour. Every control is a plain form posting to a server
// action, so it all works without JavaScript.

import { Check } from "lucide-react";
import { saveSettings, setCalendarColor, setCalendarTag } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Notice } from "@/components/notice";
import { SetupWarnings } from "@/components/setup-warnings";
import { NotConfigured, SignInScreen } from "@/components/sign-in-screen";
import { loadCalendars } from "@/lib/calendar-data";
import {
  ACCENTS,
  CALENDAR_COLORS,
  colorFor,
  readSettings,
  type AccentId,
  type ColorId,
  type Settings,
} from "@/lib/settings";
import { readSavedTags, TAG_LABELS, TAGS, tagsForCalendars, type Tag } from "@/lib/tags";

export default async function SettingsPage() {
  const data = await loadCalendars();
  if (data.status === "signed-out")
    return data.notConfigured ? <NotConfigured /> : <SignInScreen expired={data.expired} />;

  const header = <AppHeader mode={data.mode} userName={data.userName} link={{ href: "/", label: "Week" }} />;

  if (data.status === "error") {
    return (
      <>
        {header}
        <main className="p-6">
          <Notice>Couldn&apos;t load your calendars. {data.message}</Notice>
        </main>
      </>
    );
  }

  const settings = await readSettings();
  const tagOf = tagsForCalendars(data.calendars, await readSavedTags());

  return (
    <>
      {header}
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Settings</h1>
        <p className="mb-6 mt-2 max-w-prose text-muted">
          These are yours alone. They&apos;re saved in this browser, so if you also use the app on your phone, set them
          there too.
        </p>

        <div className="mb-6 empty:mb-0">
          <SetupWarnings missingScopes={data.missingScopes} />
        </div>

        {/* ---------- how it looks ---------- */}
        <form action={saveSettings} className="mb-10 rounded-card border border-line bg-surface p-5">
          <fieldset className="mb-6">
            <legend className="mb-1 font-semibold">Your colour</legend>
            <p className="mb-3 text-sm text-muted">Marks today, and the send button in the assistant.</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ACCENTS) as AccentId[]).map((id) => (
                <label
                  key={id}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-3 has-[:checked]:border-ink has-[:checked]:bg-bg"
                >
                  <input
                    type="radio"
                    name="accent"
                    value={id}
                    defaultChecked={settings.accent === id}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="size-5 rounded-full"
                    style={{ backgroundColor: ACCENTS[id].hex }}
                  />
                  <span className="text-sm font-semibold">{ACCENTS[id].label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-6 sm:grid-cols-2">
            <Choice
              legend="Week starts on"
              name="weekStart"
              current={settings.weekStart}
              options={[
                { value: "mon", label: "Monday" },
                { value: "sun", label: "Sunday" },
              ]}
            />
            <Choice
              legend="Times"
              name="clock"
              current={settings.clock}
              options={[
                { value: "12", label: "12-hour" },
                { value: "24", label: "24-hour" },
              ]}
            />
          </div>

          <button className="mt-6 flex min-h-11 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white hover:opacity-90">
            <Check size={16} strokeWidth={2.5} />
            Save settings
          </button>
        </form>

        {/* ---------- the calendars ---------- */}
        <h2 className="font-display text-2xl font-semibold tracking-tight">Your calendars</h2>
        <p className="mb-4 mt-1 max-w-prose text-muted">
          The category decides which filter chip hides a calendar. The colour is how its events are labelled in the
          week.
        </p>

        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {data.calendars.map((cal) => (
            <li key={cal.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
              <span className="flex min-w-0 flex-1 basis-48 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: colorFor(settings, cal.id, tagOf.get(cal.id)!).dot }}
                />
                <span className="truncate font-semibold">{cal.summary}</span>
                {cal.primary && <span className="text-sm font-normal text-muted">(main)</span>}
              </span>

              {/* One form, three submit buttons. The one you press sends its own value. */}
              <form action={setCalendarTag} className="flex overflow-hidden rounded-full border border-line-strong">
                <input type="hidden" name="calendarId" value={cal.id} />
                {TAGS.map((tag) => (
                  <TagButton key={tag} tag={tag} selected={tagOf.get(cal.id) === tag} />
                ))}
              </form>

              <form action={setCalendarColor} className="flex flex-wrap gap-1.5">
                <input type="hidden" name="calendarId" value={cal.id} />
                {(Object.keys(CALENDAR_COLORS) as ColorId[]).map((id) => (
                  <ColorSwatch
                    key={id}
                    id={id}
                    calendarName={cal.summary}
                    selected={settings.colors[cal.id] === id}
                  />
                ))}
              </form>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

/* ---------- small pieces ---------- */

function Choice({
  legend,
  name,
  current,
  options,
}: {
  legend: string;
  name: keyof Settings & string;
  current: string;
  options: { value: string; label: string }[];
}) {
  return (
    <fieldset>
      <legend className="mb-3 font-semibold">{legend}</legend>
      <div className="flex gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full border border-line px-4 text-sm font-semibold has-[:checked]:border-ink has-[:checked]:bg-bg"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={current === option.value}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
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

function ColorSwatch({ id, calendarName, selected }: { id: ColorId; calendarName: string; selected: boolean }) {
  const { bg, dot, label } = CALENDAR_COLORS[id];
  return (
    <button
      name="color"
      value={id}
      aria-pressed={selected}
      aria-label={`${label} for ${calendarName}`}
      title={label}
      className={`grid size-11 place-items-center rounded-full ${selected ? "bg-bg ring-1 ring-ink" : "hover:bg-bg"}`}
    >
      <span
        aria-hidden="true"
        className="grid size-6 place-items-center rounded-full border"
        style={{ backgroundColor: bg, borderColor: dot }}
      >
        {selected && <Check size={14} strokeWidth={3} style={{ color: dot }} />}
      </span>
    </button>
  );
}
