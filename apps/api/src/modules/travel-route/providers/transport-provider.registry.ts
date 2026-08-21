import type { TransportProvider } from "./transport-provider.interface";
import { CachedTransportProvider } from "./cached-transport.provider";
import { RealBusProvider } from "./buses/real-bus.provider";
import { RealFlightProvider } from "./flights/real-flight.provider";
import { RealTrainProvider } from "./trains/real-train.provider";

export function getTransportProviders(): TransportProvider[] {
  return [new RealFlightProvider(), new RealTrainProvider(), new RealBusProvider()].map(
    (provider) => new CachedTransportProvider(provider),
  );
}
