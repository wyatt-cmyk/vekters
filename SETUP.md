# Setup: Google Cloud + local env

You need to do this once. It takes about 10 minutes.

## 1. Create a Google Cloud project
1. Go to https://console.cloud.google.com and sign in with your Google account.
2. Click the project dropdown at the top → **New Project**.
3. Name it `Athlete Calendar` → **Create**. Make sure it's selected in the dropdown.

## 2. Turn on the Calendar API
1. Left menu → **APIs & Services → Library**.
2. Search **Google Calendar API** → open it → **Enable**.

## 3. Set up the OAuth consent screen (testing mode)
Google now calls this **Google Auth Platform**. Left menu → **Google Auth Platform** (or **APIs & Services → OAuth consent screen**).
1. **Get started** → App name `Athlete Calendar`, support email = your email.
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
2. Application type: **Web application**. Name: `Athlete Calendar (local)`.
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

## When you deploy to Vercel (Milestone 7)
Add a second redirect URI to the same OAuth client: `https://<your-app>.vercel.app/api/auth/callback/google`, and set the same three env vars in the Vercel project settings.

## Common errors
| Error | Fix |
| --- | --- |
| `redirect_uri_mismatch` | The redirect URI in step 4 doesn't exactly match `http://localhost:3000/api/auth/callback/google`. |
| `access_denied` / "app is being tested" | Your account isn't in the Test users list (step 3.4). |
| `403` from the Calendar API | Calendar API isn't enabled (step 2), or scopes weren't added (step 3.5). Sign out and back in after fixing. |
| Missing `AUTH_GOOGLE_ID` | `.env.local` isn't filled in, or you need to restart `npm run dev` after editing it. |
