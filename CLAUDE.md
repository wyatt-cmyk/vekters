@AGENTS.md

# AI Calendar for Student Athletes

## What this app is
An AI-powered calendar for high school student athletes. It combines school assignments and sports schedules in one place, using Google Calendar as the hub. Coaches often send schedule changes by text, so users can paste those messages into a built-in AI chat that turns them into calendar events.

## Who it's for
High school student athletes juggling classes, practices, games, and travel. Our school uses Toddle for assignments (it already syncs to Google Calendar) and Chromebooks for schoolwork, so the web version must work well on a Chromebook screen (around 1366 x 768).

## Stack
- Next.js (App Router) with TypeScript
- Auth.js (NextAuth) with Google sign-in
- Google Calendar API as the main data store (no database for version 1 unless we need one)
- Anthropic Claude API for the AI chat, using tool calling
- Hosted on Vercel
- iOS app comes later. The web app should work in a phone browser in the meantime.

## Rules
- Build ONE milestone at a time. Don't start the next milestone until the current one works.
  Exception: while Google setup is pending, it's OK to build on demo mode (sample data), as long as the demo data has the exact same shape as real Google Calendar data.
- API keys stay server-side only. Never expose them to the browser. Secrets live in `.env.local`, which is never committed.
- The AI never changes the calendar on its own. Every create, update, or cancel shows a confirmation card, and only writes to Google Calendar after the user taps Confirm.
- Cancelled events are marked as cancelled, not deleted.
- Always send the AI today's date and the user's time zone so relative dates like "tomorrow" work.
- Keep the code simple and explain what you're doing. I'm a student and want to understand the code.

## Version 1 features
1. Google sign-in and a combined, color-coded week view of school and sports.
2. Import an existing schedule (paste text, or upload a PDF or screenshot), review the found events, then add them.
3. AI chat that creates, updates, and cancels events from pasted messages, with confirmation cards.
4. AI answers to schedule questions ("What does my week look like?", "When can I study Thursday?").
5. Conflict and crunch-day alerts, using simple rules (not AI).

## Milestones
0. **Setup.** Next.js project, Google Cloud project with Calendar API, OAuth consent screen in testing mode. Scopes: `calendar.events` and `calendar.calendarlist.readonly`.
1. **Sign in and see data.** Google sign-in, then list my calendars and next 7 days of events. Done when my Toddle events show up.
2. **Week view.** Combined week view. Users tag each Google calendar as School or Sports for color-coding.
3. **AI chat.** Paste a message, Claude proposes an action using tools (`find_events`, `create_event`, `update_event`, `cancel_event`), app shows a confirmation card, writes to Google Calendar on confirm. Start with create only.
4. **Schedule import.** Same pipeline for a whole schedule. Review list with checkboxes, flag missing details and duplicates.
5. **Schedule questions.** Add a read-only `find_free_time` tool.
6. **Crunch alerts.** Rule-based, for example: a late game or practice followed by a test or due date the next morning.
7. **Deploy.** Vercel, with teammates added as Google test users.

## Tricky cases for the AI
- "Practice moved to 4:30" should UPDATE the matching event, not create a duplicate. Search first.
- Relative dates are based on when the text was sent. Ask if unclear.
- Missing end time: default to 2 hours and flag it for the user.
- Missing details: ask a short follow-up question.

## Design — "Daylight"
Light, calm and roomy, so it stays comfortable to read all day on a Chromebook. White cards on a warm off-white ground, soft rounding, one warm accent reserved for today and the send button. No pastel fills, no left-hand colour bars, no drop shadows.

Colours (tokens live in `app/globals.css`, so use `bg-surface`, `text-school`, `border-line` and so on, never raw hex in components):
- Page background: #F6F6F4
- Surface (cards, header, panel): #FFFFFF
- Ink (body text, primary buttons): #1C211F
- Muted text: #646E6A. Faint (weekday labels): #8A938E
- Borders: #E6E7E3, stronger #DDDFDA for controls
- Accent (today and the send button only): #B8482A with white text
- School: #2A52C9. Sports: #15715A. Both carry a text label too, never colour alone.
- Warning: text #8A3B00, fill #FFF1DD, border #E8B878

Fonts (Google Fonts, loaded in `app/layout.tsx`):
- Display: Fraunces 400/600. Wordmark, page headings, day numbers.
- Body and UI: Hanken Grotesk 400/500/600/700.
- Use the `.nums` class for times and dates so columns line up.

Icons: Lucide (`lucide-react`). Never emoji or text characters such as a tick or chevron.

Layout notes:
- Light header with the wordmark; controls are pills.
- The week toolbar leads with the date range in the display serif, then round nav buttons, filter chips with a category dot, and Import.
- Each day is a stack of white `rounded-card` cards under its own date header, sitting on the page background. There is no bordered day panel.
- Today's date sits in a filled accent pill; weekend dates are de-emphasised.
- Event cards show a small uppercase category label in the category colour, then the title, then the time.
- AI chat panel on the right, about 380px, at 1280px and wider. Below that it stacks above the week.
- Touch targets at least 44px tall.

## Project layout (kept up to date as we build)
- `auth.ts` — Auth.js config: Google provider, calendar scopes, token refresh.
- `app/api/auth/[...nextauth]/route.ts` — the sign-in/sign-out endpoints Auth.js needs.
- `app/page.tsx` — week view: week navigation (`?week=`), filter chips (`?hide=`), 7-column grid, and the event dialog (`?cal=&ev=`, `&edit=1`, `&del=1`, `?new=1`).
- `components/event-dialog.tsx` — event details, the hand-edit form, and the delete confirmation.
- `app/calendars/page.tsx` — tag each Google calendar as School, Sports, or Other.
- `app/actions.ts` — server actions: calendar tags, `confirmProposal`, `confirmImport`, plus `saveEventForm` and `deleteEventForm` for hand edits. These are the ONLY code that writes events.
- `app/api/chat/route.ts` — POST endpoint for the AI chat; checks input and sign-in, runs the AI on the server.
- `components/chat-panel.tsx` — the chat panel (client component) with confirmation cards.
- `app/import/page.tsx` + `components/import-flow.tsx` — schedule import: input, review checklist, done.
- `app/api/import/route.ts` — POST endpoint: takes text or a PDF/image (max 4 MB) and returns review rows.
- `lib/ai/import.ts` — asks Claude for all events as JSON (structured output), then `reviewEvents` adds warnings.
- `lib/ai/build-proposal.ts` — turns Claude's event fields into an `EventProposal`; shared by chat and import.
- `lib/ai/errors.ts` — turns Anthropic API errors into friendly messages.
- `lib/duplicates.ts` — rule-based duplicate detection (same day + matching title).
- `lib/ai/chat.ts` — the agent loop: calls Claude, runs tools, collects proposals.
- `lib/ai/model.ts` — the model name and shared request settings, all in one place.
- `lib/ai/tools.ts` — tool definitions (`find_events`, `create_event`) and the shared `EVENT_FIELDS` schema.
- `lib/ai/system-prompt.ts` — Claude's rules, plus today's date, time zone, and writable calendars.
- `lib/proposals.ts` — the `EventProposal` type, validation, and conversion to Google's event format.
- `components/` — header, week grid + event cards, sign-in screen, notice box.
- `lib/calendar-data.ts` — decides demo vs. real Google data, for reading (`loadWeek`, `getEventsBetween`) and writing (`createEventFromProposal`).
- `lib/google-calendar.ts` — server-only helpers that call the Google Calendar REST API, with `GoogleCalendarError` turning Google's errors into plain messages.
- `components/setup-warnings.tsx` — banners for missing Google permissions and calendars that wouldn't load.
- `lib/demo-data.ts` — sample calendars and events in Google's format.
- `lib/week.ts` — date helpers. Days are plain "YYYY-MM-DD" strings; weeks start Monday.
- `lib/tags.ts` — calendar tags, stored in a cookie (per browser, no database yet), with name-based guesses.
- `.env.local` — secrets (never committed). See `.env.local.example` and `SETUP.md`.

## Demo mode
On automatically when `AUTH_GOOGLE_ID` or `AUTH_GOOGLE_SECRET` is empty, or when `DEMO_MODE=true`. Skips sign-in and shows sample data. Events confirmed from the chat are kept in server memory and disappear on restart. Never deploy with demo mode on: the chat endpoint has no sign-in then.

## AI chat status (Milestone 3) — complete
- Tools: `find_events` (read-only), `create_event`, `update_event`, `cancel_event`. Each write tool only produces a confirmation card; `confirmProposal` is the only code that writes.
- A proposal carries an `action` of create, update or cancel. Update and cancel also carry the `eventId` and a `before` snapshot, so the card can show what changes.
- When a message produces several cards, the panel offers "Confirm all".
- Cancel re-reads the event's current name from the calendar instead of trusting the card, which may be stale.
- The server keeps no chat state: the browser sends the conversation history back each time. Never edit old history; only append.

## Schedule import status (Milestone 4)
- Paste text or upload a PDF/PNG/JPG/WebP/GIF (4 MB max, Vercel's request limit is 4.5 MB). Up to 100 events per import; repeating events are expanded.
- Review rows start unchecked when: likely duplicate of an existing event, listed twice, date in the past, or invalid (invalid rows can't be checked).
- Warnings shown: missing details from the AI, end time defaulted to 2 hours, past date, duplicates. The calendar can be changed per row.
- Not yet: editing a row's title/date/time before adding.

## Google connection notes
- Scopes are checked after sign-in. Google lets people untick permissions, so `missingScopes` on the session drives a warning banner instead of letting a save fail later.
- A calendar that fails to load is named in a banner, not silently skipped.
- Both `calendarList` and `events` follow `nextPageToken`, so accounts with many calendars or a full season of events aren't truncated.
- A calendar the student renamed in Google shows the name they chose (`summaryOverride`).

### How cancelling works
Google hides an event whose status is `cancelled`, so "mark it cancelled, don't delete it" can't be done with the status field. Instead `cancel_event` renames the event with a `Cancelled: ` prefix and leaves it in place, so a called-off game still shows on the week. The week grid treats either signal, the prefix or a `cancelled` status, as cancelled and draws it struck through. `cancelledTitle()` and `isCancelledTitle()` in `lib/proposals.ts` are the single source of that convention.

## Model choice
`lib/ai/model.ts` holds the model name. Currently **Claude Sonnet 5.5** (`claude-sonnet-5-5`), at $2 per million input tokens and $10 per million output. Claude Opus 5.5 is the stronger, pricier option if reading messy schedules ever disappoints. Claude Opus 5 is retired to legacy and costs more than Opus 5.5, so don't go back to it.

Effort is set per job: `medium` for chat, because the student is waiting, and `high` for import, because reading a blurry schedule is the hardest thing we ask.

### Why the system prompt must not change between messages
Sonnet 5.5 ties its thinking blocks to the exact conversation that produced them. We resend the whole conversation each turn, so if the system prompt, the tool list, or an earlier message changed in between, the API rejects the request. That's why the clock time is sent with each message (`nowLine`) instead of inside the system prompt, which would otherwise differ every single time. As a second guard, every request sets `block_binding.prefix_mismatch_behavior: "drop_block"`, so a mismatch drops the stale thinking instead of failing. Keep the conversation append-only: never rewrite earlier turns.

## Editing events by hand
Added after Milestones 0-4, because an AI-only calendar can't do what other calendar apps do.

- Tap any event to open it. Edit changes any field; Delete asks first, then removes it for good.
- "New event" sits in the toolbar next to Import.
- It is all driven by the URL, the same as the week and the filters: `?cal=<calendar id>&ev=<event id>` opens the details, `&edit=1` the form, `&del=1` the confirmation, and `?new=1&date=YYYY-MM-DD` a blank form. No browser-side state, the back button works, and an event can be linked to.
- The forms are plain `<form action={serverAction}>` posts, so they work without JavaScript. On failure the action redirects back with `?error=`, which the page shows as a notice.
- `saveEventForm` reuses `checkProposal` and `applyProposal`, so a hand edit obeys exactly the same rules as an AI confirmation card, including the two-hour default when the end time is blank.
- Delete is different from cancel. Delete removes the event; cancel (via the assistant) renames it with a `Cancelled: ` prefix and keeps it. The confirmation screen says so.
- Read-only calendars show the details with no Edit or Delete.

### Still missing versus a normal calendar app
Day and month views, an hour grid with an all-day row, jump-to-date, search, per-calendar filters, repeating events created in the app, and drag to move or resize. Reminders and invitations are deliberately left to Google Calendar, which already sends them to the student's phone.
