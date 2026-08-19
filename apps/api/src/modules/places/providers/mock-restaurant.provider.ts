import { cityMatches, mockRestaurants, type Restaurant, type TripPlanningRequest } from "@nexttour/shared";
import { throwIfMockProviderDisabled } from "../../../lib/mock-failure";
import type { RestaurantProvider } from "./places-provider.interface";

export class MockRestaurantProvider implements RestaurantProvider {
  readonly name = "MOCK_RESTAURANTS";

  async search(city: string, request: TripPlanningRequest): Promise<Restaurant[]> {
    throwIfMockProviderDisabled(this.name);

    return mockRestaurants
      .filter((restaurant) => cityMatches(restaurant.city, city))
      .filter((restaurant) => {
        if (request.foodPreference === "VEGETARIAN") {
          return restaurant.vegetarianAvailable;
        }
        if (request.foodPreference === "VEGAN") {
          return restaurant.veganAvailable;
        }
        return true;
      })
      .sort((left, right) => {
        const leftTag = left.tags.includes(request.foodPreference) ? 1 : 0;
        const rightTag = right.tags.includes(request.foodPreference) ? 1 : 0;
        return rightTag - leftTag || left.mealCostPerPerson - right.mealCostPerPerson || right.rating - left.rating;
      });
  }
}
