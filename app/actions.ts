"use server";
// Server actions: functions the browser can trigger that run on the server.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { applyProposal, getSource, isSignedOut, removeEvent } from "@/lib/calendar-data";
import { canWrite } from "@/lib/google-calendar";
import { addHours, checkProposal, isTime, type EventProposal } from "@/lib/proposals";
import { isTag, readSavedTags, TAG_COOKIE } from "@/lib/tags";

// Called by the School / Sports / Other buttons on the Calendars page.
export async function setCalendarTag(formData: FormData) {
  const calendarId = formData.get("calendarId");
  const tag = formData.get("tag");
  // Never trust form input: check it's the shape we expect before saving.
  if (typeof calendarId !== "string" || calendarId.length > 300 || !isTag(tag)) return;

  const tags = await readSavedTags();
  tags[calendarId] = tag;

  (await cookies()).set(TAG_COOKIE, JSON.stringify(tags), {
    httpOnly: true, // only the server reads it
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // one year
  });
  // Next.js re-renders the page automatically after a server action sets a cookie.
}

// Called when the user taps Confirm on an AI confirmation card.
// This is the ONLY place the app writes events to the calendar.
export async function confirmProposal(proposal: EventProposal): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const source = await getSource();
    if (isSignedOut(source)) return { ok: false, error: "Please sign in again." };

    // Check the card again: it came from the browser, so it could have been changed.
    const problem = checkProposal(proposal, source.calendars.filter(canWrite).map((c) => c.id));
    if (problem) return { ok: false, error: `Can't do this: ${problem}` };

    await applyProposal(source, proposal);
    refresh(); // re-render the week view so the change shows up
    return { ok: true };
  } catch (err) {
    console.error("Confirm failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save the change. Try again." };
  }
}

export type ImportOutcome = { id: string; ok: boolean; error?: string };

// Called by "Add selected" on the import review list. Adds each checked event.
export async function confirmImport(proposals: EventProposal[]): Promise<{ results: ImportOutcome[] } | { error: string }> {
  if (!Array.isArray(proposals) || proposals.length === 0 || proposals.length > 100) {
    return { error: "Choose between 1 and 100 events." };
  }

  let source;
  try {
    source = await getSource();
  } catch {
    return { error: "Couldn't reach your calendar. Try again." };
  }
  if (isSignedOut(source)) return { error: "Please sign in again." };

  const writableIds = source.calendars.filter(canWrite).map((c) => c.id);
  const results: ImportOutcome[] = [];

  // One at a time, so one failure doesn't stop the rest and we can report each.
  for (const p of proposals) {
    try {
      const problem = checkProposal(p, writableIds);
      if (problem) {
        results.push({ id: String(p.id), ok: false, error: problem });
        continue;
      }
      await applyProposal(source, p);
      results.push({ id: p.id, ok: true });
    } catch (err) {
      console.error("Import add failed:", err);
      results.push({ id: String(p?.id), ok: false, error: "Couldn't add this one." });
    }
  }

  refresh();
  return { results };
}

/* ---------- editing events by hand (no AI involved) ---------- */

// Only ever send the browser back to a path inside this app.
function safeReturn(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "/";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

function withParam(path: string, key: string, value: string) {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set(key, value);
  return `${base}?${params.toString()}`;
}

// Saves the New event / Edit event form. An empty eventId means "create".
export async function saveEventForm(formData: FormData) {
  const back = safeReturn(formData.get("returnTo"));
  const eventId = String(formData.get("eventId") ?? "").trim();
  const allDay = formData.get("allDay") === "on";
  const startTime = allDay ? "" : String(formData.get("startTime") ?? "");
  const rawEnd = allDay ? "" : String(formData.get("endTime") ?? "");

  let error: string | null = null;
  try {
    const source = await getSource();
    if (isSignedOut(source)) {
      error = "Please sign in again.";
    } else {
      const calendarId = String(formData.get("calendarId") ?? "");
      const calendar = source.calendars.filter(canWrite).find((c) => c.id === calendarId);

      const proposal: EventProposal = {
        id: eventId || crypto.randomUUID(),
        action: eventId ? "update" : "create",
        eventId: eventId || undefined,
        calendarId,
        calendarName: calendar?.summary ?? "",
        tag: "other", // only used for card colour; the week view works it out itself
        title: String(formData.get("title") ?? "").trim(),
        date: String(formData.get("date") ?? ""),
        allDay,
        // Same rule as the AI: no end time means two hours.
        endTime: allDay ? "" : isTime(rawEnd) ? rawEnd : isTime(startTime) ? addHours(startTime, 2) : "",
        startTime,
        endTimeDefaulted: false,
        location: String(formData.get("location") ?? "").trim(),
        notes: String(formData.get("notes") ?? "").trim(),
      };

      const problem = checkProposal(proposal, source.calendars.filter(canWrite).map((c) => c.id));
      if (problem) error = problem;
      else await applyProposal(source, proposal);
    }
  } catch (err) {
    console.error("Save event failed:", err);
    error = err instanceof Error ? err.message : "Couldn't save the event.";
  }

  // redirect() throws on purpose, so it has to sit outside the try block.
  redirect(error ? withParam(back, "error", error) : back);
}

// Deletes an event. The dialog asks before this runs.
export async function deleteEventForm(formData: FormData) {
  const back = safeReturn(formData.get("returnTo"));
  let error: string | null = null;
  try {
    const source = await getSource();
    if (isSignedOut(source)) error = "Please sign in again.";
    else await removeEvent(source, String(formData.get("calendarId") ?? ""), String(formData.get("eventId") ?? ""));
  } catch (err) {
    console.error("Delete event failed:", err);
    error = err instanceof Error ? err.message : "Couldn't delete the event.";
  }
  redirect(error ? withParam(back, "error", error) : back);
}
