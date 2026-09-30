// POST /api/import — the browser sends a schedule (text, or a PDF/image file)
// as form data. Claude reads it on the server and we send back the events for
// the review list. Nothing is written to the calendar here.

import { aiErrorResponse } from "@/lib/ai/errors";
import { extractSchedule, ImportError, type ScheduleInput } from "@/lib/ai/import";
import { getSource, isSignedOut } from "@/lib/calendar-data";
import { readSavedTags } from "@/lib/tags";

// Reading a long schedule can take a while.
export const maxDuration = 300;

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel rejects requests over 4.5 MB)
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export async function POST(request: Request) {
  // 1. Read and check the form data.
  const form = await request.formData().catch(() => null);
  const text = form?.get("text");
  const file = form?.get("file");
  const note = typeof text === "string" ? text.trim() : "";
  if (note.length > 50_000) return Response.json({ error: "That text is too long. Try pasting part of it." }, { status: 400 });

  let input: ScheduleInput;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      return Response.json({ error: "That file is over 4 MB. Try a smaller screenshot or PDF." }, { status: 400 });
    }
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    if (file.type === "application/pdf") {
      input = { kind: "pdf", base64, note };
    } else if ((IMAGE_TYPES as readonly string[]).includes(file.type)) {
      input = { kind: "image", base64, mediaType: file.type as (typeof IMAGE_TYPES)[number], note };
    } else {
      return Response.json({ error: "Upload a PDF, PNG, JPG, WebP, or GIF." }, { status: 400 });
    }
  } else if (note) {
    input = { kind: "text", text: note };
  } else {
    return Response.json({ error: "Paste a schedule or choose a file first." }, { status: 400 });
  }

  // 2. Make sure the user is signed in (always true in demo mode).
  let source;
  try {
    source = await getSource();
  } catch {
    return Response.json({ error: "Couldn't load your calendar. Try reloading the page." }, { status: 502 });
  }
  if (isSignedOut(source)) return Response.json({ error: "Please sign in again." }, { status: 401 });

  // 3. Ask Claude to read the schedule.
  try {
    return Response.json(await extractSchedule(source, await readSavedTags(), input));
  } catch (err) {
    if (err instanceof ImportError) return Response.json({ error: err.message }, { status: 422 });
    if (err instanceof SyntaxError) return Response.json({ error: "The AI's answer was garbled. Try again." }, { status: 502 });
    return aiErrorResponse(err);
  }
}
