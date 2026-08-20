import type { RouteDistance } from "@nexttour/shared";
import { getMapProvider } from "./providers/map-provider.registry";

export function parseCoordinates(value: string): { latitude: number; longitude: number } {
  const parts = value.split(",").map((part) => Number(part.trim()));
  const latitude = parts[0];
  const longitude = parts[1];
  if (
    latitude === undefined ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error("Coordinates must be in `latitude,longitude` format");
  }
  return { latitude, longitude };
}

export class MapsService {
  private readonly provider = getMapProvider();

  async getDistance(origin: string, destination: string, mode: RouteDistance["mode"]) {
    return this.provider.getTravelTime(parseCoordinates(origin), parseCoordinates(destination), mode);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for API-shape parity with /travel-time's query params
  async getLeg(origin: string, destination: string, mode: RouteDistance["mode"]) {
    return this.provider.getDistance(parseCoordinates(origin), parseCoordinates(destination));
  }
}

export const mapsService = new MapsService();