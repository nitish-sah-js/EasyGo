import { haversineDistanceKm, type Coordinates, type RouteDistance } from "@nexttour/shared";
import type { MapProvider } from "./map-provider.interface";

const SPEED_KMPH = {
  WALK: 4,
  CAR: 28,
  BUS: 22,
  TRAIN: 55,
} as const;

export class HaversineMapProvider implements MapProvider {
  readonly name = "HAVERSINE_MAPS";

  async getDistance(origin: Coordinates, destination: Coordinates): Promise<RouteDistance> {
    return this.getTravelTime(origin, destination, "CAR");
  }

  async getTravelTime(
    origin: Coordinates,
    destination: Coordinates,
    mode: keyof typeof SPEED_KMPH,
  ): Promise<RouteDistance> {
    const distanceKm = haversineDistanceKm(origin, destination);
    const travelTimeMinutes = Math.max(5, Math.round((distanceKm / SPEED_KMPH[mode]) * 60));
    return { origin, destination, distanceKm, travelTimeMinutes, mode };
  }
}
