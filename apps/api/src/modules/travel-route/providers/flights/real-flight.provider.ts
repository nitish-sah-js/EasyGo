import type { TransportOption, TransportSearchRequest } from "@nexttour/shared";
import { env } from "../../../../config/env";
import { resolveAirport } from "../../../../lib/external/airport-cache";
import { SkyScrapperClient } from "../../../../lib/external/sky-scrapper-client";
import { withTimeout } from "../../../../lib/with-timeout";
import type { FlightProvider } from "./flight-provider.interface";
import { parseFlightSearchResponse, toTransportOption } from "./sky-scrapper-mapper";

export class RealFlightProvider implements FlightProvider {
  readonly name = "SKY_SCRAPPER_FLIGHTS";
  readonly mode = "FLIGHT" as const;

  private readonly client = new SkyScrapperClient();

  async search(request: TransportSearchRequest): Promise<TransportOption[]> {
    if (!request.preferredTransport.includes(this.mode)) {
      return [];
    }

    // Budget: up to two airport lookups plus the flight search, each already
    // bounded by EXTERNAL_API_TIMEOUT_MS inside the client.
    return withTimeout(this.searchFlights(request), env.EXTERNAL_API_TIMEOUT_MS * 3, this.name);
  }

  private async searchFlights(request: TransportSearchRequest): Promise<TransportOption[]> {
    const [origin, destination] = await Promise.all([
      resolveAirport(this.client, request.origin),
      resolveAirport(this.client, request.destination),
    ]);

    const payload = await this.client.searchFlights({
      originSkyId: origin.skyId,
      destinationSkyId: destination.skyId,
      originEntityId: origin.entityId,
      destinationEntityId: destination.entityId,
      date: request.departureDate,
      adults: request.travelers,
    });

    const itineraries = parseFlightSearchResponse(payload, {
      originName: origin.name,
      destinationName: destination.name,
      departureDate: request.departureDate,
    });

    // An empty itinerary list is a legitimate answer ("no flights on this route/date"),
    // not a provider failure — returning [] leaves an honest empty section instead of
    // adding a misleading "provider unavailable" note. Genuine faults (quota, 5xx,
    // timeouts) still surface as thrown errors from SkyScrapperClient.
    const fetchedAt = new Date().toISOString();
    return itineraries.map((itinerary) => toTransportOption(itinerary, this.name, fetchedAt));
  }
}
