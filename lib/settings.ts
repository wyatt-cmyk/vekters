// Per-person settings: team colour, which day the week starts on, 12 or 24
// hour times, and a colour for each calendar.
//
// Where they live: a cookie, like the calendar tags. That means each person
// gets their own settings (nobody shares a browser profile), but they don't
// follow you from your Chromebook to your phone. Moving to a real database
// later only means changing `readSettings` and `writeSettings` below; nothing
// else in the app touches storage.

import { cookies } from "next/headers";
import type { Tag } from "./tags";

export const SETTINGS_COOKIE = "settings";

/* ---------- the choices ---------- */

// Accent: used for today's date and the send button. Each one is dark enough
// that white text on it stays readable.
export const ACCENTS = {
  clay: { label: "Clay", hex: "#b8482a" },
  blue: { label: "Blue", hex: "#1f4fbf" },
  forest: { label: "Forest", hex: "#15715a" },
  plum: { label: "Plum", hex: "#6b3fa0" },
  crimson: { label: "Crimson", hex: "#b0263c" },
  slate: { label: "Slate", hex: "#3a4a58" },
} as const;

// Calendar colours: used for the small category label on each event. All are
// dark enough to read at 10px on white.
export const CALENDAR_COLORS = {
  blue: { label: "Blue", hex: "#2a52c9" },
  green: { label: "Green", hex: "#15715a" },
  amber: { label: "Amber", hex: "#9a4b00" },
  purple: { label: "Purple", hex: "#6b3fa0" },
  red: { label: "Red", hex: "#b0263c" },
  teal: { label: "Teal", hex: "#0f6071" },
  pink: { label: "Pink", hex: "#a32b6b" },
  grey: { label: "Grey", hex: "#5a6360" },
} as const;

export type AccentId = keyof typeof ACCENTS;
export type ColorId = keyof typeof CALENDAR_COLORS;
export type WeekStart = "mon" | "sun";
export type Clock = "12" | "24";

export type Settings = {
  accent: AccentId;
  weekStart: WeekStart;
  clock: Clock;
  colors: Record<string, ColorId>; // calendar id -> colour
};

export const DEFAULT_SETTINGS: Settings = { accent: "clay", weekStart: "mon", clock: "12", colors: {} };

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
    if (id.length <= 300 && isColor(color)) colors[id] = color;
  }
  return {
    accent: isAccent(value.accent) ? value.accent : DEFAULT_SETTINGS.accent,
    weekStart: isWeekStart(value.weekStart) ? value.weekStart : DEFAULT_SETTINGS.weekStart,
    clock: isClock(value.clock) ? value.clock : DEFAULT_SETTINGS.clock,
    colors,
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

// A calendar with no colour of its own falls back to one that matches its tag,
// so a fresh account still looks deliberate.
const TAG_DEFAULT: Record<Tag, ColorId> = { school: "blue", sports: "green", other: "grey" };

export function colorFor(settings: Settings, calendarId: string, tag: Tag): string {
  const chosen = settings.colors[calendarId];
  return CALENDAR_COLORS[chosen ?? TAG_DEFAULT[tag]].hex;
}

// Builds calendar id -> colour for every calendar, so a page resolves them once.
export function colorsForCalendars(settings: Settings, tagOf: Map<string, Tag>) {
  return new Map([...tagOf].map(([id, tag]) => [id, colorFor(settings, id, tag)]));
}
