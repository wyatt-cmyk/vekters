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
    async jwt({ token, account }) {
      if (account) {
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

async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, error: "RefreshTokenError" };
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Google token refresh failed:", data);
    // The page checks for this error and asks the user to sign in again.
    return { ...token, error: "RefreshTokenError" };
  }

  return {
    ...token,
    accessToken: data.access_token,
    expiresAt: Math.floor(Date.now() / 1000 + data.expires_in),
    // Google usually doesn't send a new refresh token; keep the old one.
    refreshToken: data.refresh_token ?? token.refreshToken,
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
