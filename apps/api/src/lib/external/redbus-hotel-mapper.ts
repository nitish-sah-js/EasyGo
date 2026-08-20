import { haversineDistanceKm, type Coordinates, type Hotel } from "@nexttour/shared";
import type { RawHotelResult } from "./redbus-hotels-scraper";

type PriceLevel = "BUDGET" | "MID_RANGE" | "PREMIUM";

/**
 * redBus quotes a real nightly rate, so the price tier is derived from that rate
 * rather than guessed. Thresholds are INR per night for a standard double.
 */
export function priceLevelFromRate(pricePerNight: number): PriceLevel {
  if (pricePerNight < 2_000) return "BUDGET";
  if (pricePerNight < 6_000) return "MID_RANGE";
  return "PREMIUM";
}

/** redBus badge text → the amenity vocabulary the UI already renders. */
function toAmenities(raw: RawHotelResult): string[] {
  const amenities = new Set<string>();
  for (const badge of raw.badges) {
    if (/breakfast/i.test(badge)) amenities.add("Breakfast");
    else if (/cancellation/i.test(badge)) amenities.add("Free cancellation");
    else if (/couple/i.test(badge)) amenities.add("Couple friendly");
    else if (/check-?in/i.test(badge)) amenities.add(badge);
    else if (badge.length <= 24) amenities.add(badge);
  }
  return [...amenities];
}

function toCancellationPolicy(raw: RawHotelResult): string {
  return raw.badges.some((badge) => /free cancellation/i.test(badge))
    ? "Free cancellation (per redBus listing)"
    : "Contact property for cancellation policy";
}

function toRoomType(raw: RawHotelResult): string {
  if (raw.propertyType && /hostel/i.test(raw.propertyType)) return "Hostel bed";
  if (raw.propertyType && /resort/i.test(raw.propertyType)) return "Resort room";
  return "Standard room";
}

/**
 * Maps a redBus property card onto Project A's `Hotel`.
 *
 * redBus does not publish per-property coordinates, so `resolveCoordinates` supplies
 * them (Google Places text search) and the city centre is used when that fails —
 * `distanceFromCenterKm` is then 0, which is honest rather than invented.
 */
export function toHotel(raw: RawHotelResult, city: string, cityCenter: Coordinates, index: number): Hotel {
  const pricePerNight = raw.price ?? 0;
  // redBus publishes no per-property coordinates; RealHotelProvider geocodes the
  // top-ranked properties afterwards and leaves the rest on the city centre.
  const coordinates = cityCenter;
  const location = [raw.area, raw.proximity].filter(Boolean).join(" — ") || city;

  return {
    id: `redbus-hotel-${index}-${raw.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
    type: "HOTEL",
    name: raw.name,
    city,
    location,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    rating: raw.rating ?? 0,
    priceLevel: priceLevelFromRate(pricePerNight),
    estimatedCost: pricePerNight,
    source: "REAL",
    reviewCount: raw.reviewCount ?? 0,
    pricePerNight,
    amenities: toAmenities(raw),
    roomType: toRoomType(raw),
    distanceFromCenterKm: haversineDistanceKm(cityCenter, coordinates),
    cancellationPolicy: toCancellationPolicy(raw),
    priceSource: "LIVE",
  };
}

export function toHotels(results: RawHotelResult[], city: string, cityCenter: Coordinates): Hotel[] {
  return results
    .filter((raw) => raw.name.length > 0 && typeof raw.price === "number" && raw.price > 0)
    .map((raw, index) => toHotel(raw, city, cityCenter, index));
}
