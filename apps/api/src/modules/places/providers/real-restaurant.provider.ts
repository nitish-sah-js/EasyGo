import type { Restaurant, TripPlanningRequest } from "@nexttour/shared";
import { env } from "../../../config/env";
import { GooglePlacesClient } from "../../../lib/external/google-places-client";
import type { GooglePlace } from "../../../lib/external/google-places-client";
import { isPlaceUsable, toRestaurant } from "../../../lib/external/google-places-mapper";
import { resolveCityCenter, searchNearbyPlaces } from "../../../lib/external/google-places-search";
import { withTimeout } from "../../../lib/with-timeout";
import { filterAndRankRestaurants } from "../places-ranking";
import type { RestaurantProvider } from "./places-provider.interface";

export class RealRestaurantProvider implements RestaurantProvider {
  readonly name = "GOOGLE_PLACES_RESTAURANTS";

  private readonly client = new GooglePlacesClient();

  async search(city: string, request: TripPlanningRequest): Promise<Restaurant[]> {
    return withTimeout(this.fetchRestaurants(city, request), env.EXTERNAL_API_TIMEOUT_MS * 3, this.name);
  }

  private async fetchRestaurants(city: string, request: TripPlanningRequest): Promise<Restaurant[]> {
    const center = await resolveCityCenter(this.client, city);
    const [restaurants, cafes] = await Promise.all([
      searchNearbyPlaces(this.client, center, "restaurant"),
      searchNearbyPlaces(this.client, center, "cafe"),
    ]);

    const seen = new Set<string>();
    const merged: GooglePlace[] = [];
    for (const place of [...restaurants, ...cafes]) {
      const key = place.id ?? place.displayName?.text ?? "";
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(place);
    }

    const mapped = merged.filter(isPlaceUsable).map((place, index) => toRestaurant(place, city, index));
    return filterAndRankRestaurants(mapped, request);
  }
}
