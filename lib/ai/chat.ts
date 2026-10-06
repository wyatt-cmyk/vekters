// Runs one turn of the AI chat on the server.
//
// The "agent loop": we send the conversation to Claude. If Claude wants to use
// a tool, we run the tool, send back the result, and ask again. We repeat until
// Claude replies with plain text (or we hit a safety limit on steps).
import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { Source } from "../calendar-data";
import { getEventSnapshot, getEventsBetween } from "../calendar-data";
import { canWrite, type Calendar } from "../google-calendar";
import { checkProposal, type EventProposal } from "../proposals";
import { tagsForCalendars, type Tag } from "../tags";
import { addDays, formatLongWeekday, isDayKey, todayIn, toLocalDateTime } from "../week";
import { buildProposal } from "./build-proposal";
import { MODEL, SHARED_REQUEST } from "./model";
import { buildContext, nowLine, RULES } from "./system-prompt";
import { TOOLS } from "./tools";

const MAX_STEPS = 6; // stops a confused conversation from looping forever

type Message = Anthropic.Beta.BetaMessageParam;

export type ChatResult = {
  history: Message[]; // the full conversation, which the browser sends back next time
  reply: string; // Claude's text for this turn
  proposals: EventProposal[]; // confirmation cards to show
};

type ChatInput = {
  source: Source;
  savedTags: Record<string, Tag>;
  history: Message[];
  userText: string;
  appNotes: string[]; // e.g. "The student confirmed 'Practice'...", added before the new message
};

export async function runChat({ source, savedTags, history, userText, appNotes }: ChatInput): Promise<ChatResult> {
  // Reads ANTHROPIC_API_KEY from the environment (server only).
  const client = new Anthropic();

  const tagOf = tagsForCalendars(source.calendars, savedTags);
  const writable = source.calendars.filter(canWrite);
  const today = todayIn(source.timeZone);

  const system = [
    { type: "text" as const, text: RULES },
    {
      type: "text" as const,
      text: buildContext({
        today,
        weekday: formatLongWeekday(today),
        timeZone: source.timeZone,
        writableCalendars: writable.map((c) => ({ id: c.id, name: c.summary, tag: tagOf.get(c.id)!, primary: !!c.primary })),
      }),
    },
  ];

  const clock = toLocalDateTime(new Date(), source.timeZone).slice(11);
  const userContent = [nowLine(clock), ...appNotes.map((note) => `(App note: ${note})`), userText].join("\n\n");
  const messages: Message[] = [...history, { role: "user", content: userContent }];
  const proposals: EventProposal[] = [];
  let reply = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system,
      tools: TOOLS,
      messages,
      // Chat is the part a student waits on, so use medium effort: quicker
      // replies and lower cost, which is what Anthropic suggests for chat.
      output_config: { effort: "medium" },
      ...SHARED_REQUEST,
    });

    if (response.stop_reason === "refusal") {
      // Don't keep the declined turn in the history.
      return { history, reply: "Sorry, I can't help with that one.", proposals: [] };
    }

    // Save Claude's full answer (including any thinking blocks) unchanged.
    messages.push({ role: "assistant", content: response.content });

    const text = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (text) reply = text;

    if (response.stop_reason !== "tool_use") break;

    // Run every tool Claude asked for, then send all results back in one message.
    const toolUses = response.content.filter(
      (block): block is Anthropic.Beta.BetaToolUseBlock => block.type === "tool_use",
    );
    const results = await Promise.all(
      toolUses.map((toolUse) => runTool(toolUse, { source, writable, tagOf, proposals })),
    );
    messages.push({ role: "user", content: results });
  }

  return { history: messages, reply, proposals };
}

/* ---------- tools ---------- */

type ToolContext = {
  source: Source;
  writable: Calendar[];
  tagOf: Map<string, Tag>;
  proposals: EventProposal[];
};

async function runTool(
  toolUse: Anthropic.Beta.BetaToolUseBlock,
  ctx: ToolContext,
): Promise<Anthropic.Beta.BetaToolResultBlockParam> {
  const input = toolUse.input as Record<string, unknown>;
  // A small helper so every result has the same shape.
  const result = (content: string, isError = false) => ({
    type: "tool_result" as const,
    tool_use_id: toolUse.id,
    content,
    is_error: isError,
  });

  try {
    if (toolUse.name === "find_events") {
      const { start_date, end_date } = input;
      if (!isDayKey(start_date) || !isDayKey(end_date)) return result("Dates must look like YYYY-MM-DD.", true);
      if (end_date < start_date) return result("end_date is before start_date.", true);
      if (end_date > addDays(start_date, 30)) return result("Search at most 31 days at a time.", true);

      const events = await getEventsBetween(ctx.source, start_date, end_date);
      const tz = ctx.source.timeZone;
      // A compact, readable list for Claude. Times are the student's local time.
      const list = events.map((e) => ({
        event_id: e.id,
        calendar: e.calendarName,
        tag: ctx.tagOf.get(e.calendarId) ?? "other",
        title: e.summary ?? "(no title)",
        start: e.start.date ?? toLocalDateTime(new Date(e.start.dateTime!), tz),
        end: e.end.date ? `${e.end.date} (exclusive)` : toLocalDateTime(new Date(e.end.dateTime!), tz),
        all_day: Boolean(e.start.date),
        location: e.location ?? "",
        status: e.status,
      }));
      return result(list.length ? JSON.stringify(list) : "No events in that range.");
    }

    // update_event and cancel_event both need an event that already exists, so
    // look it up first. That also gives us the "before" shown on the card.
    if (toolUse.name === "update_event" || toolUse.name === "cancel_event") {
      const calendarId = String(input.calendar_id ?? "");
      const eventId = String(input.event_id ?? "");
      const calendar = ctx.writable.find((c) => c.id === calendarId);
      if (!calendar) return result("That calendar isn't one the student can change.", true);

      const before = await getEventSnapshot(ctx.source, calendarId, eventId);
      if (!before) return result("No event with that event_id on that calendar. Run find_events again.", true);

      if (toolUse.name === "cancel_event") {
        const proposal: EventProposal = {
          id: crypto.randomUUID(),
          action: "cancel",
          eventId,
          before,
          calendarId,
          calendarName: calendar.summary,
          tag: ctx.tagOf.get(calendarId) ?? "other",
          title: before.title || "(no title)",
          date: before.date,
          allDay: before.allDay,
          startTime: before.startTime,
          endTime: before.endTime,
          endTimeDefaulted: false,
          location: before.location,
          notes: "",
        };
        const problem = checkProposal(proposal, ctx.writable.map((c) => c.id));
        if (problem) return result(`Not proposed: ${problem}`, true);
        ctx.proposals.push(proposal);
        return result(
          `Shown as a card to cancel "${before.title}". Nothing has changed yet; it is marked cancelled only if the student taps Confirm.`,
        );
      }

      const { proposal, problem } = buildProposal({ ...input, calendar_id: calendarId }, ctx.writable, ctx.tagOf, {
        action: "update",
        eventId,
        before,
      });
      if (problem) return result(`Not proposed: ${problem}`, true);
      ctx.proposals.push(proposal);
      return result(
        `Shown as a card changing "${before.title}". Nothing has changed yet; it only changes if the student taps Confirm.`,
      );
    }

    if (toolUse.name === "create_event") {
      const { proposal, problem } = buildProposal(input, ctx.writable, ctx.tagOf);
      if (problem) return result(`Not proposed: ${problem}`, true);

      ctx.proposals.push(proposal);
      const flag = proposal.endTimeDefaulted ? " No end time was given, so the card uses 2 hours and says so." : "";
      return result(
        `Shown to the student as a confirmation card. It is NOT on the calendar yet; it's added only if they tap Confirm.${flag}`,
      );
    }

    return result(`Unknown tool: ${toolUse.name}`, true);
  } catch (err) {
    // Tell Claude the tool failed instead of crashing the whole chat.
    return result(`The tool failed: ${err instanceof Error ? err.message : String(err)}`, true);
  }
}
