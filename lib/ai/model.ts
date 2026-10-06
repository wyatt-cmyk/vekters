// Which Claude model the app uses, and the settings every request shares.
// Change MODEL here and both the chat and the schedule import follow.
//
// Current choice: Claude Sonnet 5.5. It reads images and PDFs, calls tools, and
// is fast and cheap enough for a student to use every day. Claude Opus 5.5 is
// the stronger (and pricier) option if schedule reading ever disappoints.
import type Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-5-5";

// Beta features we switch on:
// - server-side-fallback: if Claude's safety filter declines a message, the API
//   quietly retries it on another model instead of handing us an error.
// - thinking-binding-controls: lets us set block_binding below.
export const BETAS: Anthropic.Beta.AnthropicBeta[] = [
  "server-side-fallback-2026-07-01",
  "thinking-binding-controls-2026-08-01",
];

// Settings shared by every request.
//
// About block_binding: Claude's "thinking" blocks are tied to the exact
// conversation that produced them. We send the conversation back on every turn,
// so if anything earlier changed (say the student tagged a calendar between
// messages, or the date rolled over at midnight) the API would reject the whole
// request. "drop_block" tells it to throw away the stale thinking instead,
// so the chat keeps working.
export const SHARED_REQUEST = {
  thinking: {
    type: "adaptive",
    block_binding: { prefix_mismatch_behavior: "drop_block" },
  },
  betas: BETAS,
  fallbacks: "default",
} as const satisfies Partial<Anthropic.Beta.MessageCreateParams>;
