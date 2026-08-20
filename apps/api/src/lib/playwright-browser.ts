import type { Browser, BrowserContext } from "playwright";
import { env } from "../config/env";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * The API and worker run under `tsx`, whose esbuild transform has `keepNames`
 * enabled. That rewrites every named/arrow function into `__name(fn, "fn")` —
 * including the callbacks handed to `page.evaluate`, which are serialised and
 * executed inside the browser where esbuild's `__name` helper does not exist.
 * Without this shim every `page.evaluate` that declares a helper throws
 * `ReferenceError: __name is not defined`.
 *
 * Injected as a raw string so the shim itself cannot be rewritten by the transform.
 */
const KEEP_NAMES_SHIM = "globalThis.__name = globalThis.__name || function (fn) { return fn; };";

let browserPromise: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright");
  return chromium.launch({
    headless: env.REDBUS_HEADLESS,
    // `channel: "chromium"` is what makes headless viable against redbus.in.
    //
    // Playwright's default for `headless: true` is the *headless shell* binary
    // (chromium_headless_shell), a stripped build whose TLS/HTTP2 fingerprint Akamai
    // rejects outright — the connection dies with ERR_HTTP2_PROTOCOL_ERROR before any
    // page loads. This channel forces the full Chromium binary running in new-headless
    // mode, which presents a normal fingerprint and is served normally.
    //
    // Requires `playwright install chromium` (which fetches both binaries).
    channel: "chromium",
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

export async function getSharedBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((error) => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
}

/** Standard context for redBus scraping: Indian locale/timezone plus the __name shim. */
export async function createScrapeContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    userAgent: USER_AGENT,
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { "Accept-Language": "en-IN,en;q=0.9" },
  });
  await context.addInitScript({ content: KEEP_NAMES_SHIM });
  return context;
}

async function closeSharedBrowser(): Promise<void> {
  if (!browserPromise) return;
  const promise = browserPromise;
  browserPromise = null;
  const browser = await promise.catch(() => null);
  await browser?.close().catch(() => {});
}

process.once("SIGTERM", () => void closeSharedBrowser());
process.once("SIGINT", () => void closeSharedBrowser());
