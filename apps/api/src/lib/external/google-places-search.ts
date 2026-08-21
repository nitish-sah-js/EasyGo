import type { Coordinates, PlacePhoto } from "@nexttour/shared";
import { env } from "../../config/env";
import { cachedProviderResult } from "../provider-cache";
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

/**
 * Resolves a place by its own name: the "name -> search -> place -> photo"
 * lookup every surface needs when a place arrives without Google's data attached.
 *
 * redBus lists property names but no coordinates, and a nearby search returns a
 * photo for most but not all of its results — both gaps are closed by the same
 * text search, so callers get coordinates and a photo for one billed call rather
 * than two.
 *
 * Returns an empty result (never throws) so a failed lookup degrades to the
 * caller's fallback instead of losing the place entirely.
 */
export interface NamedPlaceLookup {
  placeId?: string;
  coordinates?: Coordinates;
  photo?: PlacePhoto;
}

// A lookup that found nothing is kept only briefly: it usually means the
// property has no exact Places match on this pass rather than a durable fact,
// and a full-length TTL would keep retrying the same failed query needlessly
// while also keeping a fixable "no photo" around for hours.
const EMPTY_LOOKUP_TTL_SECONDS = 300;

export async function lookupPlaceByName(
  client: GooglePlacesClient,
  name: string,
  city: string,
  area?: string | null,
): Promise<NamedPlaceLookup> {
  const query = [name, area, city, "India"].filter(Boolean).join(", ");

  try {
    return await cachedProviderResult(
      "GOOGLE_PLACES_NAME_LOOKUP",
      { keyParts: ["name-lookup", query.toLowerCase()], request: { query } },
      (value: NamedPlaceLookup) => (value.placeId ? env.PLACES_CACHE_TTL_SECONDS : EMPTY_LOOKUP_TTL_SECONDS),
      async () => {
        const result = await client.searchText(query, 1);
        const place = result.places?.[0];
        if (!place) return {};

        const location = place.location;
        const photo = place.photos?.[0];
        const author = photo?.authorAttributions?.[0];

        return {
          ...(place.id ? { placeId: place.id } : {}),
          ...(typeof location?.latitude === "number" && typeof location.longitude === "number"
            ? { coordinates: { latitude: location.latitude, longitude: location.longitude } }
            : {}),
          ...(photo?.name
            ? {
                photo: {
                  name: photo.name,
                  ...(author?.displayName ? { attribution: author.displayName } : {}),
                  ...(author?.uri ? { attributionUri: author.uri } : {}),
                  ...(photo.widthPx !== undefined ? { widthPx: photo.widthPx } : {}),
                  ...(photo.heightPx !== undefined ? { heightPx: photo.heightPx } : {}),
                },
              }
            : {}),
        };
      },
      { label: `name lookup ${query}`, liveAction: "name lookup hit" },
    );
  } catch {
    return {};
  }
}
