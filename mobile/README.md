# Vekters on a phone

This folder is a small Expo app whose only job is to show the deployed Vekters
website — https://vekters.vercel.app — full screen on a phone.

It is not a second version of the app. There is no calendar code here, no API
calls, no secrets. One screen, one WebView, one URL. Everything you see in it is
the same Next.js app that is already live, so shipping a change to the website
ships it to the phone too. Nothing to rebuild.

The point of it is speed: a teammate can be looking at Vekters on their own
phone, from your laptop, in about a minute. No App Store, no TestFlight, no
waiting on Apple.

## Start it

```bash
cd mobile
npm install
npx expo start
```

A QR code appears in your terminal. Leave that terminal open — the QR code is
pointing at your laptop, and the app only loads while your laptop is serving it.

## Get it onto a teammate's phone

1. They install **Expo Go** from the App Store or Google Play. That is the only
   thing they install.
2. **Both of you must be on the same wifi.** The QR code contains your laptop's
   address on the local network, which only works from inside that network.
3. iPhone: open the Camera app and point it at the QR code, then tap the banner.
   Android: open Expo Go and use **Scan QR code** inside it.
4. Expo Go downloads the JavaScript from your laptop and runs it. Vekters
   appears.

If nothing happens, it is almost always the network. A school or guest wifi that
isolates devices from each other will block it. Press `?` in the Expo terminal
to list the options; the one that helps is `npx expo start --tunnel`, which
routes through Expo's servers instead of the local network and usually gets
around it, at the cost of being slower.

## What Expo Go can and cannot do

Expo Go is a single app that Expo publishes, containing a fixed set of native
code. When you scan the QR code, it downloads *your JavaScript* and runs it
against *that* native code.

This is why it is so fast, and also exactly what limits it:

- **You can only use native modules that are already inside Expo Go.** You
  cannot add one. This app uses three: `react-native-webview`,
  `react-native-safe-area-context`, and `expo-web-browser`. All three are listed
  by Expo as "Included in Expo Go", which is why this app runs there at all. If
  you ever add a module that is not on that list, Expo Go will crash on launch
  and you will need the real build described at the bottom of this file.
- **It is tied to your laptop.** Close the terminal, or walk out of wifi range,
  and the app stops loading. It is a demo, not something a teammate keeps.
- **The icon says Expo Go.** On their home screen it lives inside Expo Go, not as
  a "Vekters" app. The name, icon and bundle identifier in `app.json` do not show
  up until there is a real build.
- **It is not the App Store.** Nothing here has been reviewed, signed, or given
  to Apple. You cannot send this link to someone outside your wifi.

## Google sign-in, and why it leaves the app

Google refuses to run its sign-in page inside an embedded WebView. If you try,
it returns an error called `disallowed_useragent` instead of a login form. This
is deliberate on Google's part: an app that hosts its own WebView can read
everything typed into it, including your password, so Google will only accept
sign-in in a real browser that the app cannot see inside.

So the app watches every page the WebView is about to open and pulls the
sign-in ones out. That is `onShouldStartLoadWithRequest` in `App.tsx:129` — it
returns `false` for a URL, which means "do not load this here", and hands the
URL to `expo-web-browser` instead, which opens Safari or Chrome on top of the
app. When you dismiss that browser, the WebView reloads.

The URLs it catches (`App.tsx:66` and `App.tsx:77`):

- anything on `accounts.google.com` and its siblings
- `/api/auth/signin…` and `/api/auth/callback…` on our own site, which are the
  Auth.js routes that redirect out to Google

Links to any *other* website also open outside, so a tap on an outbound link
cannot strand you in a browser with no back button.

### The honest limitation

**Signing in this way does not actually sign you in inside the WebView, and
fixing that is real work.** Here is why.

When you sign in on the website, the server sends back a cookie, and the browser
keeps it. On the next page load the browser presents the cookie and the server
knows who you are. But Safari-opened-on-top-of-an-app and the WebView inside
that app keep *separate* cookie jars, on purpose, for the same privacy reason
Google insisted on the real browser in the first place. The cookie lands in
Safari. The WebView never sees it. You come back and you are still signed out.

The app does the interception anyway, because the alternative is worse: without
it you get Google's `disallowed_useragent` error page, which explains nothing.
With it you at least reach a working Google sign-in, and the demo is honest
about where it stops.

**TODO, if signed-in mobile use matters later.** The real fix is to stop
treating the website as the authority and give the app its own session: use
`expo-auth-session` (or `expo-apple-authentication`) to do OAuth natively, get a
token, and have the web app accept that token — a redirect back into the app via
the `vekters://` scheme that sets the session cookie in the WebView. That needs
changes to the Next.js app's auth routes, a second Google OAuth client for iOS,
and most likely a real build rather than Expo Go. None of it is in this folder,
and none of it should be started until someone has decided the phone app is
worth that much.

Until then: **the thing Expo Go is good for is showing teammates the layout and
the feel.** Demo mode and anything that works signed-out will work.

## When the network is gone

A WebView with nothing to show is a blank white rectangle, which looks like a
bug. So `onError` (`App.tsx:163`) catches load failures — no wifi, DNS failure,
a timeout, a 5xx from the site — and swaps in a plain message and a **Try again**
button (`App.tsx:209`). Pressing it rebuilds the WebView from scratch, which is
more reliable than asking a broken one to reload itself.

On top of that:

- **Pull down from the top of the page to reload.** iOS only;
  `pullToRefreshEnabled` has no Android implementation in this version of
  `react-native-webview`.
- **Android's back button walks the site's history** before it closes the app
  (`App.tsx:182`), which is what Android users expect and a WebView does not do
  for free.

## Staying out from under the notch

The phone has a camera notch at the top and, on newer iPhones, a home indicator
bar at the bottom. Content drawn underneath either one is unreadable or
untappable. `SafeAreaProvider` and `SafeAreaView` from
`react-native-safe-area-context` measure those regions and pad around them, so
the web content starts below the notch and ends above the indicator.

## The files

| File | What it is |
| --- | --- |
| `App.tsx` | The whole app. One WebView plus the loading, error and sign-in handling. |
| `index.js` | Boots `App.tsx`. Expo's standard entry point; you will not touch it. |
| `app.json` | Name, slug, orientation, bundle identifier. The site URL lives in `expo.extra.webBaseUrl` — change the site it points at here, not in the code. |
| `eas.json` | Build profiles for later. Nothing here runs until someone runs `eas build`. |
| `tsconfig.json` | TypeScript settings, extending Expo's defaults. |

## Later: a real build, and TestFlight

This is the part that costs money and time, and it is deliberately **not** done.
Writing it down so the shape of it is clear:

1. **An Expo account and an EAS project.** `npx eas init` creates the project and
   writes an `eas.projectId` into `app.json`. This app has none yet, on purpose —
   it is not registered with anything.
2. **An Apple Developer account.** $99 a year. Without it you cannot sign an app
   to run on a phone that is not plugged into your laptop.
3. **`eas build --platform ios --profile preview`.** Expo compiles your
   JavaScript together with real native code on their servers, and gives you back
   an actual `.ipa`. This is where the name "Vekters", the icon, and the
   `com.weihs.vekters` bundle identifier in `app.json` start to matter: that
   identifier is the app's permanent name as far as Apple is concerned, and it
   cannot be changed later without being a different app.
4. **`eas submit --platform ios`.** Uploads the build to App Store Connect. You
   need an `ascAppId`, which App Store Connect gives you after you create the app
   record there; it goes in a `submit` block in `eas.json`. There is no `submit`
   block in this `eas.json` yet because there is no app record yet.
5. **TestFlight.** Apple reviews the build (usually a day), then you invite
   teammates by email. They install TestFlight, tap a link, and have a real
   Vekters icon on their home screen that works anywhere, with no laptop
   involved. Builds expire after 90 days.

Steps 3 through 5 all push outward and some of them bill you, so none of them
should be run casually. `npx expo start` does not.

### Still missing before a real build

- **No icon or splash screen.** `app.json` has no `icon` or splash
  configuration, so Expo's placeholder is used. Expo Go does not care. A real
  build does: Apple requires a 1024×1024 icon.
- **No `eas.projectId`, no update channel URL.** Added by `npx eas init` when
  someone decides to do this.
