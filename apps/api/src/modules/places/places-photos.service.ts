import { CITY_COORDINATES, resolveCityName, type PlacePhoto } from "@nexttour/shared";
import { env } from "../../config/env";
import { WikimediaCommonsClient } from "../../lib/external/wikimedia-commons-client";
import { cachedProviderResult } from "../../lib/provider-cache";

const PROVIDER = "WIKIMEDIA_COMMONS_PHOTOS";

/**
 * Commons file titles start with `File:` and, unlike a path, never contain a
 * slash or wiki-markup control characters. Anchoring the shape here keeps the
 * public photo endpoint from being turned into a generic proxy for arbitrary
 * Wikimedia (or other) URLs.
 */
const PHOTO_NAME_PATTERN = /^File:[^/<>#[\]|{}\x00-\x1f]{1,255}$/;

const MIN_PHOTO_WIDTH = 160;
const MAX_PHOTO_WIDTH = 1_600;

export function isPhotoName(value: string): boolean {
  return PHOTO_NAME_PATTERN.test(value);
}

/**
 * Widths are snapped to a small ladder rather than honoured exactly: the resolved
 * URL is cached per width, and letting callers pick any integer would shard the
 * cache into near-duplicates and cost a Commons lookup for each one.
 */
const WIDTH_STEPS = [200, 400, 800, 1_200, 1_600] as const;

export function normalizePhotoWidth(requested: number | undefined): number {
  if (!requested || !Number.isFinite(requested)) return 800;
  const clamped = Math.min(Math.max(Math.round(requested), MIN_PHOTO_WIDTH), MAX_PHOTO_WIDTH);
  return WIDTH_STEPS.find((step) => step >= clamped) ?? MAX_PHOTO_WIDTH;
}

/**
 * A lookup that found nothing is cached only briefly. "No photo" is usually not a
 * fact about the place — it is a transient miss — and a long TTL would keep the
 * site image-less for hours after the cause clears.
 */
const EMPTY_RESULT_TTL_SECONDS = 300;

const client = new WikimediaCommonsClient();

/**
 * Resolves a Commons file title to a CDN thumbnail URL the browser can load
 * directly.
 *
 * Cached well past the request itself, so a popular destination card costs one
 * Commons lookup per TTL rather than one per visitor. Returns undefined rather
 * than throwing — a missing image is a cosmetic degradation, and every caller
 * has a rendered fallback.
 */
export async function resolvePhotoUri(photoName: string, width: number): Promise<string | undefined> {
  if (!isPhotoName(photoName)) return undefined;

  const maxWidthPx = normalizePhotoWidth(width);

  try {
    const result = await cachedProviderResult(
      PROVIDER,
      { keyParts: ["photo", String(maxWidthPx)], request: { photoName, maxWidthPx } },
      (value) => (value.uri ? env.PLACE_PHOTO_CACHE_TTL_SECONDS : EMPTY_RESULT_TTL_SECONDS),
      async () => ({ uri: (await client.resolveImageUrl(photoName, maxWidthPx)) ?? null }),
      { label: `photo ${photoName} @${maxWidthPx}px`, liveAction: "photo resolve hit" },
    );
    return result.uri ?? undefined;
  } catch (error) {
    console.warn(`[places-photos] could not resolve ${photoName}: ${(error as Error).message}`);
    return undefined;
  }
}

/**
 * Picks a representative photo for a destination city, searching Commons for a
 * skyline/landmark shot first and falling back to a plainer city-name query.
 */
async function findCityPhoto(city: string): Promise<PlacePhoto | null> {
  const queries = [`${city} skyline`, `${city}, India`];
  for (const query of queries) {
    const [image] = await client.searchImages(query, 1);
    if (image) return toPlacePhoto(image);
  }
  return null;
}

function toPlacePhoto(image: { title: string; pageUrl?: string; attribution?: string; license?: string }): PlacePhoto {
  return {
    name: image.title,
    ...(image.attribution ? { attribution: image.attribution } : {}),
    ...(image.pageUrl ? { attributionUri: image.pageUrl } : {}),
    ...(image.license ? { license: image.license } : {}),
  };
}

/**
 * Only the cities the planners can actually resolve get a photo lookup. The
 * endpoint is unauthenticated so the landing page can use it logged out, and an
 * open city parameter would let anyone spend the lookup on arbitrary input.
 */
export async function getCityPhoto(city: string): Promise<PlacePhoto | undefined> {
  const canonical = resolveCityName(city);
  if (!canonical || !(canonical in CITY_COORDINATES)) return undefined;

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
