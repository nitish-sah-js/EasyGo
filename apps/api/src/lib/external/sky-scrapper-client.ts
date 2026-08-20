import { env } from "../../config/env";
import { isTransientHttpError, retry } from "../retry";

export class SkyScrapperClientError extends Error {
  readonly status?: number;
  readonly payload?: unknown;

  constructor(message: string, details: { status?: number; payload?: unknown } = {}) {
    super(message);
    this.name = "SkyScrapperClientError";
    if (details.status !== undefined) this.status = details.status;
    if (details.payload !== undefined) this.payload = details.payload;
  }
}

export interface SearchAirportParams {
  query: string;
  locale?: string;
}

export interface SearchFlightsParams {
  originSkyId: string;
  destinationSkyId: string;
  originEntityId: string;
  destinationEntityId: string;
  date: string;
  returnDate?: string;
  cabinClass?: string;
  adults?: number;
  currency?: string;
  market?: string;
  countryCode?: string;
}

export class SkyScrapperClient {
  private readonly apiKey: string | undefined;
  private readonly host: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = env.SKY_SCRAPPER_RAPIDAPI_KEY;
    this.host = env.SKY_SCRAPPER_RAPIDAPI_HOST;
    this.baseUrl = `https://${this.host}`;
  }

  async searchAirport(params: SearchAirportParams): Promise<unknown> {
    return this.request("/api/v1/flights/searchAirport", {
      query: params.query,
      locale: params.locale ?? "en-US",
    });
  }

  async searchFlights(params: SearchFlightsParams): Promise<unknown> {
    return this.request("/api/v1/flights/searchFlights", {
      originSkyId: params.originSkyId,
      destinationSkyId: params.destinationSkyId,
      originEntityId: params.originEntityId,
      destinationEntityId: params.destinationEntityId,
      date: params.date,
      returnDate: params.returnDate,
      cabinClass: params.cabinClass ?? "economy",
      adults: params.adults ?? 1,
      currency: params.currency ?? "INR",
      market: params.market ?? "en-IN",
      countryCode: params.countryCode ?? "IN",
    });
  }

  private async request(path: string, query: Record<string, string | number | undefined>): Promise<unknown> {
    if (!this.apiKey) {
      throw new SkyScrapperClientError("Missing SKY_SCRAPPER_RAPIDAPI_KEY.");
    }

    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    return retry(() => this.requestOnce(url), {
      label: `Sky Scrapper ${path}`,
      isRetryable: isTransientHttpError,
    });
  }

  private async requestOnce(url: URL): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Host": this.host,
          "X-RapidAPI-Key": this.apiKey as string,
        },
        signal: AbortSignal.timeout(env.EXTERNAL_API_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new SkyScrapperClientError(`Sky Scrapper timed out after ${env.EXTERNAL_API_TIMEOUT_MS}ms.`);
      }
      throw new SkyScrapperClientError(`Sky Scrapper request failed: ${(error as Error).message}`);
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new SkyScrapperClientError("Sky Scrapper returned invalid JSON.", { status: response.status, payload: text });
      }
    }

    if (response.status === 401 || response.status === 403) {
      const message = (payload as { message?: string } | null)?.message ?? "";
      throw new SkyScrapperClientError(
        /not subscribed/i.test(message)
          ? "Sky Scrapper: this RapidAPI key is not subscribed to the Sky Scrapper API. Subscribe at https://rapidapi.com/apiheya/api/sky-scrapper (a free BASIC plan is available)."
          : `Sky Scrapper rejected the credentials (HTTP ${response.status}). Check SKY_SCRAPPER_RAPIDAPI_KEY.`,
        { status: response.status, payload },
      );
    }

    if (response.status === 429) {
      const message = (payload as { message?: string } | null)?.message ?? "";
      throw new SkyScrapperClientError(
        /quota/i.test(message)
          ? "Sky Scrapper monthly request quota is exhausted for this RapidAPI plan."
          : "Sky Scrapper is rate limiting requests.",
        { status: 429, payload },
      );
    }

    if (!response.ok || (payload as { status?: boolean } | null)?.status === false) {
      throw new SkyScrapperClientError("Sky Scrapper request failed.", { status: response.status, payload });
    }

    return payload;
  }
}
