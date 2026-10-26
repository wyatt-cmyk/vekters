import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewNavigation,
} from 'react-native-webview/lib/WebViewTypes';

/**
 * Vekters in a box.
 *
 * There is no app logic here. The real app is the Next.js site that is already
 * deployed; this is a window onto it, plus the few things a website inside a
 * phone app cannot do for itself: stay out from under the notch, say something
 * useful when the network is gone, and hand Google sign-in to the real browser.
 */

const FALLBACK_URL = 'https://vekters.vercel.app';

// Which site to load, in order of preference:
//
//   1. EXPO_PUBLIC_WEB_URL, so you can point the phone at the laptop's dev
//      server without editing a file -- e.g.
//      EXPO_PUBLIC_WEB_URL=http://192.168.1.82:3000 npx expo start
//      The phone is a different machine, so "localhost" would mean the phone
//      itself. It needs the laptop's address on the wifi.
//   2. app.json's expo.extra.webBaseUrl, the committed default.
//   3. Production, as a last resort.
//
// Anything prefixed EXPO_PUBLIC_ is baked into the JavaScript bundle and is
// readable by anyone with the app, so this must never hold a secret. A URL is
// fine; a key would not be.
const SITE_URL: string =
  process.env.EXPO_PUBLIC_WEB_URL ||
  (Constants.expoConfig?.extra as { webBaseUrl?: string } | undefined)?.webBaseUrl ||
  FALLBACK_URL;

type ParsedUrl = { scheme: string; hostname: string; path: string };

/**
 * A tiny URL splitter.
 *
 * React Native's global `URL` is a partial shim and its `hostname`/`pathname`
 * are not dependable across platforms, so we do the three-field split we need
 * by hand instead of trusting it.
 */
function parseUrl(url: string): ParsedUrl | null {
  const match = /^([a-z][a-z0-9+.\-]*):\/\/([^/?#]*)([^?#]*)/i.exec(url);
  if (!match) return null;
  const authority = match[2] ?? '';
  const hostPort = authority.includes('@') ? authority.slice(authority.lastIndexOf('@') + 1) : authority;
  return {
    scheme: (match[1] ?? '').toLowerCase(),
    hostname: hostPort.replace(/:\d+$/, '').toLowerCase(),
    path: match[3] || '/',
  };
}

const SITE_HOST = parseUrl(SITE_URL)?.hostname ?? 'vekters.vercel.app';

// Google refuses OAuth inside an embedded WebView and returns
// `disallowed_useragent`. Anything on these hosts has to leave the WebView.
const GOOGLE_AUTH_HOSTS = [
  'accounts.google.com',
  'accounts.youtube.com',
  'consent.google.com',
  'oauth2.googleapis.com',
  'myaccount.google.com',
];

// Auth.js routes on our own site. The sign-in route is the one that redirects
// out to Google, so catching it here means the whole round trip happens in the
// system browser rather than half in, half out.
const AUTH_PATH_PREFIXES = ['/api/auth/signin', '/api/auth/callback'];

function isGoogleAuthHost(hostname: string): boolean {
  return GOOGLE_AUTH_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function isAuthUrl(parsed: ParsedUrl): boolean {
  if (isGoogleAuthHost(parsed.hostname)) return true;
  if (parsed.hostname === SITE_HOST) {
    return AUTH_PATH_PREFIXES.some((prefix) => parsed.path.startsWith(prefix));
  }
  return false;
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  // Bumping this key throws the WebView away and builds a new one, which is the
  // only reliable way back from some native load failures.
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setFailed(false);
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  /**
   * Send a URL to the system browser (Safari / Chrome), then reload the
   * WebView when the user comes back.
   *
   * Known limitation, written down rather than hidden: the system browser and
   * the WebView do not share cookies, so finishing Google sign-in out there
   * does not by itself sign you in in here. See mobile/README.md.
   */
  const openOutside = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, { showTitle: true, enableBarCollapsing: true });
    } catch {
      // expo-web-browser missing or refused: the OS can still open the link.
      try {
        await Linking.openURL(url);
      } catch {
        // Nothing left to try. Better to do nothing than to crash.
        return;
      }
    }
    webViewRef.current?.reload();
  }, []);

  const onShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      const parsed = parseUrl(request.url);

      // about:blank, data: URLs and anything unparseable: let the WebView have it.
      if (!parsed) return true;

      // mailto:, tel:, maps: and friends belong to the OS.
      if (parsed.scheme !== 'http' && parsed.scheme !== 'https') {
        Linking.openURL(request.url).catch(() => {});
        return false;
      }

      if (isAuthUrl(parsed)) {
        openOutside(request.url);
        return false;
      }

      // Our own site stays inside. Every other site opens outside, so a tap on
      // an outbound link cannot strand someone in a chrome-less browser.
      if (parsed.hostname !== SITE_HOST) {
        openOutside(request.url);
        return false;
      }

      return true;
    },
    [openOutside],
  );

  const onNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  const onError = useCallback((event: WebViewErrorEvent) => {
    // Fires for no network, DNS failure, TLS failure, timeouts.
    if (__DEV__) console.warn('[Vekters] WebView load error', event.nativeEvent);
    setLoading(false);
    setFailed(true);
  }, []);

  const onHttpError = useCallback((event: WebViewHttpErrorEvent) => {
    const { statusCode, url } = event.nativeEvent;
    // Only the main document matters. A 404 on a favicon is not a broken app.
    if (url !== SITE_URL && !url.startsWith(SITE_URL)) return;
    if (statusCode >= 500) {
      setLoading(false);
      setFailed(true);
    }
  }, []);

  // Android's back button should walk the site's history before leaving the app.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && !failed) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [canGoBack, failed]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        {failed ? (
          <View style={styles.message}>
            <Text style={styles.messageTitle}>Can&apos;t reach Vekters</Text>
            <Text style={styles.messageBody}>
              Check that you&apos;re on wifi or cell data, then try again. If your connection is
              fine, the site itself may be down for a moment.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={retry}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Text style={styles.buttonLabel}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <WebView
              key={reloadKey}
              ref={webViewRef}
              source={{ uri: SITE_URL }}
              style={styles.webView}
              // Pull down from the top of the page to reload. iOS only; Android
              // has the hardware back button and the Try again screen instead.
              pullToRefreshEnabled
              allowsBackForwardNavigationGestures
              // The site is a normal logged-in web app: it needs cookies and
              // storage to keep a session between launches.
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              domStorageEnabled
              javaScriptEnabled
              setSupportMultipleWindows={false}
              originWhitelist={['https://*', 'http://*']}
              onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
              onNavigationStateChange={onNavigationStateChange}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={onError}
              onHttpError={onHttpError}
              // Keep scrolling and taps feeling native-ish.
              decelerationRate="normal"
              contentInsetAdjustmentBehavior="never"
            />
            {loading ? (
              <View pointerEvents="none" style={styles.loadingOverlay}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingLabel}>Loading Vekters…</Text>
              </View>
            ) : null}
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  loadingLabel: {
    fontSize: 15,
    color: '#5b6472',
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1b2430',
    textAlign: 'center',
  },
  messageBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5b6472',
    textAlign: 'center',
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#1b2430',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
