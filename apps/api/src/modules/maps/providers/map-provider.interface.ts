import type { Coordinates, RouteDistance } from "@nexttour/shared";

export interface MapProvider {
  readonly name: string;
  getDistance(origin: Coordinates, destination: Coordinates): Promise<RouteDistance>;
  getTravelTime(
    origin: Coordinates,
    destination: Coordinates,
    mode: "WALK" | "CAR" | "BUS" | "TRAIN",
  ): Promise<RouteDistance>;
}
