# Setup: Google Cloud + local env

You need to do this once. It takes about 10 minutes.

Until you do, the app runs in **demo mode**: it skips sign-in and shows sample events so you can keep building. Demo mode turns off by itself once `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are filled in.

## 1. Create a Google Cloud project
1. Go to https://console.cloud.google.com and sign in with your Google account.
2. Click the project dropdown at the top → **New Project**.
3. Name it `Vekters` → **Create**. Make sure it's selected in the dropdown.

## 2. Turn on the Calendar API
1. Left menu → **APIs & Services → Library**.
2. Search **Google Calendar API** → open it → **Enable**.

## 3. Set up the OAuth consent screen (testing mode)
Google now calls this **Google Auth Platform**. Left menu → **Google Auth Platform** (or **APIs & Services → OAuth consent screen**).
1. **Get started** → App name `Vekters`, support email = your email.
2. Audience: **External**. (Testing mode is the default for new apps; you'll see "Publishing status: Testing".)
3. Contact email = your email → agree → **Create**.
4. Left tab **Audience → Test users → Add users**: add your own Gmail, plus any teammates who'll test. Only these accounts can sign in while the app is in testing mode.
5. Left tab **Data Access → Add or remove scopes**. Tick these, then **Update** and **Save**:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`

   The two calendar scopes are marked "sensitive". That's fine in testing mode; Google only reviews the app if you publish it publicly.

## 4. Create the OAuth client (this gives you the ID and secret)
1. Left tab **Clients** (or **APIs & Services → Credentials → Create credentials → OAuth client ID**).
2. Application type: **Web application**. Name: `Vekters (local)`.
3. **Authorized JavaScript origins**: `http://localhost:3000`
4. **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
   (This exact path is where Auth.js receives the login. Any typo here causes a `redirect_uri_mismatch` error.)
5. **Create**. Copy the **Client ID** and **Client secret**.

## 5. Fill in `.env.local`
Open `.env.local` in the project root (already created, and git-ignored). Paste in:
```
AUTH_GOOGLE_ID=<your client id>.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=<your client secret>
```
`AUTH_SECRET` is already filled in. It's a random string Auth.js uses to encrypt the session cookie.

## 6. Run it
```
npm run dev
```
Open http://localhost:3000 → **Sign in with Google**.

- You'll see a "Google hasn't verified this app" warning. That's normal in testing mode: click **Continue**.
- Approve the calendar permissions.
- You should land back on the app with your calendars and your next 7 days of events, including Toddle events.

## Anthropic API key (for the AI chat)
The chat works in demo mode too, but it needs this key either way.
1. Go to https://platform.claude.com and sign in or create an account. The old console.anthropic.com address redirects there.
2. Add credits under **Billing**. The smallest amount is five dollars. The app uses Claude Sonnet 5.5, which costs roughly one to three cents per chat message and four to ten cents per schedule import. Set a monthly spend limit under **Limits** first, so there are no surprises.
3. Go to **API keys → Create key**. Name it `Vekters (local)` and copy it. You only see it once.
4. Paste it into `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
5. Stop the dev server (Ctrl+C) and run `npm run dev` again. Next.js only reads `.env.local` when it starts.

Never paste this key into chat, code, or a commit. It stays in `.env.local` on the server only.

## When you deploy to Vercel (Milestone 7)
Add a second redirect URI to the same OAuth client: `https://<your-app>.vercel.app/api/auth/callback/google`, and set the env vars (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ANTHROPIC_API_KEY`) in the Vercel project settings. Don't deploy with demo mode on: in demo mode the chat has no sign-in, so anyone with the link could use your Anthropic credits.

## Common errors
The app now turns Google's errors into plain messages. Here's what each one means.

| What you see | What to do |
| --- | --- |
| `redirect_uri_mismatch` | The redirect URI in step 4 doesn't exactly match `http://localhost:3000/api/auth/callback/google`. |
| `access_denied` / "app is being tested" | Your account isn't in the Test users list (step 3.4). |
| "The Google Calendar API isn't turned on..." | Do step 2, wait a minute, then reload. |
| "This app wasn't given calendar permission" | You unticked a box on Google's screen. Sign out, sign in again, tick both. |
| "Missing Google permission" banner | Same as above. The app spotted it before you lost any work. |
| "Your Google sign-in expired or was turned off" | Sign out and back in. Also happens if you removed the app at myaccount.google.com/permissions. |
| "Couldn't load this calendar: X" | That one calendar failed; everything else still loaded. Usually a calendar shared with limited access. |
| Missing `AUTH_GOOGLE_ID` | `.env.local` isn't filled in, or you need to restart `npm run dev` after editing it. |

## Checking it worked
1. The yellow "Demo mode" banner is gone.
2. The Calendars page lists your real calendars, including Toddle.
3. Your Toddle assignments show up in the week view.
4. Tag Toddle as School and your team calendar as Sports, then check the colors.
