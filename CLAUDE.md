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

## Design
Clean and sporty. Reference screenshots are in `/designs`.

Colors:
- Background: #F3F1EB
- Surface: #FFFFFF
- Text: #1C1F24
- Muted text: #5A5F66
- Borders: #DDD9CF
- School: text #2F4E8C, fill #E7ECF6
- Sports: text #2A5F3E, fill #E3F0E7
- Warnings: text #6B3A08, fill #FBEFD9, border #E9C98F
- Primary button: #1C1F24 with white text

Fonts (Google Fonts):
- Headings and numbers: Barlow Condensed (600, 700)
- Body: Source Sans 3 (400, 600, 700)

Layout notes:
- Web week view: header with week navigation, School and Sports filter chips, and an Import button. Crunch-day alert banner above a 7-column week grid. AI chat panel on the right (about 380px wide).
- Event cards: tinted fill, small uppercase label (class or sport), event name, time.
- Touch targets at least 44px tall.

## Project layout (kept up to date as we build)
- `auth.ts` — Auth.js config: Google provider, calendar scopes, token refresh.
- `app/api/auth/[...nextauth]/route.ts` — the sign-in/sign-out endpoints Auth.js needs.
- `lib/google-calendar.ts` — small server-only helpers that call the Google Calendar REST API.
- `app/page.tsx` — home page: sign-in button, or calendars + next-7-days events when signed in.
- `.env.local` — secrets (never committed). See `.env.local.example` and `SETUP.md`.
