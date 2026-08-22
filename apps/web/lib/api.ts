export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

// `path` is requested relative to this app's own origin (proxied to the API
// via next.config.mjs rewrites) rather than an absolute cross-origin URL, so
// the auth cookie is always first-party — see the rewrites comment for why
// that matters (Safari's ITP silently drops genuinely cross-site cookies
// even with SameSite=None; Secure).
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({ message: response.statusText }))) as {
      message?: string;
    };
    throw new ApiClientError(body.message ?? "Request failed", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
