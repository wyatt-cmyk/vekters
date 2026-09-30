// Warnings about the Google connection itself, shown above the calendar.
// Empty lists render nothing, so this is safe to drop on any page.
import { Notice } from "./notice";

export function SetupWarnings({
  missingScopes = [],
  failedCalendars = [],
}: {
  missingScopes?: string[];
  failedCalendars?: string[];
}) {
  return (
    <>
      {missingScopes.length > 0 && (
        <Notice>
          <strong>Missing Google permission.</strong> You didn&apos;t allow: {missingScopes.join(", ")}. Adding events will
          fail until you sign out, sign in again, and tick every box on Google&apos;s screen.
        </Notice>
      )}
      {failedCalendars.length > 0 && (
        <Notice>
          Couldn&apos;t load {failedCalendars.length === 1 ? "this calendar" : "these calendars"}:{" "}
          {failedCalendars.join(", ")}. Events from {failedCalendars.length === 1 ? "it" : "them"} are missing below.
        </Notice>
      )}
    </>
  );
}
