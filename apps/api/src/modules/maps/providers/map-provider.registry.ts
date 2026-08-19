import { env } from "../../../config/env";
import type { MapProvider } from "./map-provider.interface";
import { MockMapProvider } from "./mock-map.provider";

export function getMapProvider(): MapProvider {
  if (env.TRAVEL_DATA_MODE !== "MOCK") {
    throw new Error(
      `TRAVEL_DATA_MODE=${env.TRAVEL_DATA_MODE} is not implemented. Real map providers are not available in this MVP.`,
    );
  }
  return new MockMapProvider();
}