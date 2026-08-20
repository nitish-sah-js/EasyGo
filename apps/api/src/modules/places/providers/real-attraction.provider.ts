import type { Attraction, TripPlanningRequest } from "@nexttour/shared";
import { env } from "../../../config/env";
import { GooglePlacesClient } from "../../../lib/external/google-places-client";
import { isPlaceUsable, toAttraction } from "../../../lib/external/google-places-mapper";
import { resolveCityCenter, searchNearbyPlaces } from "../../../lib/external/google-places-search";
import { withTimeout } from "../../../lib/with-timeout";
import { rankAttractions } from "../places-ranking";
import type { AttractionProvider } from "./places-provider.interface";

export class RealAttractionProvider implements AttractionProvider {
  readonly name = "GOOGLE_PLACES_ATTRACTIONS";

  private readonly client = new GooglePlacesClient();

  async search(city: string, request: TripPlanningRequest): Promise<Attraction[]> {
    return withTimeout(this.fetchAttractions(city, request), env.EXTERNAL_API_TIMEOUT_MS * 3, this.name);
  }

  private async fetchAttractions(city: string, request: TripPlanningRequest): Promise<Attraction[]> {
    const center = await resolveCityCenter(this.client, city);
    const places = await searchNearbyPlaces(this.client, center, "tourist_attraction");
    const attractions = places.filter(isPlaceUsable).map((place, index) => toAttraction(place, city, index));
    return rankAttractions(attractions, request);
  }
}
