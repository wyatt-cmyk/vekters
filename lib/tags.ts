// School / Sports / Other tags for each calendar.
//
// We have no database yet, so tags live in a cookie as JSON:
//   { "<calendar id>": "school", "<other calendar id>": "sports" }
// Downside: tags are per-browser (your phone and Chromebook each keep their own).
// Calendars you haven't tagged get a best guess from their name.

// Reads cookies, so it can only ever run on the server.
import "server-only";

import { cookies } from "next/headers";
import type { Calendar } from "./google-calendar";

export type Tag = "school" | "sports" | "other";
export const TAGS: Tag[] = ["school", "sports", "other"];
export const TAG_COOKIE = "calendar-tags";

export function isTag(value: unknown): value is Tag {
  return typeof value === "string" && (TAGS as string[]).includes(value);
}

export async function readSavedTags(): Promise<Record<string, Tag>> {
  const raw = (await cookies()).get(TAG_COOKIE)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {}; // a broken cookie shouldn't break the page
  }
}

const SCHOOL_WORDS = ["toddle", "school", "class", "homework", "assignment", "academic"];
const SPORTS_WORDS = ["practice", "game", "team", "varsity", "jv", "soccer", "football", "basketball",
  "baseball", "softball", "volleyball", "track", "swim", "tennis", "lacrosse", "hockey", "wrestling", "cross country"];

export function guessTag(calendarName: string): Tag {
  const name = calendarName.toLowerCase();
  if (SCHOOL_WORDS.some((word) => name.includes(word))) return "school";
  if (SPORTS_WORDS.some((word) => name.includes(word))) return "sports";
  return "other";
}

// Returns a Map of calendar id -> tag, using saved tags first and guesses second.
export function tagsForCalendars(calendars: Calendar[], saved: Record<string, Tag>) {
  return new Map(calendars.map((cal) => [cal.id, isTag(saved[cal.id]) ? saved[cal.id] : guessTag(cal.summary)]));
}

export const TAG_LABELS: Record<Tag, string> = { school: "School", sports: "Sports", other: "Other" };
