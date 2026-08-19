import {
  locationsMatch,
  materializeTransportRecord,
  mockTrains,
  type TransportOption,
  type TransportSearchRequest,
} from "@nexttour/shared";
import { throwIfMockProviderDisabled } from "../../../../lib/mock-failure";
import type { TrainProvider } from "./train-provider.interface";

export class MockTrainProvider implements TrainProvider {
  readonly name = "MOCK_TRAINS";
  readonly mode = "TRAIN" as const;

  async search(request: TransportSearchRequest): Promise<TransportOption[]> {
    throwIfMockProviderDisabled(this.name);

    if (!request.preferredTransport.includes(this.mode)) {
      return [];
    }

    return mockTrains
      .filter((record) => {
        if (request.includeNetwork) {
          return true;
        }
        return locationsMatch(request.origin, record.origin) && locationsMatch(request.destination, record.destination);
      })
      .map((record) => materializeTransportRecord(record, request.departureDate));
  }
}
