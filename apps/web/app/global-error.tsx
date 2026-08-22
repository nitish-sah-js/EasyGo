"use client";

import "./globals.css";

/**
 * Root-level safety net. `components/error-boundary.tsx` only wraps route
 * `{children}` inside `AppShell` (see app/layout.tsx) — it can't catch an
 * error thrown by AppShell itself (the header's hooks, scroll listeners,
 * etc.), which renders on every route. Without this file, an error there had
 * nothing to fall back to: Next.js requires `global-error.tsx` specifically
 * to catch failures in the root layout, and it must render its own
 * <html>/<body> since it replaces the layout entirely when triggered.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <section className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="w-full rounded-2xl border border-blush-200 bg-blush-100 p-6 shadow-card">
            <h2 className="text-lg font-bold tracking-tight text-blush-900">Something went wrong</h2>
            <p className="mt-2.5 text-sm leading-6 text-blush-800">{error.message}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-12 items-center rounded-full bg-primary-orange px-6 text-sm font-semibold text-white shadow-ink"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="inline-flex h-12 items-center rounded-full border border-border px-6 text-sm font-semibold text-foreground"
            >
              Back to home
            </button>
          </div>
        </section>
      </body>
    </html>
  );
}
