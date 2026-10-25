-- Vekters: the first real storage this project has had.
--
-- Why it exists now: an .ics feed URL is fetched by Google's servers while the
-- student is asleep. No browser, no cookie, no session. Everything the app
-- knew until now lived in a cookie, which is by definition only readable when
-- that one browser asks. A feed needs the opposite direction of lookup --
-- token -> user -> Google credential -- and only a server-side store can do it.
--
-- Identity note: sign-in is Auth.js, NOT Supabase Auth. Supabase is pure
-- storage here, reached only by our Next.js server holding the service role
-- key. That is why every table below enables RLS and then defines no policy at
-- all: anon and authenticated get nothing, and the service role bypasses RLS.
-- If we ever let the browser talk to Supabase directly, policies get written
-- then, deliberately, rather than being left permissive by accident now.

-- One row per Google account that has ever signed in.
create table if not exists public.app_user (
  id            uuid primary key default gen_random_uuid(),
  -- Google's stable subject claim. Not the email: people change those, and a
  -- reused school address must never inherit the previous student's calendar.
  google_sub    text not null unique,
  email         text,
  display_name  text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- Replaces the `settings` and `calendar-tags` cookies. Keyed by user, so two
-- students on one Chromebook no longer share one another's colours and tags.
create table if not exists public.user_settings (
  user_id           uuid primary key references public.app_user(id) on delete cascade,
  accent            text not null default 'ink',
  week_start        text not null default 'monday',
  clock             text not null default '12',
  -- calendarId -> colour id, and calendarId -> 'school'|'sports'|'other'.
  -- jsonb rather than columns because the keys are Google's calendar ids.
  colors            jsonb not null default '{}'::jsonb,
  tags              jsonb not null default '{}'::jsonb,
  hidden_calendars  jsonb not null default '[]'::jsonb,
  updated_at        timestamptz not null default now()
);

-- The Google refresh token, so a feed can be built without the student present.
-- This is the most sensitive table in the project: a refresh token is standing
-- permission to read someone's calendar. Service role only, never the browser,
-- and deliberately its own table so it is never selected by accident along
-- with ordinary profile fields.
create table if not exists public.google_credential (
  user_id       uuid primary key references public.app_user(id) on delete cascade,
  refresh_token text not null,
  scope         text,
  updated_at    timestamptz not null default now()
);

-- A subscribable feed. One student may have several: a full one for their own
-- phone, a narrower one for a coach.
create table if not exists public.calendar_feed (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.app_user(id) on delete cascade,
  -- The SHA-256 of the token, never the token itself. Treated like a password:
  -- if this table ever leaks, nobody gets a working feed URL out of it. The
  -- plaintext is shown to the student once, at creation, and never again.
  token_hash      text not null unique,
  label           text,
  -- 'all' is the whole Vekters week; 'sports' is practices and games only.
  scope           text not null default 'all' check (scope in ('all', 'sports')),
  created_at      timestamptz not null default now(),
  -- Revoking is a timestamp, not a delete, so a student can see that a link
  -- they gave out has been turned off rather than wondering if it ever existed.
  revoked_at      timestamptz,
  last_fetched_at timestamptz,
  fetch_count     integer not null default 0
);

create index if not exists calendar_feed_user_idx on public.calendar_feed (user_id);

-- Deny-all by default. See the identity note at the top: no policies is the
-- point, not an omission.
alter table public.app_user          enable row level security;
alter table public.user_settings     enable row level security;
alter table public.google_credential enable row level security;
alter table public.calendar_feed     enable row level security;
