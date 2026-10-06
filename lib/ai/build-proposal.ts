// Turns the event fields Claude filled in (for the chat's create_event tool, or
// for one event found in an imported schedule) into an EventProposal.
// Having one function for both means the same rules apply everywhere.

import type { Calendar } from "../google-calendar";
import { addHours, checkProposal, isTime, type EventProposal, type EventSnapshot, type ProposalAction } from "../proposals";
import type { Tag } from "../tags";

export function buildProposal(
  raw: Record<string, unknown>,
  writable: Calendar[],
  tagOf: Map<string, Tag>,
  options: {
    // If Claude picks a calendar that isn't allowed, use this one instead of failing.
    fallbackCalendarId?: string;
    // "update" and "cancel" also need the event being changed.
    action?: ProposalAction;
    eventId?: string;
    before?: EventSnapshot;
  } = {},
): { proposal: EventProposal; problem: string | null } {
  const { fallbackCalendarId, action = "create", eventId, before } = options;
  let calendarId = String(raw.calendar_id ?? "");
  if (fallbackCalendarId && !writable.some((c) => c.id === calendarId)) calendarId = fallbackCalendarId;
  const calendar = writable.find((c) => c.id === calendarId);

  const allDay = raw.all_day === true;
  const startTime = allDay ? "" : String(raw.start_time ?? "");
  const endGiven = !allDay && isTime(raw.end_time);

  const proposal: EventProposal = {
    id: crypto.randomUUID(),
    action,
    eventId,
    before,
    calendarId,
    calendarName: calendar?.summary ?? "",
    tag: tagOf.get(calendarId) ?? "other",
    title: String(raw.title ?? "").trim(),
    date: String(raw.date ?? ""),
    allDay,
    startTime,
    // Rule from CLAUDE.md: no end time -> default to 2 hours and flag it.
    endTime: allDay ? "" : endGiven ? String(raw.end_time) : isTime(startTime) ? addHours(startTime, 2) : "",
    endTimeDefaulted: !allDay && !endGiven,
    location: String(raw.location ?? "").trim(),
    notes: String(raw.notes ?? "").trim(),
  };

  return { proposal, problem: checkProposal(proposal, writable.map((c) => c.id)) };
}

// Where events go when no better calendar fits: the primary calendar if we can
// write to it, otherwise the first writable one.
export function defaultCalendarId(writable: Calendar[]) {
  return (writable.find((c) => c.primary) ?? writable[0])?.id;
}
