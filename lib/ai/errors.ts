// Turns errors from the Anthropic API into messages a student can act on.
// Used by both /api/chat and /api/import.
import Anthropic from "@anthropic-ai/sdk";

export function aiErrorResponse(err: unknown) {
  console.error("AI request failed:", err);
  if (err instanceof Anthropic.AuthenticationError) {
    return Response.json({ error: "The Anthropic API key is missing or wrong. Check ANTHROPIC_API_KEY in .env.local." }, { status: 500 });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return Response.json({ error: "The AI is busy right now. Wait a moment and try again." }, { status: 429 });
  }
  if (err instanceof Anthropic.BadRequestError) {
    return Response.json({ error: "The AI couldn't read that. If it's a file, try a PDF, PNG, or JPG under 4 MB." }, { status: 400 });
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
