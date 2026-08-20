import type { Coordinates } from "@nexttour/shared";
import type { GooglePlace, GooglePlacesClient } from "./google-places-client";

export interface CityCenter {
  latitude: number;
  longitude: number;
  name: string;
}

const cityCenterCache = new Map<string, CityCenter>();

export async function resolveCityCenter(client: GooglePlacesClient, city: string, country = "India"): Promise<CityCenter> {
  const key = `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
  const cached = cityCenterCache.get(key);
  if (cached) return cached;

  const result = await client.searchText(`${city}, ${country}`, 1);
  const place = result.places?.[0];
  if (!place?.location?.latitude || !place.location.longitude) {
    throw new Error(`Google Places could not resolve city: ${city}.`);
  }

  const center: CityCenter = {
    latitude: place.location.latitude,
    longitude: place.location.longitude,
    name: place.displayName?.text ?? city,
  };
  cityCenterCache.set(key, center);
  return center;
}

export async function searchNearbyPlaces(
  client: GooglePlacesClient,
  center: CityCenter,
  includedType: string,
  options: { radiusMeters?: number; maxResultCount?: number } = {},
): Promise<GooglePlace[]> {
  const result = await client.searchNearby({
    includedType,
    latitude: center.latitude,
    longitude: center.longitude,
    radiusMeters: options.radiusMeters ?? 20_000,
    maxResultCount: options.maxResultCount ?? 20,
  });
  return result.places ?? [];
}

const hotelCoordinateCache = new Map<string, Coordinates | null>();

/**
 * redBus lists property names but no coordinates. This resolves a single property
 * to a real lat/long via a Places text search, so the map marker and hotel↔attraction
 * distances are genuine rather than the city centre.
 *
 * Returns undefined (never throws) so a failed lookup degrades to the city centre
 * instead of losing the hotel entirely.
 */
export async function geocodeHotel(
  client: GooglePlacesClient,
  hotelName: string,
  city: string,
  area?: string | null,
): Promise<Coordinates | undefined> {
  const query = [hotelName, area, city, "India"].filter(Boolean).join(", ");
  const key = query.toLowerCase();

  const cached = hotelCoordinateCache.get(key);
  if (cached !== undefined) return cached ?? undefined;

  try {
    const result = await client.searchText(query, 1);
    const location = result.places?.[0]?.location;
    if (typeof location?.latitude === "number" && typeof location.longitude === "number") {
      const coordinates: Coordinates = { latitude: location.latitude, longitude: location.longitude };
      hotelCoordinateCache.set(key, coordinates);
      return coordinates;
    }
  } catch {
    // Fall through — the caller substitutes the city centre.
  }

  hotelCoordinateCache.set(key, null);
  return undefined;
}
