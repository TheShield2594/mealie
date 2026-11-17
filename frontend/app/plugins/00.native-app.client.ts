import axios from "axios";
import { overrideParts } from "~/lib/api/base/route";
import { isNativeApp, loadNativeState, normalizeServerUrl, saveServerOrigin, getServerOrigin } from "~/lib/native/server";

/**
 * Boots the iOS app: loads the saved server and session, and asks for a server on first launch.
 *
 * It runs before every other plugin, and has to: app-info and theme fetch from the server while the app
 * starts, so there must be a server to fetch from by then. A plain-DOM prompt is used rather than a page
 * because i18n, Vuetify and the router aren't up yet, which is also why its few strings are English only.
 *
 * In a browser this plugin does nothing.
 */
export default defineNuxtPlugin({
  name: "native-app",
  enforce: "pre",
  async setup() {
    if (!isNativeApp()) {
      return;
    }

    await loadNativeState();

    if (!getServerOrigin()) {
      const origin = await promptForServer();
      await saveServerOrigin(origin);
    }

    applyServerOrigin(getServerOrigin());
  },
});

/** Points every way the frontend builds an API URL at the chosen server. */
function applyServerOrigin(origin: string) {
  // Bare `axios` calls (app-info) and the shared instance in plugins/axios.ts
  axios.defaults.baseURL = origin;
  // Every API client route, which also covers the recipe-import stream. A sub-path goes in the prefix,
  // since resolving "/api/..." against a host would drop it.
  const url = new URL(origin);
  overrideParts(url.origin, url.pathname.replace(/\/+$/, ""));
}

/** Whether `origin` answers like a Mealie server. Also proves the server allows this app's origin (CORS). */
async function isMealieServer(origin: string): Promise<boolean> {
  try {
    const response = await fetch(`${origin}/api/app/about`, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return typeof data?.version === "string";
  }
  catch {
    return false;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    node.setAttribute(name, value);
  }
  if (text) {
    node.textContent = text;
  }
  return node;
}

const PROMPT_CSS = `
  .mealie-server-prompt {
    --bg: #FAF9F7; --fg: #1D1C1A; --muted: #57534D; --field: #F3F1ED; --primary: #C4502A; --error: #B3261E;
    position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center;
    padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
    background: var(--bg); color: var(--fg);
    font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    .mealie-server-prompt {
      --bg: #141311; --fg: #F3F1ED; --muted: #BDB8AF; --field: #1D1C1A; --primary: #E0683C; --error: #F2706C;
    }
  }
  .mealie-server-prompt form { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 12px; }
  .mealie-server-prompt img { width: 72px; height: 72px; align-self: center; margin-bottom: 8px; }
  .mealie-server-prompt h1 { font-size: 24px; margin: 0; text-align: center; }
  .mealie-server-prompt p { margin: 0; color: var(--muted); text-align: center; }
  .mealie-server-prompt input {
    font: inherit; font-size: 17px; padding: 14px 16px; border-radius: 12px; border: 1px solid transparent;
    background: var(--field); color: var(--fg); outline: none;
  }
  .mealie-server-prompt input:focus { border-color: var(--primary); }
  .mealie-server-prompt button {
    font: inherit; font-weight: 600; padding: 14px 16px; border: 0; border-radius: 12px;
    background: var(--primary); color: #fff;
  }
  .mealie-server-prompt button:disabled { opacity: 0.6; }
  .mealie-server-prompt .error { color: var(--error); min-height: 1.5em; font-size: 14px; }
`;

function promptForServer(): Promise<string> {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "mealie-server-prompt";
    // Static markup only, built through the DOM so nothing is ever parsed as HTML
    const style = document.createElement("style");
    style.textContent = PROMPT_CSS;

    const form = el("form", { novalidate: "" });
    const icon = el("img", { src: "/icons/apple-touch-icon.png", alt: "" });
    const heading = el("h1", {}, "Connect to Mealie");
    const hint = el("p", {}, "Enter the address of your Mealie server.");
    const input = el("input", {
      "name": "server",
      "type": "url",
      "inputmode": "url",
      "autocapitalize": "off",
      "autocorrect": "off",
      "spellcheck": "false",
      "autocomplete": "url",
      "placeholder": "mealie.example.com",
      "aria-label": "Server address",
      "required": "",
    });
    const error = el("p", { class: "error", role: "alert" });
    const button = el("button", { type: "submit" }, "Continue");
    form.append(icon, heading, hint, input, error, button);
    root.append(style, form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";

      const origin = normalizeServerUrl(input.value);
      if (!origin) {
        error.textContent = "That doesn't look like a web address.";
        return;
      }

      button.disabled = true;
      button.textContent = "Connecting…";
      const ok = await isMealieServer(origin);
      button.disabled = false;
      button.textContent = "Continue";

      if (!ok) {
        error.textContent = "Couldn't reach a Mealie server there. Check the address, and that the server runs a version with app support.";
        return;
      }

      root.remove();
      resolve(origin);
    });

    document.body.appendChild(root);
    input.focus();
  });
}
