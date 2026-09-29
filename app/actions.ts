"use server";
// Server actions: functions the browser can trigger that run on the server.

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { createEventFromProposal, getSource, isSignedOut } from "@/lib/calendar-data";
import { canWrite } from "@/lib/google-calendar";
import { checkProposal, type EventProposal } from "@/lib/proposals";
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
    if (problem) return { ok: false, error: `Can't add this event: ${problem}` };

    await createEventFromProposal(source, proposal);
    refresh(); // re-render the week view so the new event shows up
    return { ok: true };
  } catch (err) {
    console.error("Confirm failed:", err);
    return { ok: false, error: "Couldn't add the event. Try again." };
  }
}
