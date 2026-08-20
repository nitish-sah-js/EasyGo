import {
  dateDifferenceInDays,
  type Attraction,
  type BudgetBreakdown,
  type Hotel,
  type Restaurant,
  type RouteOption,
  type TripPlanningRequest,
} from "@nexttour/shared";
import { searchAttractions, searchHotels, searchRestaurants } from "../places/places.service";
import { travelRouteService } from "../travel-route/travel-route.service";

export class BudgetService {
  /**
   * `selectedRoute` and `selectedHotel` are optional: when a provider returns nothing
   * the corresponding line contributes 0 rather than being filled with a placeholder,
   * so the total is a genuine partial estimate instead of a fabricated one.
   */
  calculate(
    request: TripPlanningRequest,
    selectedRoute: RouteOption | undefined,
    selectedHotel: Hotel | undefined,
    attractions: Attraction[],
    restaurants: Restaurant[],
  ): BudgetBreakdown {
    const dayCount = dateDifferenceInDays(request.departureDate, request.returnDate);
    const roomCount = Math.max(1, Math.ceil(request.travelers / 2));
    const selectedRestaurants = restaurants.slice(0, Math.max(1, Math.min(dayCount, restaurants.length)));
    // Guard the division: with no restaurants this would otherwise be NaN and poison
    // every downstream total.
    const averageMealCost =
      selectedRestaurants.length > 0
        ? selectedRestaurants.reduce((total, restaurant) => total + restaurant.mealCostPerPerson, 0) /
          selectedRestaurants.length
        : 0;

    const transport = (selectedRoute?.totalPrice ?? 0) * request.travelers;
    const accommodation = (selectedHotel?.pricePerNight ?? 0) * dayCount * roomCount;
    const food = Math.round(averageMealCost * request.travelers * dayCount);
    const activities = attractions
      .slice(0, Math.min(dayCount * 2, attractions.length))
      .reduce((total, attraction) => total + attraction.entryFee * request.travelers, 0);
    const localTransport = Math.round(450 * dayCount * Math.max(1, request.travelers / 2));
    const miscellaneous = Math.round(request.budget * 0.05);
    const totalEstimatedCost =
      transport + accommodation + food + activities + localTransport + miscellaneous;
    const remainingBudget = request.budget - totalEstimatedCost;
    const budgetPercentageUsed =
      request.budget > 0 ? Math.round((totalEstimatedCost / request.budget) * 1000) / 10 : 0;

    return {
      transport,
      accommodation,
      food,
      activities,
      localTransport,
      miscellaneous,
      totalEstimatedCost,
      userBudget: request.budget,
      remainingBudget,
      budgetPercentageUsed,
      isWithinBudget: totalEstimatedCost <= request.budget,
    };
  }

  async estimate(request: TripPlanningRequest): Promise<BudgetBreakdown> {
    const [hotels, attractions, restaurants, routeSearch] = await Promise.all([
      searchHotels(request.destination, {
        travelers: request.travelers,
        budget: request.budget,
        travelStyle: request.travelStyle,
        accommodationPreference: request.accommodationPreference,
        foodPreference: request.foodPreference,
        interests: request.interests,
      }),
      searchAttractions(request.destination, {
        travelers: request.travelers,
        budget: request.budget,
        travelStyle: request.travelStyle,
        interests: request.interests,
      }),
      searchRestaurants(request.destination, {
        travelers: request.travelers,
        budget: request.budget,
        travelStyle: request.travelStyle,
        foodPreference: request.foodPreference,
      }),
      travelRouteService.search({
        origin: request.origin,
        destination: request.destination,
        departureDate: request.departureDate,
        travelers: request.travelers,
        preferredTransport: request.preferredTransport,
        includeNetwork: true,
      }),
    ]);

    return this.calculate(request, routeSearch.routes[0], hotels[0], attractions, restaurants);
  }
}
