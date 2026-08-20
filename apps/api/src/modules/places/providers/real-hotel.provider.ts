import { haversineDistanceKm, type Coordinates, type Hotel, type TripPlanningRequest } from "@nexttour/shared";
import { env } from "../../../config/env";
import { GooglePlacesClient } from "../../../lib/external/google-places-client";
import { isPlaceUsable, toHotel as toGooglePlacesHotel } from "../../../lib/external/google-places-mapper";
import { geocodeHotel, resolveCityCenter, searchNearbyPlaces } from "../../../lib/external/google-places-search";
import { toHotels as toRedbusHotels } from "../../../lib/external/redbus-hotel-mapper";
import { RedbusHotelsScraper } from "../../../lib/external/redbus-hotels-scraper";
import { withTimeout } from "../../../lib/with-timeout";
import { rankHotels } from "../places-ranking";
import type { HotelProvider } from "./places-provider.interface";

/**
 * Two-tier hotel sourcing:
 *
 *  1. redBus — real property names with the actual nightly rate quoted for the trip
 *     dates, plus rating, review count and amenity badges (`priceSource: "LIVE"`).
 *  2. Google Places — used when redBus has no catalog entry for the city or the
 *     scrape fails. Google publishes no rates, so nightly price falls back to a
 *     coarse price-tier estimate (`priceSource: "ESTIMATE"`).
 *
 * Coordinates always come from Google Places, since redBus publishes none.
 */
export class RealHotelProvider implements HotelProvider {
  readonly name = "REDBUS_HOTELS";

  private readonly placesClient = new GooglePlacesClient();
  private readonly scraper = new RedbusHotelsScraper();

  async search(city: string, request: TripPlanningRequest): Promise<Hotel[]> {
    const cityCenter = await resolveCityCenter(this.placesClient, city);

    let hotels: Hotel[] = [];
    try {
      hotels = await this.searchRedbus(city, request, cityCenter);
    } catch {
      // Scraping is inherently brittle; fall through to the Places tier below.
      hotels = [];
    }

    if (hotels.length === 0) {
      hotels = await this.searchGooglePlaces(city, cityCenter);
      return rankHotels(hotels, request);
    }

    const ranked = rankHotels(hotels, request);
    return this.withRealCoordinates(ranked, city, cityCenter);
  }

  private async searchRedbus(city: string, request: TripPlanningRequest, cityCenter: Coordinates): Promise<Hotel[]> {
    const result = await withTimeout(
      this.scraper.searchHotels({
        city,
        checkIn: request.departureDate,
        checkOut: request.returnDate,
        adults: request.travelers,
        rooms: Math.max(1, Math.ceil(request.travelers / 2)),
        limit: 20,
      }),
      env.REDBUS_HOTEL_TIMEOUT_MS + 10_000,
      this.name,
    );

    return toRedbusHotels(result.results, city, cityCenter);
  }

  /**
   * Replaces the city-centre placeholder coordinates on the top-ranked properties
   * with real ones. Properties past the limit keep the city centre, and their
   * `distanceFromCenterKm` stays 0 rather than reporting a distance we didn't measure.
   */
  private async withRealCoordinates(hotels: Hotel[], city: string, cityCenter: Coordinates): Promise<Hotel[]> {
    // Geocoding runs *after* ranking so the hotel the UI actually shows — and the one
    // used for hotel↔attraction distances — always has real coordinates. Each lookup
    // costs one Places `searchText` call against a per-day project quota, so the
    // number is deliberately small and tunable.
    const head = hotels.slice(0, env.HOTEL_GEOCODE_LIMIT);
    const located = await Promise.all(
      head.map(async (hotel) => {
        const coordinates = await geocodeHotel(this.placesClient, hotel.name, city, hotel.location);
        if (!coordinates) return hotel;
        return {
          ...hotel,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          distanceFromCenterKm: haversineDistanceKm(cityCenter, coordinates),
        };
      }),
    );

    return [...located, ...hotels.slice(env.HOTEL_GEOCODE_LIMIT)];
  }

  private async searchGooglePlaces(city: string, cityCenter: Coordinates): Promise<Hotel[]> {
    const places = await withTimeout(
      searchNearbyPlaces(this.placesClient, { ...cityCenter, name: city }, "hotel"),
      env.EXTERNAL_API_TIMEOUT_MS * 2,
      `${this.name}_PLACES_FALLBACK`,
    );
    return places.filter(isPlaceUsable).map((place, index) => toGooglePlacesHotel(place, city, cityCenter, index));
  }
}
