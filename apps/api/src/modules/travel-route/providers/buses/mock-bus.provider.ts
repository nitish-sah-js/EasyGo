import {
  locationsMatch,
  materializeTransportRecord,
  mockBuses,
  type TransportOption,
  type TransportSearchRequest,
} from "@nexttour/shared";
import { throwIfMockProviderDisabled } from "../../../../lib/mock-failure";
import type { BusProvider } from "./bus-provider.interface";

export class MockBusProvider implements BusProvider {
  readonly name = "MOCK_BUSES";
  readonly mode = "BUS" as const;

  async search(request: TransportSearchRequest): Promise<TransportOption[]> {
    throwIfMockProviderDisabled(this.name);

    if (!request.preferredTransport.includes(this.mode)) {
      return [];
    }

    return mockBuses
      .filter((record) => {
        if (request.includeNetwork) {
          return true;
        }
        return locationsMatch(request.origin, record.origin) && locationsMatch(request.destination, record.destination);
      })
      .map((record) => materializeTransportRecord(record, request.departureDate));
  }
}
