// GET /feed/<token>.ics — the public calendar feed.
//
// This is the only route in the app that serves a student's calendar to a
// request with no sign-in. Google's fetcher arrives with no cookie, no
// session, and no way to prove who it is, so the token in the URL is the
// entire security model. Everything here follows from that:
//
//   * Unknown, revoked and malformed tokens all get the same 404 with the same
//     body. A probe must not be able to tell "no such feed" from "that feed
//     was turned off", because the difference confirms a token once existed.
//   * No caching anywhere. A shared cache holding one student's calendar and
//     handing it to the next requester is the worst bug this route could have.
//   * noindex, because capability URLs do leak -- in 2019 researchers found
//     thousands of Google Calendars indexed by search engines this way.
//
// What it serves: whatever the student sees in Vekters, over a window around
// today. Hidden calendars stay hidden, because the feed should match the app.

import { buildFeed } from "@/lib/ics";
import { findFeedByToken, noteFetch } from "@/lib/feed";
import { getRefreshToken } from "@/lib/db";
import { exchangeRefreshToken } from "@/lib/google-token";
import { listCalendars, listEvents } from "@/lib/google-calendar";
import { guessTag } from "@/lib/tags";
import { db } from "@/lib/db";

// A season of events across a lot of calendars takes a while. 60s is Vercel's
// Hobby ceiling.
export const maxDuration = 60;
// Never prerendered, never cached by the framework: the response depends
// entirely on a token in the path.
export const dynamic = "force-dynamic";

// How much of the calendar to publish. A little history so a parent opening it
// mid-week still sees Monday, and far enough ahead to cover a whole season.
const DAYS_BACK = 30;
const DAYS_AHEAD = 180;

// One response for every failure. Deliberately says nothing useful.
function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const raw = (await context.params).token;
  // The URL ends in .ics so it looks like a calendar file to humans and to the
  // handful of clients that sniff the extension. The suffix is decoration.
  const token = raw.endsWith(".ics") ? raw.slice(0, -4) : raw;

  let feed;
  try {
    feed = await findFeedByToken(token);
  } catch {
    // A database outage must not leak as a different status than a bad token.
    return notFound();
  }
  if (!feed) return notFound();

  // From here the token is valid, so errors can be honest -- the caller has
  // already proved they hold the link.
  const credential = await getRefreshToken(feed.user_id).catch(() => null);
  if (!credential) {
    return new Response("This calendar's owner needs to sign in to Vekters again.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }

  const exchanged = await exchangeRefreshToken(credential.refresh_token);
  if (!exchanged.ok) {
    // Usually invalid_grant: access was revoked in the Google account, or the
    // password changed. Nothing the subscriber can do, and nothing we should
    // retry in a loop.
    return new Response("This calendar is temporarily unavailable.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - DAYS_BACK);
  const to = new Date(now);
  to.setDate(to.getDate() + DAYS_AHEAD);

  let events;
  let calendarName = "Vekters";
  try {
    const calendars = await listCalendars(exchanged.accessToken);

    // The student's own preferences, so the feed matches what they see.
    // Reading straight from the row because there is no cookie to read.
    const { data: settings } = await db()
      .from("user_settings")
      .select("tags, hidden_calendars")
      .eq("user_id", feed.user_id)
      .maybeSingle();

    const savedTags = (settings?.tags ?? {}) as Record<string, string>;
    const hidden = new Set((settings?.hidden_calendars ?? []) as string[]);

    const wanted = calendars.filter((cal) => {
      if (hidden.has(cal.id)) return false;
      if (feed.scope === "all") return true;
      // 'sports' feeds carry practices and games only -- the version you hand
      // to a coach without also handing over every chemistry test.
      const tag = savedTags[cal.id] ?? guessTag(cal.summary);
      return tag === "sports";
    });

    events = await listEvents(exchanged.accessToken, wanted, from.toISOString(), to.toISOString());
    if (feed.scope === "sports") calendarName = "Vekters — Sports";
  } catch {
    return new Response("This calendar is temporarily unavailable.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }

  const body = buildFeed(events, { calendarName, now });

  // Not awaited: a failure to record the fetch must never stop the calendar
  // being served, and the subscriber shouldn't wait on our bookkeeping.
  void noteFetch(feed.id);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // inline, not attachment: the URL should be pasteable, and some clients
      // behave oddly when a subscription target asks to be downloaded.
      "Content-Disposition": 'inline; filename="vekters.ics"',
      // private: a shared cache must never hold this. no-store: nor anything else.
      "Cache-Control": "private, no-store, max-age=0",
      // Capability URLs have been indexed by search engines before.
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
