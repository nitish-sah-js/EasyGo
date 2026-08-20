import type { LocationPoint, TransportOption, TransportSearchRequest } from "@nexttour/shared";
import { env } from "../../../../config/env";
import { RedbusRailwaysScraper } from "../../../../lib/external/redbus-railways-scraper";
import { withTimeout } from "../../../../lib/with-timeout";
import type { TrainProvider } from "./train-provider.interface";
import { toTransportOptions } from "./redbus-railways-mapper";

export class RealTrainProvider implements TrainProvider {
  readonly name = "REDBUS_TRAINS";
  readonly mode = "TRAIN" as const;

  private readonly scraper = new RedbusRailwaysScraper();

  async search(request: TransportSearchRequest): Promise<TransportOption[]> {
    if (!request.preferredTransport.includes(this.mode)) {
      return [];
    }

    const result = await withTimeout(
      this.scraper.searchTrains({ from: request.origin, to: request.destination, date: request.departureDate, limit: 20 }),
      env.REDBUS_TIMEOUT_MS + 5_000,
      this.name,
    );

    const origin: LocationPoint = {
      name: result.query.from.name,
      ...(result.query.from.code !== undefined ? { code: result.query.from.code } : {}),
      city: request.origin,
    };
    const destination: LocationPoint = {
      name: result.query.to.name,
      ...(result.query.to.code !== undefined ? { code: result.query.to.code } : {}),
      city: request.destination,
    };

    const options = toTransportOptions(result, origin, destination, request.departureDate, this.name);
    if (options.length === 0) {
      throw new Error("RedBus railway search returned no parseable trains.");
    }
    return options;
  }
}
