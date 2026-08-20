export interface RetryOptions {
  /** Number of retries after the initial attempt. Default 2. */
  retries?: number;
  /** Base backoff in ms; attempt N waits baseDelayMs * 2^(N-1). Default 400. */
  baseDelayMs?: number;
  /** Used in the error message when every attempt fails. */
  label: string;
  /** Decides whether a thrown error is worth another attempt. */
  isRetryable?: (error: unknown) => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * True for errors that a second attempt might plausibly survive: transient
 * network failures, 5xx, and plain rate limiting.
 *
 * Deliberately NOT retryable:
 *  - a 429 whose body says the plan quota is exhausted (RapidAPI free tier) — retrying
 *    cannot succeed and only delays the failure the caller needs to report;
 *  - aborts, which are already bounded by the caller's timeout;
 *  - any other 4xx, which signals a bad request or bad credentials.
 */
export function isTransientHttpError(error: unknown): boolean {
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return false;
  }

  const status = (error as { status?: number } | null)?.status;

  if (status === 429) {
    const payload = (error as { payload?: unknown } | null)?.payload;
    const text = typeof payload === "string" ? payload : JSON.stringify(payload ?? "");
    return !/quota/i.test(text);
  }

  if (typeof status === "number") {
    return status >= 500 && status <= 599;
  }

  // No HTTP status at all — a DNS/socket/TLS level failure.
  return error instanceof TypeError || error instanceof Error;
}

export async function retry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const isRetryable = options.isRetryable ?? isTransientHttpError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isRetryable(error)) break;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${options.label} failed: ${String(lastError)}`);
}
