# Deploying Vekters to Vercel

Once this is done the app lives on a real URL, works on your phone, and your teammates can sign in.

## Do it in this order

It's tempting to finish `SETUP.md` first, but **deploy before you set up Google**. Google needs to know the production URL, and you don't have one until Vercel gives you it. Doing it this way means one visit to Google Cloud instead of two.

1. Deploy to Vercel with the two keys you already have. The site will say "Not set up yet", which is correct.
2. Copy the URL Vercel gives you.
3. Do the Google Cloud setup in `SETUP.md`, adding **both** the localhost and the production redirect URIs while you're there.
4. Add the two Google variables to Vercel and redeploy.

## 1. Create the Vercel project

1. Go to https://vercel.com and sign up. Signing in **with GitHub** is easiest, because it can then see the repository.
2. Click **Add New → Project**.
3. Find the `vekters` repository and click **Import**. If Vercel can't see it, click **Adjust GitHub App Permissions** and give it access.
4. Leave every build setting alone. Vercel detects Next.js on its own.
5. **Don't deploy yet.** Open **Environment Variables** first and add what you have.

## 2. Environment variables

Add these to Production, Preview and Development. The first two you already have; the Google pair comes after the first deploy.

| Name | Where it comes from |
| --- | --- |
| `AUTH_SECRET` | Run `npx auth secret` and copy the value, or reuse the one in your local `.env.local`. |
| `AUTH_GOOGLE_ID` | Google Cloud Console → Clients. Ends in `.apps.googleusercontent.com`. |
| `AUTH_GOOGLE_SECRET` | The same place. Starts with `GOCSPX-`. |
| `ANTHROPIC_API_KEY` | platform.claude.com → API keys. Starts with `sk-ant-`. |

**Do not set `DEMO_MODE`.** It is off in production unless you ask for it by name, which is deliberate: a public demo has no sign-in, so it must not be able to spend your Anthropic credits.

Click **Deploy** once the first two are in. Vercel gives you a URL like `https://vekters.vercel.app`. Opening it will say "Not set up yet" until the Google pair is added, which is expected.

## 3. Tell Google about the new address

Do this as part of step 4 of `SETUP.md`, so you only configure the OAuth client once. Sign-in fails until it's done.

1. Google Cloud Console → **Google Auth Platform → Clients** → your web client.
2. Under **Authorized JavaScript origins**, add `https://vekters.vercel.app`.
3. Under **Authorized redirect URIs**, add `https://vekters.vercel.app/api/auth/callback/google`.

Use your real Vercel URL, with no trailing slash. Add the `localhost:3000` entries too, so local development keeps working:

```
http://localhost:3000
http://localhost:3000/api/auth/callback/google
```

Then add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` to Vercel and redeploy (**Deployments → ⋯ → Redeploy**).

## 4. Let your teammates in

The app is in Google's testing mode, so only listed accounts can sign in.

Google Auth Platform → **Audience → Test users → Add users**, then add each teammate's school email. The limit is 100.

They'll see a "Google hasn't verified this app" warning. That's expected in testing mode: **Advanced → Continue**.

## 5. Check it worked

1. Open the URL on your phone. You should get the landing page.
2. Sign in. Your real calendars should appear, with no demo banner.
3. Paste a message into the assistant and confirm a card.
4. Open Google Calendar and check the event is there.

## Things that will bite you

- **Functions stop at 60 seconds on the free plan.** Chat takes 10 to 20 seconds and a season import about 15, so there's room, but a very long schedule could time out. The Pro plan allows 300 seconds. `maxDuration` is set to 60 in both API routes.
- **Uploads are capped at 4 MB**, because Vercel rejects requests over 4.5 MB. A photo straight from a phone camera can exceed that; the app says so rather than failing silently.
- **Settings live in a cookie**, so each person's colours and week start are per browser and don't follow them between devices.
- **Every chat message and import costs money.** Set a monthly spend limit at platform.claude.com → Limits before you share the link.
- **Changing an environment variable needs a redeploy.** Vercel → Deployments → ⋯ → Redeploy.

## Going past 100 testers

Testing mode caps you at 100 Google test users and makes everyone click past the unverified warning. Publishing the app removes both, but Google reviews any app that asks for calendar access, which takes time and needs a privacy policy and a demo video. Worth doing only once the team actually uses it.
