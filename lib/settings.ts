// Per-person settings: team colour, which day the week starts on, 12 or 24
// hour times, and a colour for each calendar.
//
// Where they live: a cookie, like the calendar tags. That means each person
// gets their own settings (nobody shares a browser profile), but they don't
// follow you from your Chromebook to your phone. Moving to a real database
// later only means changing `readSettings` and `writeSettings` below; nothing
// else in the app touches storage.

// Reads cookies, so it can only ever run on the server.
import "server-only";

import { cookies } from "next/headers";
import type { Tag } from "./tags";

export const SETTINGS_COOKIE = "settings";

/* ---------- the choices ---------- */

// Accent: used for today's date and the send button. Each one is dark enough
// that white text on it stays readable.
export const ACCENTS = {
  ink: { label: "Ink", hex: "#171717" },
  clay: { label: "Clay", hex: "#b8482a" },
  blue: { label: "Blue", hex: "#1f4fbf" },
  forest: { label: "Forest", hex: "#15715a" },
  plum: { label: "Plum", hex: "#6b3fa0" },
  crimson: { label: "Crimson", hex: "#b0263c" },
  slate: { label: "Slate", hex: "#3a4a58" },
} as const;

// Calendar colours, straight from the design: a pastel for event blocks and a
// darker dot for indicators and checkboxes. The dots are too light to read as
// text, so they only ever appear as a shape; words stay ink or muted.
export const CALENDAR_COLORS = {
  blue: { label: "Blue", bg: "#dce7f5", dot: "#6f8fbf" },
  green: { label: "Green", bg: "#dfebdd", dot: "#7a9f72" },
  peach: { label: "Peach", bg: "#f5e4d5", dot: "#c08e62" },
  pink: { label: "Pink", bg: "#f0dee4", dot: "#b97c8f" },
  lavender: { label: "Lavender", bg: "#e8e3f3", dot: "#8c7dbe" },
} as const;

// The eight solid colours this used to offer map onto the five above, so an
// earlier choice isn't silently thrown away.
const LEGACY_COLORS: Record<string, ColorId> = {
  amber: "peach",
  purple: "lavender",
  red: "pink",
  teal: "blue",
  grey: "lavender",
};

export type AccentId = keyof typeof ACCENTS;
export type ColorId = keyof typeof CALENDAR_COLORS;
export type WeekStart = "mon" | "sun";
export type Clock = "12" | "24";

export type Settings = {
  accent: AccentId;
  hiddenCalendars: string[]; // calendars switched off in the sidebar
  weekStart: WeekStart;
  clock: Clock;
  colors: Record<string, ColorId>; // calendar id -> colour
};

export const DEFAULT_SETTINGS: Settings = {
  accent: "ink",
  weekStart: "mon",
  clock: "12",
  colors: {},
  hiddenCalendars: [],
};

/* ---------- checking values ---------- */
// Everything here can arrive from a cookie or a form, so nothing is trusted.

export const isAccent = (v: unknown): v is AccentId => typeof v === "string" && v in ACCENTS;
export const isColor = (v: unknown): v is ColorId => typeof v === "string" && v in CALENDAR_COLORS;
export const isWeekStart = (v: unknown): v is WeekStart => v === "mon" || v === "sun";
export const isClock = (v: unknown): v is Clock => v === "12" || v === "24";

function clean(raw: unknown): Settings {
  const value = (raw ?? {}) as Partial<Settings>;
  const colors: Record<string, ColorId> = {};
  for (const [id, color] of Object.entries(value.colors ?? {})) {
    if (id.length > 300) continue;
    const mapped = isColor(color) ? color : LEGACY_COLORS[color as string];
    if (mapped) colors[id] = mapped;
  }
  const hiddenCalendars = (Array.isArray(value.hiddenCalendars) ? value.hiddenCalendars : [])
    .filter((id): id is string => typeof id === "string" && id.length <= 300)
    .slice(0, 100);
  return {
    accent: isAccent(value.accent) ? value.accent : DEFAULT_SETTINGS.accent,
    weekStart: isWeekStart(value.weekStart) ? value.weekStart : DEFAULT_SETTINGS.weekStart,
    clock: isClock(value.clock) ? value.clock : DEFAULT_SETTINGS.clock,
    colors,
    hiddenCalendars,
  };
}

/* ---------- storage (the only part a database would replace) ---------- */

export async function readSettings(): Promise<Settings> {
  const raw = (await cookies()).get(SETTINGS_COOKIE)?.value;
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return clean(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS; // a broken cookie shouldn't break the page
  }
}

export async function writeSettings(settings: Settings) {
  (await cookies()).set(SETTINGS_COOKIE, JSON.stringify(settings), {
    httpOnly: true, // only the server reads it
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // one year
  });
}

/* ---------- using them ---------- */

export const accentHex = (settings: Settings) => ACCENTS[settings.accent].hex;

export type CalendarPaint = { bg: string; dot: string };

// A calendar with no colour of its own falls back to one that matches its tag,
// so a fresh account still looks deliberate.
const TAG_DEFAULT: Record<Tag, ColorId> = { school: "blue", sports: "green", other: "lavender" };

export function colorFor(settings: Settings, calendarId: string, tag: Tag): CalendarPaint {
  const chosen = settings.colors[calendarId] ?? TAG_DEFAULT[tag];
  const { bg, dot } = CALENDAR_COLORS[chosen];
  return { bg, dot };
}

// Builds calendar id -> colours for every calendar, so a page resolves them once.
export function colorsForCalendars(settings: Settings, tagOf: Map<string, Tag>) {
  return new Map([...tagOf].map(([id, tag]) => [id, colorFor(settings, id, tag)]));
}

export const FALLBACK_PAINT: CalendarPaint = { bg: "#e8e3f3", dot: "#8c7dbe" };

export const isCalendarHidden = (settings: Settings, calendarId: string) =>
  settings.hiddenCalendars.includes(calendarId);
