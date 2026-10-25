// Turns Vekters events into an iCalendar (.ics) feed, the format Google
// Calendar, Apple Calendar and Outlook all understand when you give them a URL.
//
// This file is pure: events in, a string out. No network, no database, no
// session. That makes it the one part of the feed feature that can be fully
// tested on its own, which is why it was written first.
//
// The format is RFC 5545. Four of its rules are easy to get wrong and all four
// break silently -- the file looks fine, and the calendar quietly misbehaves:
//
//   1. Lines end with CRLF, not "\n". A template literal gives you "\n".
//   2. Lines are folded at 75 OCTETS, not characters. Fold mid-UTF-8 and the
//      title turns to mojibake.
//   3. An all-day event's DTEND is EXCLUSIVE. A game on the 25th ends on the
//      26th. Get this wrong and every all-day event is a day short.
//   4. UIDs must be stable between fetches. If a UID changes, the subscriber
//      can't tell it's the same event, so it keeps the old one AND adds the
//      new one. Duplicates pile up on their end while our feed looks perfect.

import type { CalendarEvent } from "./google-calendar";
import { isCancelledTitle } from "./proposals";

// Identifies us in the file. RFC 5545 section 3.7.3 requires it.
const PRODID = "-//Vekters//Vekters Calendar Feed 1.0//EN";

// The namespace for our UIDs. Deliberately ours rather than echoing Google's
// iCalUID: a subscriber that does dedupe by UID shouldn't confuse our copy
// with the original.
const UID_DOMAIN = "vekters.app";

// RFC 5545 section 3.3.11: inside a TEXT value, these four have meaning and
// must be escaped. Backslash goes first or it would escape the escapes.
function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// RFC 5545 section 3.1: "Lines of text SHOULD NOT be longer than 75 octets".
// A continuation is CRLF followed by one space, and the space is dropped when
// the file is read back.
//
// We count bytes, not characters, and never split a multi-byte character --
// an emoji in an event title is three or four octets and cutting it in half
// corrupts the line.
export function foldLine(line: string) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const pieces: string[] = [];
  let start = 0;
  // 75 octets for the first line; continuations lose one to the leading space.
  let limit = 75;

  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Walk back off a continuation byte (10xxxxxx) so we cut between characters.
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) {
      end--;
    }
    pieces.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74;
  }

  return pieces.join("\r\n ");
}

// A timed event: UTC with a Z suffix. We could emit local times with a TZID,
// but that needs a matching VTIMEZONE block spelling out the daylight saving
// rules, and getting those wrong is worse than showing the right instant.
function utcStamp(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// An all-day date: YYYYMMDD with no time and no zone (RFC 5545 section 3.3.4).
function dateStamp(day: string) {
  return day.replace(/-/g, "");
}

// Rule 3 above. Google gives us an exclusive end date already, but an event
// with no end at all still needs one, so this is where the +1 day lives.
function nextDay(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export type FeedEvent = CalendarEvent;

export type FeedOptions = {
  // Shown as the calendar's name in the subscriber's sidebar.
  calendarName: string;
  // Fixed by the caller rather than read from the clock here, so the same
  // events always produce the same bytes. That keeps the function pure and
  // makes it testable.
  now: Date;
};

// One VEVENT. Returns the lines unfolded; the caller folds them.
function eventLines(event: FeedEvent, now: Date): string[] {
  const allDay = Boolean(event.start.date);
  const lines: string[] = ["BEGIN:VEVENT"];

  // Rule 4: Google's event id is immutable for the life of the event, which is
  // exactly what a UID needs. The calendar id is in there because the same
  // event id can appear on two calendars.
  lines.push(`UID:${escapeText(`${event.id}.${event.calendarId}@${UID_DOMAIN}`)}`);
  lines.push(`DTSTAMP:${utcStamp(now)}`);

  if (allDay) {
    const start = event.start.date!;
    const end = event.end.date ?? nextDay(start);
    lines.push(`DTSTART;VALUE=DATE:${dateStamp(start)}`);
    lines.push(`DTEND;VALUE=DATE:${dateStamp(end)}`);
  } else {
    lines.push(`DTSTART:${utcStamp(event.start.dateTime!)}`);
    if (event.end.dateTime) lines.push(`DTEND:${utcStamp(event.end.dateTime)}`);
  }

  // SUMMARY is optional in the spec but an event without one is an untitled
  // grey block, so we always send something.
  lines.push(`SUMMARY:${escapeText(event.summary || "(no title)")}`);

  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);

  // Vekters marks a called-off game by renaming it "Cancelled: ...", because
  // Google hides events whose status is actually cancelled. For a subscriber
  // we can say it properly. Clients that understand STATUS grey the event out;
  // the ones that don't still see the prefix in the title.
  const cancelled = event.status === "cancelled" || isCancelledTitle(event.summary);
  lines.push(`STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`);

  // Which Vekters calendar it came from, so a parent subscribing to one feed
  // can still tell practice from a chemistry test.
  if (event.calendarName) lines.push(`CATEGORIES:${escapeText(event.calendarName)}`);

  lines.push("END:VEVENT");
  return lines;
}

// The whole file. Join with CRLF, end with CRLF (rule 1).
export function buildFeed(events: FeedEvent[], options: FeedOptions) {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    // No METHOD: this is a plain published feed, not a meeting invitation.
    `NAME:${escapeText(options.calendarName)}`,
    `X-WR-CALNAME:${escapeText(options.calendarName)}`,
  ];

  for (const event of events) {
    lines.push(...eventLines(event, options.now));
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
