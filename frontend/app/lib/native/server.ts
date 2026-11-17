import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

/**
 * Server and session storage for the iOS app.
 *
 * On the web the frontend is served by the Mealie server it talks to, so every API call is a relative
 * `/api/...` path and the session rides on a cookie. The iOS app instead serves its bundled copy from
 * `capacitor://localhost`, so it has to be told which server to use, prefix that server onto every API
 * URL, and keep the token itself: a cookie set by another origin is never visible to `document.cookie`.
 *
 * Both values live in Capacitor Preferences (UserDefaults), not localStorage, which iOS can purge when
 * the device runs low on space. They are mirrored into module state at boot by `00.native-app.client.ts`
 * so the hot paths (the axios interceptor, image URLs) can read them synchronously.
 */

const SERVER_KEY = "mealie.server-url";
const TOKEN_KEY = "mealie.access-token";

let serverOrigin = "";
let nativeToken: string | null = null;

/** True inside the iOS (or a future Android) app, false in any browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** The chosen server's origin plus any sub-path, without a trailing slash. Empty on the web. */
export function getServerOrigin(): string {
  return serverOrigin;
}

/**
 * Makes a server-relative path (`/api/...`) absolute in the app. On the web, and for anything that is
 * already absolute, it returns the input unchanged.
 */
export function serverUrl(path: string): string;
export function serverUrl(path: string | null | undefined): string | null | undefined;
export function serverUrl(path: string | null | undefined): string | null | undefined {
  if (!path || !serverOrigin || !path.startsWith("/")) {
    return path;
  }
  return serverOrigin + path;
}

/**
 * Turns what the user typed into an origin: adds https:// when no scheme was given and drops any
 * trailing slash. Returns null for input that isn't a usable http(s) URL.
 */
export function normalizeServerUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  }
  catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  // Keep a sub-path (Mealie behind /mealie on a shared domain), but never a query or a fragment
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${path}`;
}

export async function loadNativeState(): Promise<void> {
  const [server, token] = await Promise.all([
    Preferences.get({ key: SERVER_KEY }),
    Preferences.get({ key: TOKEN_KEY }),
  ]);
  serverOrigin = server.value ?? "";
  nativeToken = token.value ?? null;
}

export async function saveServerOrigin(origin: string): Promise<void> {
  serverOrigin = origin;
  await Preferences.set({ key: SERVER_KEY, value: origin });
}

/** Forgets the server and the session on it, for "change server". */
export async function clearServerOrigin(): Promise<void> {
  serverOrigin = "";
  nativeToken = null;
  await Promise.all([
    Preferences.remove({ key: SERVER_KEY }),
    Preferences.remove({ key: TOKEN_KEY }),
  ]);
}

export function getNativeToken(): string | null {
  return nativeToken;
}

/** Stores the session token, or clears it with null. The write to disk is fire-and-forget. */
export function setNativeToken(token: string | null): void {
  nativeToken = token;
  if (token) {
    void Preferences.set({ key: TOKEN_KEY, value: token });
  }
  else {
    void Preferences.remove({ key: TOKEN_KEY });
  }
}
