// Auth.js (NextAuth v5) configuration.
//
// What this file does:
//  1. Sets up "Sign in with Google" and asks Google for calendar permissions (scopes).
//  2. Saves the Google access token in the user's session cookie (encrypted JWT).
//  3. Silently refreshes the access token when it expires (Google tokens last ~1 hour).
//
// Auth.js automatically reads AUTH_SECRET, AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET
// from .env.local, so we don't have to pass them in here.

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";
import { exchangeRefreshToken } from "./lib/google-token";
import { saveRefreshToken, supabaseConfigured, upsertUser } from "./lib/db";

// The permissions we ask for. openid/email/profile are the basics for sign-in.
// The two calendar scopes are the ones from CLAUDE.md.
// The two calendar permissions the app can't work without. Google lets people
// untick permissions on the consent screen, so we check what we actually got.
export const REQUIRED_SCOPES = {
  "https://www.googleapis.com/auth/calendar.events": "See and add your calendar events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly": "See the list of your calendars",
};

const SCOPES = ["openid", "email", "profile", ...Object.keys(REQUIRED_SCOPES)].join(" ");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: SCOPES,
          // "offline" makes Google give us a refresh_token so the app keeps
          // working after the 1-hour access token expires.
          access_type: "offline",
          // Google only sends the refresh_token on the first consent. Forcing the
          // consent screen every sign-in guarantees we always get one.
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    // Runs whenever the JWT is created or read. `account` is only present
    // right after a fresh sign-in.
    async jwt({ token, account, profile }) {
      if (account) {
        // Keep a copy of the refresh token in our own database, because the
        // calendar feed has to read this student's calendar when they are not
        // here -- no browser, no cookie, nothing to decrypt.
        //
        // Wrapped so it can never break sign-in. If Supabase is missing or
        // down, the student still gets into the app; only the feed is stale
        // until they sign in again. Losing the calendar because a side table
        // was unreachable would be a far worse trade.
        await rememberUser(token, account, profile).catch((err) => {
          console.error("Couldn't save the Google connection:", err?.message ?? err);
        });

        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at, // seconds since 1970
          // A space-separated list of what the student agreed to.
          scope: account.scope,
        };
      }

      // Token still valid (with a 60-second safety margin)? Use it as-is.
      if (token.expiresAt && Date.now() < (token.expiresAt - 60) * 1000) {
        return token;
      }

      // Otherwise trade the refresh token for a new access token.
      return refreshAccessToken(token);
    },

    // Copies what the server needs from the JWT onto the session object that
    // `auth()` returns. We only ever read the session in server code.
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.missingScopes = missingScopes(token.scope);
      return session;
    },
  },
});

// Records who signed in and keeps their refresh token, so the calendar feed
// can read their calendar while they're asleep. Called once per sign-in.
//
// Every failure in here is swallowed by the caller: this is a side effect, not
// part of signing in. The one thing it must never do is stop a student getting
// into their calendar.
async function rememberUser(
  token: JWT,
  account: { refresh_token?: string | null; scope?: string | null },
  profile?: { email?: string | null; name?: string | null } | null,
) {
  if (!supabaseConfigured()) return;

  // Google's subject claim, stable for the life of the account. Auth.js puts
  // it on `token.sub`.
  const googleSub = token.sub;
  if (!googleSub) return;

  const user = await upsertUser({ googleSub, email: profile?.email, name: profile?.name });

  // Google only sends a refresh token on the first consent, which is why
  // auth.ts asks for `prompt: "consent"` every time. If one somehow doesn't
  // arrive, keep whatever we already stored rather than wiping it.
  if (account.refresh_token) {
    await saveRefreshToken(user.id, account.refresh_token, account.scope ?? undefined);
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, error: "RefreshTokenError" };
  }

  // The exchange itself lives in lib/google-token.ts, because the calendar
  // feed has to do exactly the same thing with no session present. One copy
  // means the two can't drift apart.
  const result = await exchangeRefreshToken(token.refreshToken);

  if (!result.ok) {
    console.error("Google token refresh failed:", result.error);
    // The page checks for this error and asks the user to sign in again.
    return { ...token, error: "RefreshTokenError" };
  }

  return {
    ...token,
    accessToken: result.accessToken,
    expiresAt: result.expiresAt,
    // Google usually doesn't send a new refresh token; keep the old one.
    refreshToken: result.refreshToken ?? token.refreshToken,
    error: undefined,
  };
}

// Which required permissions the student didn't grant. Empty means all good.
// A full-access "calendar" permission covers both, so it counts too.
export function missingScopes(granted?: string): string[] {
  if (!granted) return [];
  const list = granted.split(" ");
  if (list.includes("https://www.googleapis.com/auth/calendar")) return [];
  return Object.entries(REQUIRED_SCOPES)
    .filter(([scope]) => !list.includes(scope))
    .map(([, label]) => label);
}
