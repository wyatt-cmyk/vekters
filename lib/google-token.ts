// Trades a refresh token for a fresh access token.
//
// This exists as its own file because two very different callers need it:
//
//   * auth.ts, when a signed-in student's hour-old access token has expired,
//     and
//   * the feed endpoint, which runs when Google's crawler fetches an .ics URL
//     at three in the morning. There is no session there, no cookie, and no
//     person -- only a stored refresh token.
//
// Keeping one copy means the second caller can't quietly drift from the first.
// It needs the client secret, which is why it is server-only: the exchange is
// Google proving the request came from our app, not from whoever found a
// refresh token lying around.

import "server-only";

export type TokenExchange =
  | { ok: true; accessToken: string; expiresAt: number; refreshToken?: string }
  | { ok: false; error: string };

export async function exchangeRefreshToken(refreshToken: string): Promise<TokenExchange> {
  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
    return { ok: false, error: "Google isn't set up on this deployment." };
  }

  let res: Response;
  try {
    res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID,
        client_secret: process.env.AUTH_GOOGLE_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
  } catch {
    return { ok: false, error: "Couldn't reach Google." };
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Google says "invalid_grant" when the student revoked our access at
    // myaccount.google.com, changed their password, or the token simply went
    // stale. It is not a bug and not worth a noisy log: the feed should go
    // quiet until they sign in again.
    return { ok: false, error: typeof data.error === "string" ? data.error : "Token refresh failed." };
  }

  return {
    ok: true,
    accessToken: data.access_token,
    expiresAt: Math.floor(Date.now() / 1000 + (data.expires_in ?? 3600)),
    // Google usually doesn't send a new one; the caller keeps the old.
    refreshToken: data.refresh_token,
  };
}
