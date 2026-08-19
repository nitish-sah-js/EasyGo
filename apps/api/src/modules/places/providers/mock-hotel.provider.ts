import { cityMatches, mockHotels, type Hotel, type TripPlanningRequest } from "@nexttour/shared";
import { throwIfMockProviderDisabled } from "../../../lib/mock-failure";
import type { HotelProvider } from "./places-provider.interface";

export class MockHotelProvider implements HotelProvider {
  readonly name = "MOCK_HOTELS";

  async search(city: string, request: TripPlanningRequest): Promise<Hotel[]> {
    throwIfMockProviderDisabled(this.name);

    return mockHotels
      .filter((hotel) => cityMatches(hotel.city, city))
      .sort((left, right) => {
        const preferredLevel = request.accommodationPreference;
        const leftMatch = left.priceLevel === preferredLevel ? 1 : 0;
        const rightMatch = right.priceLevel === preferredLevel ? 1 : 0;
        return rightMatch - leftMatch || left.pricePerNight - right.pricePerNight || right.rating - left.rating;
      });
  }
}
