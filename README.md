# Vekters

A calendar for high school student athletes. School assignments and sports schedules in one week, with an assistant that turns a coach's text message into calendar events you approve before anything is written.

Built on Google Calendar, so whatever you confirm here shows up on your phone, your watch and anywhere else you already look. There is no second database holding your week.

## What it does

- **One week, both lives.** Classes, assignments, practices and games on a single hour grid, with Day and Month views, a mini calendar and search.
- **Paste a text.** "Practice moved to 4:30 tomorrow, weight room" becomes a change to the practice that's already there, not a duplicate. Every create, move and cancel arrives as a card showing exactly what will change.
- **Import a season.** Paste a schedule, or upload a PDF or a photo of the one taped inside your locker. Everything comes back as a checklist with duplicates and missing times flagged.
- **Edit by hand too.** Tap any event to open, change or delete it. The assistant is a convenience, not the only way in.

## Running it locally

```bash
npm install
npm run dev
```

Without any credentials it starts in **demo mode**: sample data, no sign-in, so you can look around. To use your real calendar you need a Google OAuth client, and to use the assistant you need an Anthropic API key.

- **`SETUP.md`** — the Google Cloud and Anthropic setup, step by step.
- **`DEPLOY.md`** — putting it on Vercel.
- **`CLAUDE.md`** — how the code is organised, the design system, and the decisions behind both.
- **`vekters-handoff/`** — the design this is built from.

## A note on secrets

Secrets live in `.env.local`, which is git-ignored and must stay that way. `.env.local.example` shows which keys are needed without containing any. Nothing secret has ever been committed to this repository, and none of it reaches the browser: every module that can see an access token is marked `server-only`.

If you deploy this, set a monthly spend limit on your Anthropic account before sharing the link. Every assistant message costs money.

## Status

The app is complete and runs on sample data. Connecting a real Google account is a setup step, not a code change. Still to come: drag to reschedule, repeating events created in the app, and an iOS build.
