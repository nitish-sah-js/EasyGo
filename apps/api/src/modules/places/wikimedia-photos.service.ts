import type { PlacePhoto } from "@nexttour/shared";
import { WikimediaCommonsClient, type WikimediaImage } from "../../lib/external/wikimedia-commons-client";
import { cachedProviderResult } from "../../lib/provider-cache";

const PROVIDER = "WIKIMEDIA_COMMONS_SEARCH";

/**
 * Commons search returns candidates of wildly varying relevance for an
 * obscure query; only the first few are ever rendered (a card image and, at
 * most, a small gallery), so the tail is dropped here.
 */
const MAX_PHOTOS_PER_PLACE = 3;

/**
 * A lookup that found nothing is cached only briefly. Most hotels/small
 * attractions simply have no Commons coverage, but a short TTL still lets a
 * fixable miss (a transient search hiccup) resolve on the next request rather
 * than staying image-less for a full cache cycle.
 */
const EMPTY_RESULT_TTL_SECONDS = 300;
const HIT_TTL_SECONDS = 21_600;

const client = new WikimediaCommonsClient();

function toPlacePhoto(image: WikimediaImage): PlacePhoto {
  return {
    name: image.title,
    ...(image.attribution ? { attribution: image.attribution } : {}),
    ...(image.pageUrl ? { attributionUri: image.pageUrl } : {}),
    ...(image.license ? { license: image.license } : {}),
    ...(image.width !== undefined ? { widthPx: image.width } : {}),
    ...(image.height !== undefined ? { heightPx: image.height } : {}),
  };
}

async function searchPlacePhotos(query: string): Promise<PlacePhoto[]> {
  try {
    const result = await cachedProviderResult(
      PROVIDER,
      { keyParts: ["search", query.toLowerCase()], request: { query } },
      (value: { photos: PlacePhoto[] }) => (value.photos.length ? HIT_TTL_SECONDS : EMPTY_RESULT_TTL_SECONDS),
      async () => {
        const images = await client.searchImages(query, MAX_PHOTOS_PER_PLACE);
        return { photos: images.map(toPlacePhoto) };
      },
      { label: `wikimedia search ${query}`, liveAction: "commons search hit" },
    );
    return result.photos;
  } catch (error) {
    console.warn(`[wikimedia-photos] search failed for "${query}": ${(error as Error).message}`);
    return [];
  }
}

/**
 * Attaches a Commons photo to the top-ranked places that don't already have
 * one. Capped and fanned out the same way hotel geocoding is
 * (`HOTEL_GEOCODE_LIMIT` in `real-hotel.provider.ts`): only the places
 * actually likely to be shown are worth a lookup, and the rest are returned
 * untouched rather than each costing a Commons request.
 */
export async function attachWikimediaPhotos<T extends { name: string; city: string; photos?: PlacePhoto[] }>(
  places: T[],
  limit: number,
): Promise<T[]> {
  const head = places.slice(0, limit);
  const withPhotos = await Promise.all(
    head.map(async (place) => {
      if (place.photos?.length) return place;
      const photos = await searchPlacePhotos(`${place.name} ${place.city}`);
      return photos.length ? { ...place, photos } : place;
    }),
  );

  return [...withPhotos, ...places.slice(limit)];
}
