// The tools Claude can call. A "tool" is a function we describe to Claude with
// a name, a description, and the shape of its input (a JSON schema). Claude
// decides when to call one; our server runs it and sends back the result.
//
// strict: true makes the API guarantee Claude's input matches the schema.
// We still double-check values like dates on our side (see chat.ts).

import type Anthropic from "@anthropic-ai/sdk";

// The fields that describe one event. Shared by the chat's create_event tool
// and the schedule import, so both produce exactly the same kind of proposal.
export const EVENT_FIELDS = {
  calendar_id: { type: "string", description: "id of one of the writable calendars listed in the system prompt." },
  title: { type: "string", description: 'Short event name, e.g. "Practice" or "Game vs. Lincoln High".' },
  date: { type: "string", description: "Day of the event, as YYYY-MM-DD." },
  all_day: { type: "boolean", description: "true for things without a time, like an assignment due date." },
  start_time: { type: "string", description: 'Local start time as 24-hour HH:MM, e.g. "16:30". Empty string if all_day.' },
  end_time: {
    type: "string",
    description:
      "Local end time as 24-hour HH:MM. Empty string if the message doesn't say; the app then uses 2 hours and flags it.",
  },
  location: { type: "string", description: "Where it is, or empty string." },
  notes: { type: "string", description: 'Useful extra details from the message (e.g. "wear dark jerseys"), or empty string.' },
};
export const EVENT_FIELD_NAMES = Object.keys(EVENT_FIELDS);

// update_event names the calendar and event separately, so it reuses every
// field except calendar_id.
const EVENT_FIELDS_WITHOUT_CALENDAR = Object.fromEntries(
  Object.entries(EVENT_FIELDS).filter(([name]) => name !== "calendar_id"),
);

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "find_events",
    description:
      "List the events already on the student's calendars between two dates (both included, at most 31 days apart). " +
      "Use it before proposing an event, to check the event isn't already there (for example a practice that was only moved) " +
      "and to notice conflicts. Also use it to answer questions about the schedule. Read-only.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "First day, as YYYY-MM-DD." },
        end_date: { type: "string", description: "Last day, as YYYY-MM-DD." },
      },
      required: ["start_date", "end_date"],
      additionalProperties: false,
    },
  },
  {
    name: "create_event",
    description:
      "Propose a new calendar event. This does NOT add it: the app shows the student a confirmation card, " +
      "and the event is only added if they tap Confirm. Call it once per event.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        ...EVENT_FIELDS,
      },
      required: EVENT_FIELD_NAMES,
      additionalProperties: false,
    },
  },
  {
    name: "update_event",
    description:
      "Propose a change to an event that already exists, for example when a message says practice moved to a new time. " +
      "Find the event with find_events first and use its event_id. This does NOT change anything: the student sees a " +
      "card showing what changes and taps Confirm. Give every field its final value, copying the ones that stay the same.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        calendar_id: { type: "string", description: "The calendar the event is on, from find_events." },
        event_id: { type: "string", description: "The event_id from find_events." },
        ...EVENT_FIELDS_WITHOUT_CALENDAR,
      },
      required: ["calendar_id", "event_id", ...EVENT_FIELD_NAMES.filter((n) => n !== "calendar_id")],
      additionalProperties: false,
    },
  },
  {
    name: "cancel_event",
    description:
      "Propose marking an existing event as cancelled, for example when a message says a game is called off. " +
      "The event is never deleted: its name gets a \"Cancelled:\" prefix so the student can still see it was called off. " +
      "Find the event with find_events first. The student still has to tap Confirm.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        calendar_id: { type: "string", description: "The calendar the event is on, from find_events." },
        event_id: { type: "string", description: "The event_id from find_events." },
      },
      required: ["calendar_id", "event_id"],
      additionalProperties: false,
    },
  },
];
