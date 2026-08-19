import {
  locationsMatch,
  materializeTransportRecord,
  mockFlights,
  type TransportOption,
  type TransportSearchRequest,
} from "@nexttour/shared";
import { throwIfMockProviderDisabled } from "../../../../lib/mock-failure";
import type { FlightProvider } from "./flight-provider.interface";

export class MockFlightProvider implements FlightProvider {
  readonly name = "MOCK_FLIGHTS";
  readonly mode = "FLIGHT" as const;

  async search(request: TransportSearchRequest): Promise<TransportOption[]> {
    throwIfMockProviderDisabled(this.name);

    if (!request.preferredTransport.includes(this.mode)) {
      return [];
    }

    return mockFlights
      .filter((record) => {
        if (request.includeNetwork) {
          return true;
        }
        return locationsMatch(request.origin, record.origin) && locationsMatch(request.destination, record.destination);
      })
      .map((record) => materializeTransportRecord(record, request.departureDate));
  }
}
