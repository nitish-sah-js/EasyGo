import { env } from "../../../config/env";
import type { TransportProvider } from "./transport-provider.interface";
import { MockBusProvider } from "./buses/mock-bus.provider";
import { MockFlightProvider } from "./flights/mock-flight.provider";
import { MockTrainProvider } from "./trains/mock-train.provider";

export function getTransportProviders(): TransportProvider[] {
  if (env.TRAVEL_DATA_MODE !== "MOCK") {
    throw new Error(
      `TRAVEL_DATA_MODE=${env.TRAVEL_DATA_MODE} is not implemented. Real transport providers are not available in this MVP.`,
    );
  }

  return [new MockFlightProvider(), new MockTrainProvider(), new MockBusProvider()];
}