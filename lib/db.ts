// The only file that opens a connection to Supabase.
//
// Everything here runs on the server. The key we use is the SERVICE ROLE key,
// which bypasses row-level security completely -- it can read and write every
// row in every table, for every user. That is why:
//
//   * this file is marked `server-only`, so importing it from a component that
//     ships to the browser is a build error rather than a quiet leak, and
//   * the key is read from a variable with no NEXT_PUBLIC_ prefix, because
//     anything with that prefix is inlined into the JavaScript bundle.
//
// The browser never talks to Supabase. Our server does, after Auth.js has
// already said who the visitor is. That is also why the tables have RLS on and
// no policies: there is no second path in to police.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let client: SupabaseClient | null = null;

// Made once and reused. A new client per request would open a new connection
// pool each time, which on a serverless host is how you exhaust the database's
// connection limit under load.
export function db() {
  if (!supabaseConfigured()) {
    throw new Error(
      "Supabase isn't set up. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local — see SETUP.md.",
    );
  }
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        // We are not using Supabase Auth. There is no user session to persist
        // and nothing to refresh; sign-in is Auth.js. Leaving these on makes
        // the client try to manage a session that does not exist.
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
}

// --- Users -----------------------------------------------------------------

export type AppUser = { id: string; google_sub: string; email: string | null; display_name: string | null };

// Called after Auth.js has verified the Google sign-in. Keyed on Google's
// `sub` claim rather than the email, because schools recycle addresses and a
// new student must never land on the previous one's row.
export async function upsertUser(input: { googleSub: string; email?: string | null; name?: string | null }) {
  const { data, error } = await db()
    .from("app_user")
    .upsert(
      {
        google_sub: input.googleSub,
        email: input.email ?? null,
        display_name: input.name ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "google_sub" },
    )
    .select("id, google_sub, email, display_name")
    .single();

  if (error) throw new Error(`Couldn't save your account: ${error.message}`);
  return data as AppUser;
}

// --- Google credentials ----------------------------------------------------

// Stored so a feed can be built while the student is asleep. This is the most
// dangerous row in the database: a refresh token is standing permission to
// read someone's calendar until they revoke it. Nothing outside the feed
// endpoint and the token-refresh helper should ever call these two functions.
export async function saveRefreshToken(userId: string, refreshToken: string, scope?: string) {
  const { error } = await db()
    .from("google_credential")
    .upsert({ user_id: userId, refresh_token: refreshToken, scope: scope ?? null, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Couldn't save your Google connection: ${error.message}`);
}

export async function getRefreshToken(userId: string) {
  const { data, error } = await db()
    .from("google_credential")
    .select("refresh_token, scope")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Couldn't read your Google connection: ${error.message}`);
  return data as { refresh_token: string; scope: string | null } | null;
}

// Used when a student disconnects. Deliberately a hard delete: a refresh token
// we no longer need is a liability, not history worth keeping.
export async function forgetRefreshToken(userId: string) {
  const { error } = await db().from("google_credential").delete().eq("user_id", userId);
  if (error) throw new Error(`Couldn't disconnect Google: ${error.message}`);
}
