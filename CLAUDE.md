@AGENTS.md

# Vekters — an AI calendar for student athletes

The product is called **Vekters**. The wordmark and monogram live in `public/brand/`.

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

## Design — Vekters
The source of truth is `vekters-handoff/`, a design handoff produced in Claude Design. Read `vekters-handoff/CLAUDE_CODE_HANDOFF.md` first. `design/Main.dc.html` and `design/Mobile.dc.html` are the finished designs; they are canvas-format, not production code, so rebuild rather than copy. Where the written spec and the design files disagree, follow the design files.

Tokens are in `vekters-handoff/tokens/tokens.css` and are mirrored into `app/globals.css` as Tailwind theme tokens. **Use the tokens in components, never a raw hex.**

- Surfaces: page/sidebar `bg-bg` #F5F5F0, grid `bg-surface` white, right rail `bg-panel` #FBFBF8, today's column `bg-today-col`.
- Text: `text-ink` #171717, `text-muted` #6B6B66, `text-faint` #6F6F69, `text-on-event` #4F4F4A, `text-body` #3F3F3B, `text-danger` #9B2C2C.
- Lines: `border-line` #E4E4DF, `border-line-soft` for hour lines, `bg-nav-active`, `bg-hover`, `bg-cell-hover`.
- Calendar colours are a pastel for the event block plus a darker dot for indicators: `cal-blue`, `cal-green`, `cal-peach`, `cal-pink`, `cal-lavender` and their `-dot` pairs.
- Fonts: **Geist** 400/500/600 for everything functional, **Instrument Serif** 400 (and italic) for the month heading and event titles only.
- Radii: `rounded-chip` 5, `rounded-event` 7, `rounded-control` 8, `rounded-card` 10, `rounded-sheet` 18.
- Layout: `w-sidebar` 252px, `w-rail` 316px, `w-gutter` 64px, `h-hour` 64px (the grid runs 6 AM to 10 PM).
- Motion: `--vk-dur-fast` 180ms, `--vk-dur` 260ms, `--vk-dur-panel` 280ms, all collapsing to 0 under `prefers-reduced-motion`.

Today, the now line and primary buttons are ink by default. The Settings colour picker still overrides `--color-accent` per person, and "Ink" is the default choice.

### Two decisions that differ from the handoff
- **The assistant lives in the right rail.** The design has sidebar + calendar + details panel and never mentions the AI chat, which is this app's point. At 1366px the sidebar and rail already take 568px, so a third column is impossible. The rail holds the assistant now; the event details panel joins it as a second tab in phase 4.
- **The sidebar nav lists only real destinations** (Calendar, Today, Import, Settings). The design also shows Tasks and Search; Tasks doesn't exist and Search arrives in phase 5, and dead nav items are worse than missing ones.

### Build phases
1. **Done.** Tokens, fonts, brand assets, the three-column shell, the assistant rehomed to the rail, and the event block reshaped to the design (colour dot, title, time).
2. **Done.** The week hour grid: 64px an hour, time gutter, sticky header, all-day row, overlap lanes, now line on today, click an empty hour to create.
3. **Done.** Day and Month views, the mini calendar, date jumping, the view switcher.
4. **Done.** The details panel moved into the rail as a second tab, replacing the modal dialog.
5. **Done.** Search, per-calendar visibility toggles, and the five pastels.
6. **Done.** Mobile day agenda and bottom sheet below 768px.
7. **Done.** Motion, reduced motion, keyboard access, focus rings.

**Nothing from the design is hardcoded.** Its events, times, attendees, notes and calendar names (School, Athletics, Personal, Social, Flight Training) are all sample data. Every view reads the real calendars.

### Not designed yet
Drag to reschedule or resize, Tasks, a tablet layout with a collapsible sidebar. The details panel also designs a cover photo, reminders, recurrence and attendees, which our event data has no fields for; hide them rather than invent them.

## Project layout (kept up to date as we build)
- `auth.ts` — Auth.js config: Google provider, calendar scopes, token refresh.
- `app/api/auth/[...nextauth]/route.ts` — the sign-in/sign-out endpoints Auth.js needs.
- `app/page.tsx` — week view: week navigation (`?week=`), filter chips (`?hide=`), 7-column grid, and the event dialog (`?cal=&ev=`, `&edit=1`, `&del=1`, `?new=1`).
- `components/event-dialog.tsx` — event details, the hand-edit form, and the delete confirmation.
- `app/welcome/page.tsx` + `components/landing.tsx` — the landing page. Also shown at `/` when signed out.
- `app/calendars/page.tsx` — the Settings page: personal settings, plus a category and colour per calendar.
- `lib/settings.ts` — the settings type, the colour palettes, and the ONLY code that reads or writes settings storage.
- `app/actions.ts` — server actions: calendar tags and colours, `saveSettings`, `confirmProposal`, `confirmImport`, plus `saveEventForm` and `deleteEventForm` for hand edits. These are the ONLY code that writes events.
- `app/api/chat/route.ts` — POST endpoint for the AI chat; checks input and sign-in, runs the AI on the server.
- `components/right-rail.tsx` — the 316px rail: the Assistant and Details tabs.
- `components/event-panel.tsx` — the event details sheet shown in the rail.
- `components/chat-panel.tsx` — the chat itself (client component) with confirmation cards. The rail owns its frame.
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
- `components/sidebar.tsx` — the 252px left rail: wordmark, nav, calendar legend, sign out.
- `components/` — week grid, chat panel, event dialog, sign-in screen, notice box.
- `components/app-header.tsx` — the old top bar, still used by Settings and Import until they move onto the sidebar shell.
- `public/brand/` — the Vekters wordmark and monogram. PNG only; use an SVG if an original ever turns up.
- `lib/calendar-data.ts` — decides demo vs. real Google data, for reading (`loadWeek`, `getEventsBetween`) and writing (`createEventFromProposal`).
- `lib/google-calendar.ts` — server-only helpers that call the Google Calendar REST API, with `GoogleCalendarError` turning Google's errors into plain messages.
- `components/setup-warnings.tsx` — banners for missing Google permissions and calendars that wouldn't load.
- `lib/demo-data.ts` — sample calendars and events in Google's format.
- `lib/week.ts` — date helpers. Days are plain "YYYY-MM-DD" strings; the week start is a setting.
- `lib/week-layout.ts` — pure maths for the hour grid: minutes within a day, overlap lanes (ported from the design's `layout()`), the hour window, pixel boxes.
- `components/week-client.tsx` — the only client bits of the grid: the now line and the opening scroll.
- `components/month-grid.tsx` — six rows of seven days, three chips a day plus "+N more".
- `components/mini-calendar.tsx` — the small month in the sidebar.
- `components/search-box.tsx` — the header search; the only client component outside the chat and the grid's two helpers.
- `components/mobile-day.tsx` — the phone layout: monogram, day strip, agenda.
- `components/modal.tsx` — a native `<dialog>` wrapper; the edit and delete dialogs sit in it.
- `lib/tags.ts` — calendar tags, stored in a cookie (per browser, no database yet), with name-based guesses.
- `.env.local` — secrets (never committed). See `.env.local.example` and `SETUP.md`.

## Demo mode
Sample data, no sign-in. Events confirmed from the chat live in server memory and vanish on restart.

**It can't switch itself on in production.** In development it turns on when the Google keys are missing; in production you have to set `DEMO_MODE=true` by name. Otherwise a deployment with no keys would become an open demo whose assistant has no sign-in gate, and anyone with the link could spend the Anthropic credits.

Even when it is asked for in production, `/api/chat` and `/api/import` refuse with a 403. A deployed demo is a shop window: it shows the calendar, it cannot spend money.

With no Google credentials at all, the pages render `NotConfigured` instead of a sign-in button that cannot work.

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

## Personal settings
Each person picks their own colour, week start, clock format, and a colour per calendar. Everything is read through `lib/settings.ts`.

- **Your colour** overrides the `--color-accent` token with an inline style on the week page, so every `bg-accent` and `text-accent` below it follows with no extra wiring. Six presets, all dark enough for white text.
- **Week starts on** Monday or Sunday. `startOfWeek()` takes it; `loadWeek()` passes it through.
- **Times** 12-hour or 24-hour. `formatEventTime()` takes it.
- **Calendar colour** is one of eight presets per calendar, used for the small category label on each event. A calendar with no choice falls back to one that matches its tag, so a fresh account still looks deliberate. Tags still drive the filter chips; colour is only appearance.
- Every control is a plain form posting to a server action, so settings work without JavaScript.

### Where settings live, and the limit
In a cookie, like the calendar tags. Each person gets their own, because nobody shares a browser profile, but **they do not follow you between devices**: set them again on your phone. Fixing that needs a database keyed by the Google account id. When that happens, only `readSettings` and `writeSettings` in `lib/settings.ts` change; nothing else in the app touches storage.

## The landing page: same materials, different scale
`components/landing.tsx` is the front door. It uses exactly the Vekters materials — the tokens, Geist, Instrument Serif, the five pastels — but at a scale the app never uses: huge type, a lot of air, scroll animation. One is read once; the other is used every day. **Don't push the landing page's scale into the week view.**

- It loads no fonts and defines no colours of its own. Everything comes from `globals.css`, so the page can't drift from the app.
- Type: Geist for the big headings, Instrument Serif italic for one line per section.
- Layout: 12-column grid used asymmetrically. Nothing is a centred three-card row.
- Motion is pure CSS scroll-driven animation (`.reveal`, `.nav-settle` in `globals.css`). Content is visible by default, so nothing depends on JavaScript, on scroll-timeline support, or on ignoring `prefers-reduced-motion`.
- Copy carries no invented numbers or testimonials. If a real figure is ever wanted, put it in as a placeholder rather than making one up.
- The week still in the showcase is hand-written markup, not the real `WeekGrid`, because it has no data to render. It scrolls sideways on a narrow screen.

## The hour grid
`components/week-grid.tsx` draws the week; `lib/week-layout.ts` does the maths and has no React in it.

- 64px to the hour, a 64px gutter, and one CSS grid template shared by the headings, the all-day row and the body, so the three stay aligned.
- **The hour window stretches.** The design fixes 6 AM to 10 PM; a 5 AM practice would fall off it, so `hourWindow()` widens the range to hold whatever the week contains. It never hides an event.
- **Overlap lanes** are ported from `layout()` in `design/Main.dc.html`: group events into clusters that touch, then give each the first lane whose previous event has finished. Each block gets `width: 100/lanes %` and `left: lane * that`.
- **All-day events** are lifted out into a sticky row; the row disappears entirely when the week has none.
- **An event block tints itself** from its calendar's colour through `color-mix` in the `.ev` rule, so one inline `--ev` drives the fill, the border and the hover. The selected block gets the design's 1.5px inset outline.
- **Empty hours are links** to `?new=1&date=…&at=HH:MM`, which opens the form with that hour filled in and a one-hour end, as the handoff specifies. A blank end still means two hours, which is the rule the assistant and the importer use. Those links sit outside the tab order on purpose: 112 of them would swamp keyboard navigation, and New event reaches the same form.
- **The now line and the opening scroll** are the only parts that need the browser. The line renders nothing until mounted, so the server and the browser can't disagree about the time, and it moves every minute.

## Three views, one URL
`app/page.tsx` renders Day, Week and Month. Everything on screen comes from the query string, so any view can be bookmarked, shared or reached with the back button.

- `?view=day|week|month` (week is the default and is left out of the URL), `?d=YYYY-MM-DD` for the date the view is anchored on (today when absent), `?hide=` for the filter chips, `?mc=` for the month the mini calendar is showing.
- **One fetch per load.** `loadRange()` takes a callback instead of a range, because the range depends on today and on the time zone, and both arrive with the calendars. The callback runs after that single trip.
- **Day view is the week grid with one column.** `WeekGrid` takes however many days it's given and builds its CSS grid template from the count; nothing about Day view is special-cased.
- **Month is always six rows**, so its height doesn't jump between months. Rows have a floor of 118px, enough for a date, three chips and the "+N more"; `auto-rows-fr` alone lets a row collapse under its content.
- **The arrows follow the view**: a day, a week, or a whole month. Stepping by a week keeps the weekday, because the anchor is a real date.
- **Tapping a day heading, or a date in Month view, opens that day on its own.** The mini calendar jumps anywhere and shades the days the main view is showing; today keeps its accent circle rather than the shade.
- **Building URLs:** `buildHref` takes the core bits (`d`, `view`, `hidden`) separately from `extra`, so a caller can't half-override the filters. That bug bit once: a chip that cleared the last filter left `hide=` in the URL.

## The right rail
`components/right-rail.tsx` holds the assistant and the event details as two tabs. Selecting an event switches to Details; the Assistant tab goes back without dropping the selection (`?tab=chat`).

- **Both panels stay mounted and one is hidden**, rather than swapping. The chat keeps its conversation and whatever is half-typed in the box. Unmounting it would throw both away, and the conversation is the server's only memory of the exchange.
- **The panel is an information sheet, not a popup**: a small category label in the calendar's colour, the title in Instrument Serif, then When, Where, Notes and Who. The V monogram sits behind it at very low opacity, which is what the handoff keeps it for.
- **Fields with nothing behind them are left out, not faked.** The design shows a cover photo, reminders and recurrence; our event data has no such fields, so those sections simply don't exist. Description and attendees were added to `CalendarEvent` because Google already returns them on every event it lists, so reading them costs nothing.
- **Edit and Delete stay dialogs.** A form wants the focus and a 316px rail is a poor place for one. The panel's buttons open the same `EventForm` and `DeleteConfirm` as before.

## Colours, filtering and search
**Five pastels, each with a dot.** `CALENDAR_COLORS` in `lib/settings.ts` is now the design's set: blue, green, peach, pink, lavender, each a pastel for event blocks plus a darker dot for indicators. **The dots are too light to read as text** — `#6F8FBF` on white is about 2.9:1 — so they only ever appear as a shape. Words stay ink, `text-on-event` or muted. The event panel's category label is muted text with a coloured square beside it, not coloured text.

An event block paints itself through two inline variables, `--ev-bg` and `--ev-dot`, which the `.ev` rule in `globals.css` turns into a fill, a border and a slightly more saturated hover. The eight solid colours this used to offer are mapped onto the five, so an earlier choice isn't thrown away.

**Two ways to filter, on purpose.** The header chips hide a whole category (School, Sports, Other) and live in the URL, so a filtered view can be shared. The sidebar checkboxes hide one calendar and live in settings, so they persist and apply in every view. The chips are the quick "just show me school"; the checkboxes are precise. The design only has the second; the first is this app's reason for existing.

**Search** writes `?q=` after a 250ms pause and the server filters, so a search is part of the address like everything else. It matches the event title, which is what the handoff specifies. Searching a place would also be useful and is a small change if it's ever wanted.

## Why `<body>` has suppressHydrationWarning
Browser extensions edit the page before React hydrates. Grammarly adds `data-gr-ext-installed` and `data-new-gr-c-s-check-loaded` to `<body>`; password managers do similar things. React compares the server HTML with what it finds, sees attributes it didn't write, and reports a hydration mismatch that has nothing to do with the app.

`suppressHydrationWarning` on `<body>` covers **that one element's attributes only**. A genuine mismatch inside any component is still reported, so this doesn't hide our own bugs. Don't remove it, and don't spread it to other elements to quieten a warning: anywhere else, a mismatch is real and worth fixing.

For reference, the app's own client components are already careful about this. `NowLine` renders nothing until it has mounted, so the server and the browser never disagree about the time, and every `crypto.randomUUID()` in the chat runs in an event handler rather than during render.

## The phone layout
Below 768px the week becomes an agenda, following `vekters-handoff/design/Mobile.dc.html`: the monogram, a strip of seven day pills with a dot on the days that have something, then the chosen day as a list. Each event's height still reflects how long it runs, so a two-hour game reads bigger than a thirty-minute quiz.

Three breakpoints, each for a reason:
- **Under 768px** the hour grid becomes the agenda. Seven columns at 390px is unreadable.
- **Under 1024px** the rail rises as a bottom sheet instead of standing as a column, which is what the mobile design does with details.
- **1024px and up** the sidebar appears and the layout is the full three columns.

**Day view still loads the whole week.** The phone needs a week of days for its strip, and the desktop grid simply renders one of them. It costs one fetch either way.

**The assistant gets a floating button**, next to New event. The design has no mobile home for the chat, but pasting a coach's text is something you do on a phone, so it can't be desktop-only. Both entry points open the same rail, so there is one chat in the tree and one conversation.

**Closing lives in the rail**, not in the panel. On a phone the sheet closes from its own header or by tapping away; on a desktop the X appears only when Details is open, where it clears the selection. The panel used to carry its own X, which gave the phone sheet two.

## Motion and keyboard
**Motion** follows the design's three durations: `--vk-dur-fast` 180ms for hovers, `--vk-dur` 260ms for an event fading in, `--vk-dur-panel` 280ms for the sheet rising. Under `prefers-reduced-motion: reduce` the three collapse to zero *and* a blanket rule cuts every animation and transition, so nothing moves whatever set it going. The landing page's scroll animations already sit inside a `no-preference` query.

**Dialogs are a real `<dialog>`**, opened with `showModal()` (`components/modal.tsx`). Doing it natively rather than with a positioned div gives three things that are tedious by hand: focus moves into the dialog and stays trapped, Escape closes it, and the rest of the page becomes inert to the keyboard and to screen readers. Which dialog is open is still decided by the URL, so closing navigates rather than flipping state. The first real field takes focus on open.

**Focus rings** are a 2px ink outline on every link, button and field, because several controls here are styled links whose default ring is easy to miss. The landing page's dark bands use `.on-dark`, which swaps the ring to paper so it doesn't vanish.

**A skip link** jumps past the sidebar to the calendar, which is otherwise a lot of links to tab through.

### A cascade-layer trap worth remembering
Tailwind 4 puts its utilities in `@layer utilities`. Plain CSS written in `globals.css` outside any layer is **unlayered, and unlayered styles beat layered ones**, whatever the specificity. A bare `dialog { max-width: 100vw }` silently overrode `max-w-md` on the dialog and made it full width. If a utility class mysteriously does nothing, check for an element rule in `globals.css` setting the same property.

## What makes the assistant feel obvious
Six changes, after reading the panel as a student would:

- **Enter sends, Shift+Enter makes a new line.** It used to be Ctrl+Enter, which is backwards for a chat. Pasting multi-line text works either way, so there was never a reason for it.
- **It knows what's on screen.** Every message carries the visible date and view, so "add a team meeting at 4" means the day you're looking at, not today. "Today" and "tomorrow" still mean today and tomorrow. This rides with the message, never in the system prompt, which has to stay byte-identical across a conversation (see the preserved-thinking note above).
- **A failure doesn't eat your message.** The text goes back in the box and the error offers Try again, which replaces the failed exchange instead of stacking a second copy of the same message under the first.
- **Waiting looks alive.** Three pulsing dots, and after eight seconds it says so, because a motionless "Thinking…" for twenty seconds reads as broken.
- **New chat** clears the conversation. The server keeps nothing between messages, so clearing the browser's copy is the whole job.
- **The empty state says what it can do** — add, move, rename, cancel, answer — rather than only showing two examples, and the examples now cover a change, a cancellation and a question.

## Deploying
`DEPLOY.md` has the steps. Things to keep in mind when changing code:

- **Functions are capped at 60 seconds on Vercel's free plan**, which is why `maxDuration` is 60 in both API routes rather than the 120 and 300 they started at. Chat takes 10 to 20 seconds and a season import about 15, so there is headroom, but don't raise those numbers without checking the plan.
- **Requests are capped at 4.5 MB**, which is why uploads are limited to 4 MB.
- The production redirect URI (`https://<app>.vercel.app/api/auth/callback/google`) has to be added to the Google OAuth client alongside the localhost one, or sign-in fails on the deployed site only.
