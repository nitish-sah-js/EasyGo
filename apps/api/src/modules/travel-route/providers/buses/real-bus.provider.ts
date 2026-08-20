import type { LocationPoint, TransportOption, TransportSearchRequest } from "@nexttour/shared";
import { env } from "../../../../config/env";
import { RedbusBusScraper } from "../../../../lib/external/redbus-bus-scraper";
import { withTimeout } from "../../../../lib/with-timeout";
import type { BusProvider } from "./bus-provider.interface";
import { toTransportOptions } from "./redbus-bus-mapper";

export class RealBusProvider implements BusProvider {
  readonly name = "REDBUS_BUSES";
  readonly mode = "BUS" as const;

  private readonly scraper = new RedbusBusScraper();

  async search(request: TransportSearchRequest): Promise<TransportOption[]> {
    if (!request.preferredTransport.includes(this.mode)) {
      return [];
    }

    const result = await withTimeout(
      this.scraper.searchBuses({ from: request.origin, to: request.destination, date: request.departureDate, limit: 20 }),
      env.REDBUS_TIMEOUT_MS + 5_000,
      this.name,
    );

    const origin: LocationPoint = { name: result.query.from.name, code: result.query.from.id, city: request.origin };
    const destination: LocationPoint = { name: result.query.to.name, code: result.query.to.id, city: request.destination };

    const options = toTransportOptions(result, origin, destination, request.departureDate, this.name);

    // redBus stating "no buses on this route" is a real answer, not a fault — return an
    // empty list so the trip shows an honest empty section instead of a failure note.
    // Anything else that yields nothing means the page changed and the scrape broke.
    if (options.length === 0 && !result.noServiceOnRoute) {
      throw new Error("RedBus returned a bus results page that could not be parsed — the page layout may have changed.");
    }
    return options;
  }
}
