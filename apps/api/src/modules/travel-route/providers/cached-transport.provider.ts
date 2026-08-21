import type { TransportOption, TransportSearchRequest } from "@nexttour/shared";
import { env } from "../../../config/env";
import { cachedProviderResult } from "../../../lib/provider-cache";
import type { TransportProvider } from "./transport-provider.interface";

export class CachedTransportProvider implements TransportProvider {
  readonly name: string;
  readonly mode: TransportProvider["mode"];

  constructor(private readonly provider: TransportProvider) {
    this.name = provider.name;
    this.mode = provider.mode;
  }

  async search(request: TransportSearchRequest): Promise<TransportOption[]> {
    if (!request.preferredTransport.includes(this.mode)) {
      return [];
    }

    const origin = request.origin.trim().toLowerCase();
    const destination = request.destination.trim().toLowerCase();

    return cachedProviderResult(
      this.name,
      {
        keyParts: [this.mode, origin, destination, request.departureDate],
        request: {
          mode: this.mode,
          origin,
          destination,
          departureDate: request.departureDate,
          travelers: request.travelers,
        },
      },
      env.TRANSPORT_CACHE_TTL_SECONDS,
      () => this.provider.search(request),
      {
        label: `${this.mode.toLowerCase()} ${request.origin} -> ${request.destination} ${request.departureDate}`,
        liveAction: this.mode === "FLIGHT" ? "flight API hit" : `${this.mode.toLowerCase()} scrape hit`,
      },
    );
  }
}
