import type { PlacePhoto } from "@nexttour/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Photo URLs point at the API, not at Wikimedia.
 *
 * The photo endpoint resolves a Commons file title to a thumbnail URL and
 * follows the redirect to Wikimedia's CDN, so one cached lookup serves every
 * visitor instead of each browser hitting Commons directly.
 *
 * `width` is snapped server-side to a fixed ladder (200/400/800/1200/1600) —
 * pass the widest the layout can render, not an exact pixel count.
 */
export function placePhotoUrl(photo: PlacePhoto | undefined, width: number): string | undefined {
  if (!photo?.name) return undefined;
  return `${API_URL}/api/places/photo?name=${encodeURIComponent(photo.name)}&w=${width}`;
}

/** The first photo of a place, if Wikimedia Commons had one. */
export function firstPhotoUrl(
  place: { photos?: PlacePhoto[] } | undefined,
  width: number,
): string | undefined {
  return placePhotoUrl(place?.photos?.[0], width);
}

/**
 * A representative photo of a destination city, resolved by the API from a
 * Wikimedia Commons search for the city.
 */
export function cityPhotoUrl(city: string, width: number): string {
  return `${API_URL}/api/places/city-photo?city=${encodeURIComponent(city)}&w=${width}`;
}

/** Most Commons licenses (e.g. CC BY-SA) require the photographer credit to travel with the image. */
export function photoCredit(photo: PlacePhoto | undefined): string | undefined {
  if (!photo?.attribution) return undefined;
  return photo.license ? `Photo: ${photo.attribution} (${photo.license})` : `Photo: ${photo.attribution}`;
}
