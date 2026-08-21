import type { PlacePhoto } from "@nexttour/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Photo URLs point at the API, not at Google.
 *
 * The Places photo endpoint needs the server's API key, so the browser asks the
 * API to resolve a reference and follow the redirect to Google's CDN. That keeps
 * the key server-side and lets one cached lookup serve every visitor.
 *
 * `width` is snapped server-side to a fixed ladder (200/400/800/1200/1600) —
 * pass the widest the layout can render, not an exact pixel count.
 */
export function placePhotoUrl(photo: PlacePhoto | undefined, width: number): string | undefined {
  if (!photo?.name) return undefined;
  return `${API_URL}/api/places/photo?name=${encodeURIComponent(photo.name)}&w=${width}`;
}

/** The first photo of a place, if Google had one. */
export function firstPhotoUrl(
  place: { photos?: PlacePhoto[] } | undefined,
  width: number,
): string | undefined {
  return placePhotoUrl(place?.photos?.[0], width);
}

/**
 * A representative photo of a destination city, resolved by the API from the
 * city's own Places entry (falling back to its most popular attraction).
 */
export function cityPhotoUrl(city: string, width: number): string {
  return `${API_URL}/api/places/city-photo?city=${encodeURIComponent(city)}&w=${width}`;
}

/** Google's terms require the photographer credit to travel with the image. */
export function photoCredit(photo: PlacePhoto | undefined): string | undefined {
  return photo?.attribution ? `Photo: ${photo.attribution}` : undefined;
}
