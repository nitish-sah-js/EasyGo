import { env } from "../../config/env";
import { isTransientHttpError, retry } from "../retry";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

/** Open-Meteo publishes a rolling ~16-day forecast horizon. */
export const FORECAST_HORIZON_DAYS = 16;

export class OpenMeteoClientError extends Error {
  readonly status?: number;
  readonly payload?: unknown;

  constructor(message: string, details: { status?: number; payload?: unknown } = {}) {
    super(message);
    this.name = "OpenMeteoClientError";
    if (details.status !== undefined) this.status = details.status;
    if (details.payload !== undefined) this.payload = details.payload;
  }
}

export interface OpenMeteoForecast {
  daily?: {
    time?: string[];
    weather_code?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_mean?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
  };
  hourly?: {
    time?: string[];
    relative_humidity_2m?: (number | null)[];
  };
}

export interface GeocodedPlace {
  latitude: number;
  longitude: number;
  name: string;
}

export class OpenMeteoClient {
  /**
   * Keyless fallback geocoder. Open-Meteo matches on settlement names only, so it
   * resolves e.g. "Goa" to a Rajasthan village rather than the state — Google Places
   * is the primary resolver and this is only used when that is unavailable.
   * Picking the most populous match makes the fallback as sane as it can be.
   */
  async geocode(city: string, countryCode = "IN"): Promise<GeocodedPlace | undefined> {
    const url = new URL(GEOCODING_URL);
    url.searchParams.set("name", city);
    url.searchParams.set("count", "10");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    url.searchParams.set("countryCode", countryCode);

    const payload = (await this.get(url, "geocoding")) as {
      results?: Array<{ latitude?: number; longitude?: number; name?: string; population?: number }>;
    };

    const best = (payload.results ?? [])
      .filter((row) => typeof row.latitude === "number" && typeof row.longitude === "number")
      .sort((left, right) => (right.population ?? 0) - (left.population ?? 0))[0];

    if (!best) return undefined;
    return { latitude: best.latitude as number, longitude: best.longitude as number, name: best.name ?? city };
  }

  async getForecast(params: {
    latitude: number;
    longitude: number;
    startDate: string;
    endDate: string;
  }): Promise<OpenMeteoForecast> {
    const url = new URL(FORECAST_URL);
    url.searchParams.set("latitude", String(params.latitude));
    url.searchParams.set("longitude", String(params.longitude));
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_mean,precipitation_probability_max,wind_speed_10m_max",
    );
    url.searchParams.set("hourly", "relative_humidity_2m");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("start_date", params.startDate);
    url.searchParams.set("end_date", params.endDate);

    return (await this.get(url, "forecast")) as OpenMeteoForecast;
  }

  private async get(url: URL, label: string): Promise<unknown> {
    return retry(() => this.getOnce(url, label), {
      label: `Open-Meteo ${label}`,
      isRetryable: isTransientHttpError,
    });
  }

  private async getOnce(url: URL, label: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(env.EXTERNAL_API_TIMEOUT_MS) });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new OpenMeteoClientError(`Open-Meteo ${label} timed out after ${env.EXTERNAL_API_TIMEOUT_MS}ms.`);
      }
      throw new OpenMeteoClientError(`Open-Meteo ${label} request failed: ${(error as Error).message}`);
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new OpenMeteoClientError(`Open-Meteo ${label} returned invalid JSON.`, { status: response.status, payload: text });
      }
    }

    if (!response.ok) {
      const reason = (payload as { reason?: string } | null)?.reason;
      throw new OpenMeteoClientError(
        reason ? `Open-Meteo ${label} failed: ${reason}` : `Open-Meteo ${label} failed.`,
        { status: response.status, payload },
      );
    }

    return payload ?? {};
  }
}
