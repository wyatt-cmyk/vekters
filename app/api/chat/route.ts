// POST /api/chat — the browser sends the new message plus the conversation so
// far; we run the AI on the server (where the API key lives) and send back the
// reply and any confirmation cards.

import { runChat } from "@/lib/ai/chat";
import { aiErrorResponse } from "@/lib/ai/errors";
import { getSource, isDemoMode, isSignedOut } from "@/lib/calendar-data";
import { readSavedTags } from "@/lib/tags";

// Claude may think and call tools a few times. 60s is Vercel's Hobby ceiling;
// observed replies take 10 to 20 seconds.
export const maxDuration = 60;

// What the calendar is showing. Comes from the browser, so it's checked.
type Viewing = { date: string; view: "day" | "week" | "month" };

function isViewing(value: unknown): value is Viewing {
  const v = value as Viewing | undefined;
  return (
    !!v &&
    typeof v.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
    ["day", "week", "month"].includes(v.view)
  );
}

export async function POST(request: Request) {
  // 1. Check the request is the shape we expect. Never trust input from the browser.
  const body = await request.json().catch(() => null);
  const message = body?.message;
  const history = body?.history;
  const notes = body?.notes;
  const viewing = body?.viewing;
  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 8000 ||
    !Array.isArray(history) ||
    !Array.isArray(notes) ||
    !notes.every((n) => typeof n === "string") ||
    JSON.stringify(body).length > 1_000_000 ||
    !isViewing(viewing)
  ) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  // 2. A deployed demo has no sign-in, so it must not be able to spend money.
  if (isDemoMode() && process.env.NODE_ENV === "production") {
    return Response.json({ error: "Sign in to use the assistant." }, { status: 403 });
  }

  // 3. Make sure the user is signed in (always true in demo mode).
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
      viewing,
    });
    return Response.json(result);
  } catch (err) {
    return aiErrorResponse(err);
  }
}
