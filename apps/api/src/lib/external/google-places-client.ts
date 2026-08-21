import { env } from "../../config/env";
import { isTransientHttpError, retry } from "../retry";

const DEFAULT_BASE_URL = "https://places.googleapis.com/v1";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.regularOpeningHours",
  "places.types",
  "places.primaryType",
  // Photo references only — the media bytes are a separate, separately metered call.
  "places.photos",
].join(",");

export class GooglePlacesClientError extends Error {
  readonly status?: number;
  readonly payload?: unknown;

  constructor(message: string, details: { status?: number; payload?: unknown } = {}) {
    super(message);
    this.name = "GooglePlacesClientError";
    if (details.status !== undefined) this.status = details.status;
    if (details.payload !== undefined) this.payload = details.payload;
  }
}

export interface GooglePlacePhoto {
  /** `places/{placeId}/photos/{photoReference}` */
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: Array<{ displayName?: string; uri?: string }>;
}

export interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  types?: string[];
  primaryType?: string;
  photos?: GooglePlacePhoto[];
}

export class GooglePlacesClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl = DEFAULT_BASE_URL;

  constructor() {
    this.apiKey = env.GOOGLE_MAPS_API_KEY;
  }

  async searchText(textQuery: string, pageSize = 1): Promise<{ places?: GooglePlace[] }> {
    return this.post("places:searchText", { textQuery, pageSize, languageCode: "en" });
  }

  async searchNearby(params: {
    includedType: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    maxResultCount: number;
  }): Promise<{ places?: GooglePlace[] }> {
    return this.post("places:searchNearby", {
      includedTypes: [params.includedType],
      maxResultCount: params.maxResultCount,
      rankPreference: "POPULARITY",
      locationRestriction: {
        circle: {
          center: { latitude: params.latitude, longitude: params.longitude },
          radius: params.radiusMeters,
        },
      },
      languageCode: "en",
    });
  }

  /**
   * Resolves a photo resource name to a temporary, key-free CDN URL.
   *
   * `skipHttpRedirect` makes Google answer with the URL as JSON instead of a 302
   * to the bytes, so the API key never reaches the browser and the URL can be
   * cached and handed out to many visitors. The returned URL is short-lived —
   * treat it as a cache entry with a TTL, never as a stored value.
   */
  async fetchPhotoUri(photoName: string, maxWidthPx: number): Promise<string | undefined> {
    if (!this.apiKey) {
      throw new GooglePlacesClientError("Missing GOOGLE_MAPS_API_KEY.");
    }

    const query = new URLSearchParams({
      maxWidthPx: String(maxWidthPx),
      skipHttpRedirect: "true",
      key: this.apiKey,
    });

    const payload = await retry(
      () => this.getOnce<{ photoUri?: string }>(`${photoName}/media?${query.toString()}`),
      { label: "Google Places photo media", isRetryable: isTransientHttpError },
    );
    return payload.photoUri;
  }

  private async post(path: string, body: unknown): Promise<{ places?: GooglePlace[] }> {
    if (!this.apiKey) {
      throw new GooglePlacesClientError("Missing GOOGLE_MAPS_API_KEY.");
    }

    return retry(() => this.postOnce(path, body), {
      label: `Google Places ${path}`,
      isRetryable: isTransientHttpError,
    });
  }

  private async getOnce<T>(path: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/${path}`, {
        method: "GET",
        signal: AbortSignal.timeout(env.EXTERNAL_API_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new GooglePlacesClientError(`Google Places timed out after ${env.EXTERNAL_API_TIMEOUT_MS}ms.`);
      }
      throw new GooglePlacesClientError(`Google Places request failed: ${(error as Error).message}`);
    }

    return this.parseBody(response) as Promise<T>;
  }

  private async postOnce(path: string, body: unknown): Promise<{ places?: GooglePlace[] }> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey as string,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(env.EXTERNAL_API_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new GooglePlacesClientError(`Google Places timed out after ${env.EXTERNAL_API_TIMEOUT_MS}ms.`);
      }
      throw new GooglePlacesClientError(`Google Places request failed: ${(error as Error).message}`);
    }

    return this.parseBody(response) as Promise<{ places?: GooglePlace[] }>;
  }

  private async parseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new GooglePlacesClientError("Google Places returned invalid JSON.", { status: response.status, payload: text });
      }
    }

    if (!response.ok) {
      const detail = (payload as { error?: { message?: string } } | null)?.error?.message;
      throw new GooglePlacesClientError(
        detail ? `Google Places request failed: ${detail}` : "Google Places request failed.",
        { status: response.status, payload },
      );
    }

    return payload ?? {};
  }
}
