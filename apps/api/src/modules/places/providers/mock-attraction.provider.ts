import { cityMatches, mockAttractions, type Attraction, type TripPlanningRequest } from "@nexttour/shared";
import { throwIfMockProviderDisabled } from "../../../lib/mock-failure";
import type { AttractionProvider } from "./places-provider.interface";

export class MockAttractionProvider implements AttractionProvider {
  readonly name = "MOCK_ATTRACTIONS";

  async search(city: string, request: TripPlanningRequest): Promise<Attraction[]> {
    throwIfMockProviderDisabled(this.name);

    return mockAttractions
      .filter((attraction) => cityMatches(attraction.city, city))
      .sort((left, right) => {
        const leftInterest = request.interests.includes(left.category) ? 1 : 0;
        const rightInterest = request.interests.includes(right.category) ? 1 : 0;
        return rightInterest - leftInterest || right.rating - left.rating || left.entryFee - right.entryFee;
      });
  }
}
