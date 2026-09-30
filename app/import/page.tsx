// The Import page: loads which calendars the user can add to, then hands off
// to the ImportFlow component, which runs in the browser.

import { AppHeader } from "@/components/app-header";
import { ImportFlow } from "@/components/import-flow";
import { Notice } from "@/components/notice";
import { SignInScreen } from "@/components/sign-in-screen";
import { loadCalendars } from "@/lib/calendar-data";
import { canWrite } from "@/lib/google-calendar";
import { readSavedTags, tagsForCalendars } from "@/lib/tags";

export default async function ImportPage() {
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
  const writable = data.calendars
    .filter(canWrite)
    .map((c) => ({ id: c.id, name: c.summary, tag: tagOf.get(c.id)! }));

  return (
    <>
      {header}
      <main className="mx-auto w-full max-w-3xl p-4">
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">Import a schedule</h1>
        <p className="mb-4 text-muted">
          The AI finds every event, then you check which ones to add. Nothing is added until you tap Add.
        </p>
        {writable.length === 0 ? (
          <Notice>You don&apos;t have any calendars you can add events to.</Notice>
        ) : (
          <ImportFlow calendars={writable} />
        )}
      </main>
    </>
  );
}
