// The Import page: loads which calendars the user can add to, then hands off
// to the ImportFlow component, which runs in the browser.

import { AppHeader } from "@/components/app-header";
import { ImportFlow } from "@/components/import-flow";
import { Notice } from "@/components/notice";
import { SetupWarnings } from "@/components/setup-warnings";
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
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-display text-4xl leading-none tracking-tight">Import a schedule</h1>
        <p className="mb-6 mt-2 max-w-prose text-muted">
          Paste a season schedule or upload a photo of one. Every event gets found, then you pick which to keep.
          Nothing is added until you tap Add.
        </p>
        <div className="mb-4 empty:mb-0">
          <SetupWarnings missingScopes={data.missingScopes} />
        </div>

        {writable.length === 0 ? (
          <Notice>You don&apos;t have any calendars you can add events to.</Notice>
        ) : (
          <ImportFlow calendars={writable} />
        )}
      </main>
    </>
  );
}
