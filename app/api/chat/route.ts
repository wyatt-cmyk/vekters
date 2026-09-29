// POST /api/chat — the browser sends the new message plus the conversation so
// far; we run the AI on the server (where the API key lives) and send back the
// reply and any confirmation cards.

import Anthropic from "@anthropic-ai/sdk";
import { runChat } from "@/lib/ai/chat";
import { getSource, isSignedOut } from "@/lib/calendar-data";
import { readSavedTags } from "@/lib/tags";

// Claude may think and call tools a few times, so allow up to 2 minutes.
export const maxDuration = 120;

export async function POST(request: Request) {
  // 1. Check the request is the shape we expect. Never trust input from the browser.
  const body = await request.json().catch(() => null);
  const message = body?.message;
  const history = body?.history;
  const notes = body?.notes;
  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 8000 ||
    !Array.isArray(history) ||
    !Array.isArray(notes) ||
    !notes.every((n) => typeof n === "string") ||
    JSON.stringify(body).length > 1_000_000
  ) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  // 2. Make sure the user is signed in (always true in demo mode).
  let source;
  try {
    source = await getSource();
  } catch {
    return Response.json({ error: "Couldn't load your calendar. Try reloading the page." }, { status: 502 });
  }
  if (isSignedOut(source)) {
    return Response.json({ error: "Please sign in again." }, { status: 401 });
  }

  // 3. Run the AI. Map API errors to messages a student can act on.
  try {
    const result = await runChat({
      source,
      savedTags: await readSavedTags(),
      history,
      userText: message.trim(),
      appNotes: notes.slice(0, 20),
    });
    return Response.json(result);
  } catch (err) {
    console.error("Chat failed:", err);
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "The Anthropic API key is missing or wrong. Check ANTHROPIC_API_KEY in .env.local." }, { status: 500 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "The AI is busy right now. Wait a moment and try again." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return Response.json({ error: `The AI service returned an error (${err.status}). Try again.` }, { status: 502 });
    }
    const missingKey = err instanceof Error && /api[_ ]?key|credentials/i.test(err.message);
    return Response.json(
      { error: missingKey ? "Add ANTHROPIC_API_KEY to .env.local, then restart the dev server." : "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}
