"use server";
// Server actions: functions the browser can trigger (via a form) that run on the server.

import { cookies } from "next/headers";
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
