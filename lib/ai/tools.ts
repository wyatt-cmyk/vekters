// The tools Claude can call. A "tool" is a function we describe to Claude with
// a name, a description, and the shape of its input (a JSON schema). Claude
// decides when to call one; our server runs it and sends back the result.
//
// strict: true makes the API guarantee Claude's input matches the schema.
// We still double-check values like dates on our side (see chat.ts).

import type Anthropic from "@anthropic-ai/sdk";

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
      },
      required: ["calendar_id", "title", "date", "all_day", "start_time", "end_time", "location", "notes"],
      additionalProperties: false,
    },
  },
];
