// Calendar feeds: the secret URLs a parent or coach can paste into their own
// calendar app to follow a student's schedule.
//
// The whole security model is the token in the URL. Google's servers fetch the
// feed with no cookie and no sign-in, so there is nothing else to check --
// whoever holds the link gets the calendar. That makes three things matter:
//
//   1. The token must be unguessable. The W3C TAG's guidance for URLs that
//      carry their own authority is 120 bits or more; we use 256.
//   2. We store only a SHA-256 of it, never the token. If this table leaks,
//      nobody gets a working URL out of it -- same reasoning as passwords.
//      The consequence is that we can show the full URL exactly once.
//   3. It must be revocable, because links get forwarded. Revoking writes a
//      timestamp rather than deleting the row, so a student can see that a
//      link they handed out is now off instead of wondering if it existed.

import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export type FeedScope = "all" | "sports";

export type Feed = {
  id: string;
  label: string | null;
  scope: FeedScope;
  created_at: string;
  revoked_at: string | null;
  last_fetched_at: string | null;
  fetch_count: number;
};

// 32 bytes of CSPRNG output. base64url so it survives being pasted into a URL
// bar, an email and a text message without re-encoding.
function newToken() {
  return randomBytes(32).toString("base64url");
}

// Plain SHA-256, not bcrypt. A password needs a slow hash because it is short
// and human-chosen, so an attacker can guess their way through the keyspace.
// A 256-bit random token cannot be guessed, so the only thing the hash has to
// do is be one-way.
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Returns the plaintext token ONCE. It is never recoverable afterwards.
export async function createFeed(userId: string, scope: FeedScope, label?: string) {
  const token = newToken();
  const { data, error } = await db()
    .from("calendar_feed")
    .insert({ user_id: userId, token_hash: hashToken(token), scope, label: label ?? null })
    .select("id, label, scope, created_at, revoked_at, last_fetched_at, fetch_count")
    .single();

  if (error) throw new Error(`Couldn't create the feed: ${error.message}`);
  return { feed: data as Feed, token };
}

export async function listFeeds(userId: string) {
  const { data, error } = await db()
    .from("calendar_feed")
    .select("id, label, scope, created_at, revoked_at, last_fetched_at, fetch_count")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Couldn't load your feeds: ${error.message}`);
  return (data ?? []) as Feed[];
}

// Scoped by user_id as well as id, so a crafted request can't revoke someone
// else's feed by guessing a uuid.
export async function revokeFeed(userId: string, feedId: string) {
  const { error } = await db()
    .from("calendar_feed")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", feedId)
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) throw new Error(`Couldn't turn off the feed: ${error.message}`);
}

// The lookup the public endpoint does. Returns null for an unknown token, a
// revoked one, or a malformed one -- the caller must answer all three the same
// way, so a probe can't tell "wrong token" from "revoked token".
export async function findFeedByToken(token: string) {
  // Cheap shape check before touching the database, so garbage doesn't cost a
  // round trip. 32 bytes base64url is always 43 characters.
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

  const { data, error } = await db()
    .from("calendar_feed")
    .select("id, user_id, scope, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error) throw new Error(`Couldn't read the feed: ${error.message}`);
  if (!data || data.revoked_at) return null;
  return data as { id: string; user_id: string; scope: FeedScope; revoked_at: string | null };
}

// Fire-and-forget bookkeeping so a student can see whether anyone is actually
// subscribed. Deliberately not awaited by the caller's critical path, and
// deliberately swallowing its own errors: failing to count a fetch must never
// stop the calendar being served.
export async function noteFetch(feedId: string) {
  try {
    await db()
      .from("calendar_feed")
      .update({ last_fetched_at: new Date().toISOString() })
      .eq("id", feedId);
  } catch {
    // ignored on purpose
  }
}
