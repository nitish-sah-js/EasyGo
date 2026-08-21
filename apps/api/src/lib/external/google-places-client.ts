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
].join(",");
const AUTOCOMPLETE_FIELD_MASK = [
  "suggestions.placePrediction.place",
  "suggestions.placePrediction.placeId",
  "suggestions.placePrediction.text",
  "suggestions.placePrediction.structuredFormat",
  "suggestions.placePrediction.types",
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
}

export interface GooglePlaceAutocompleteSuggestion {
  placePrediction?: {
    place?: string;
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
    types?: string[];
  };
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

  async autocomplete(input: string, sessionToken?: string): Promise<{ suggestions?: GooglePlaceAutocompleteSuggestion[] }> {
    // The rest of the app is India-only (every default city/country fallback
    // elsewhere assumes India), so a short prefix like "go" should surface Goa
    // first rather than Gothenburg.
    const body: Record<string, unknown> = { input, languageCode: "en", includedRegionCodes: ["in"] };
    if (sessionToken) body.sessionToken = sessionToken;
    return this.post<{ suggestions?: GooglePlaceAutocompleteSuggestion[] }>(
      "places:autocomplete",
      body,
      AUTOCOMPLETE_FIELD_MASK,
    );
  }

  private async post<T>(path: string, body: unknown, fieldMask: string = FIELD_MASK): Promise<T> {
    if (!this.apiKey) {
      throw new GooglePlacesClientError("Missing GOOGLE_MAPS_API_KEY.");
    }

    return retry(() => this.postOnce<T>(path, body, fieldMask), {
      label: `Google Places ${path}`,
      isRetryable: isTransientHttpError,
    });
  }

  private async postOnce<T>(path: string, body: unknown, fieldMask: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey as string,
          "X-Goog-FieldMask": fieldMask,
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

    return this.parseBody(response) as Promise<T>;
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
