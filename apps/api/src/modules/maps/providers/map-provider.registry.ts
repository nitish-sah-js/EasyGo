import type { MapProvider } from "./map-provider.interface";
import { HaversineMapProvider } from "./haversine-map.provider";

/**
 * No routing API ships with this integration, so point-to-point distance is computed
 * geometrically (Haversine) over the real coordinates supplied by Google Places.
 * The distance is real; the road-travel time derived from it is an estimate.
 */
export function getMapProvider(): MapProvider {
  return new HaversineMapProvider();
}
