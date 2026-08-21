import { CITY_COORDINATES, resolveCityName, type PlacePhoto } from "@nexttour/shared";
import { env } from "../../config/env";
import { GooglePlacesClient } from "../../lib/external/google-places-client";
import { cachedProviderResult } from "../../lib/provider-cache";
import { resolveCityCenter, searchNearbyPlaces } from "../../lib/external/google-places-search";

const PROVIDER = "GOOGLE_PLACES_PHOTOS";

/**
 * Photo resource names are opaque, long base64url-ish references. Anchoring the
 * shape here keeps the public photo endpoint from being turned into a generic
 * proxy for arbitrary Google URLs.
 */
const PHOTO_NAME_PATTERN = /^places\/[A-Za-z0-9_-]{1,255}\/photos\/[A-Za-z0-9_-]{1,1024}$/;

const MIN_PHOTO_WIDTH = 160;
const MAX_PHOTO_WIDTH = 1_600;

export function isPhotoName(value: string): boolean {
  return PHOTO_NAME_PATTERN.test(value);
}

/**
 * Widths are snapped to a small ladder rather than honoured exactly: the resolved
 * URL is cached per width, and letting callers pick any integer would shard the
 * cache into near-duplicates and bill a photo-media call for each one.
 */
const WIDTH_STEPS = [200, 400, 800, 1_200, 1_600] as const;

export function normalizePhotoWidth(requested: number | undefined): number {
  if (!requested || !Number.isFinite(requested)) return 800;
  const clamped = Math.min(Math.max(Math.round(requested), MIN_PHOTO_WIDTH), MAX_PHOTO_WIDTH);
  return WIDTH_STEPS.find((step) => step >= clamped) ?? MAX_PHOTO_WIDTH;
}

/**
 * A lookup that found nothing is cached only briefly. "No photo" is usually not a
 * fact about the place — it is an API key without the photo entitlement, or a
 * transient miss — and a long TTL would keep the site image-less for hours after
 * the key is fixed.
 */
const EMPTY_RESULT_TTL_SECONDS = 300;

const client = new GooglePlacesClient();

/**
 * Resolves a photo reference to a CDN URL the browser can load directly.
 *
 * Cached well inside Google's own expiry for the returned URL, so a popular
 * destination card costs one photo-media call per TTL rather than one per
 * visitor. Returns undefined rather than throwing — a missing image is a
 * cosmetic degradation, and every caller has a rendered fallback.
 */
export async function resolvePhotoUri(photoName: string, width: number): Promise<string | undefined> {
  if (!isPhotoName(photoName)) return undefined;
  if (!env.GOOGLE_MAPS_API_KEY) return undefined;

  const maxWidthPx = normalizePhotoWidth(width);

  try {
    const result = await cachedProviderResult(
      PROVIDER,
      { keyParts: ["photo", String(maxWidthPx)], request: { photoName, maxWidthPx } },
      (value) => (value.uri ? env.PLACE_PHOTO_CACHE_TTL_SECONDS : EMPTY_RESULT_TTL_SECONDS),
      async () => ({ uri: (await client.fetchPhotoUri(photoName, maxWidthPx)) ?? null }),
      { label: `photo ${photoName.slice(-12)} @${maxWidthPx}px`, liveAction: "photo media hit" },
    );
    return result.uri ?? undefined;
  } catch (error) {
    console.warn(`[places-photos] could not resolve ${photoName}: ${(error as Error).message}`);
    return undefined;
  }
}

/**
 * Picks a representative photo for a destination city.
 *
 * The city's own Places entry usually carries a skyline or landmark shot; when it
 * does not, the most popular nearby tourist attraction stands in, which is closer
 * to what a traveller expects on a destination card than a generic map tile.
 */
async function findCityPhoto(city: string): Promise<PlacePhoto | null> {
  const fromCity = await client.searchText(`${city}, India`, 1);
  const cityPhoto = toPlacePhoto(fromCity.places?.[0]?.photos?.[0]);
  if (cityPhoto) return cityPhoto;

  const center = await resolveCityCenter(client, city);
  const nearby = await searchNearbyPlaces(client, center, "tourist_attraction", { maxResultCount: 10 });
  for (const place of nearby) {
    const photo = toPlacePhoto(place.photos?.[0]);
    if (photo) return photo;
  }
  return null;
}

function toPlacePhoto(photo: { name?: string; authorAttributions?: Array<{ displayName?: string; uri?: string }> } | undefined): PlacePhoto | null {
  if (!photo?.name) return null;
  const author = photo.authorAttributions?.[0];
  return {
    name: photo.name,
    ...(author?.displayName ? { attribution: author.displayName } : {}),
    ...(author?.uri ? { attributionUri: author.uri } : {}),
  };
}

/**
 * Only the cities the planners can actually resolve get a photo lookup. The
 * endpoint is unauthenticated so the landing page can use it logged out, and an
 * open city parameter would let anyone spend the project's Places quota.
 */
export async function getCityPhoto(city: string): Promise<PlacePhoto | undefined> {
  const canonical = resolveCityName(city);
  if (!canonical || !(canonical in CITY_COORDINATES)) return undefined;
  if (!env.GOOGLE_MAPS_API_KEY) return undefined;

  try {
    const result = await cachedProviderResult(
      PROVIDER,
      { keyParts: ["city-photo", canonical], request: { city: canonical } },
      (value) => (value.photo ? env.PLACES_CACHE_TTL_SECONDS : EMPTY_RESULT_TTL_SECONDS),
      async () => ({ photo: await findCityPhoto(canonical) }),
      { label: `city photo ${canonical}`, liveAction: "city photo lookup" },
    );
    return result.photo ?? undefined;
  } catch (error) {
    console.warn(`[places-photos] could not resolve a photo for ${canonical}: ${(error as Error).message}`);
    return undefined;
  }
}
