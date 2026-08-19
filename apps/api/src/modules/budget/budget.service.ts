import {
  dateDifferenceInDays,
  type Attraction,
  type BudgetBreakdown,
  type Hotel,
  type Restaurant,
  type RouteOption,
  type TripPlanningRequest,
} from "@nexttour/shared";
import {
  createFallbackAttraction,
  createFallbackHotel,
  createFallbackRestaurant,
  createFallbackRoute,
} from "../planning/fallbacks";
import { searchAttractions, searchHotels, searchRestaurants } from "../places/places.service";
import { travelRouteService } from "../travel-route/travel-route.service";

export class BudgetService {
  calculate(
    request: TripPlanningRequest,
    selectedRoute: RouteOption,
    selectedHotel: Hotel,
    attractions: Attraction[],
    restaurants: Restaurant[],
  ): BudgetBreakdown {
    const dayCount = dateDifferenceInDays(request.departureDate, request.returnDate);
    const roomCount = Math.max(1, Math.ceil(request.travelers / 2));
    const selectedRestaurants = restaurants.slice(0, Math.max(1, Math.min(dayCount, restaurants.length)));
    const averageMealCost =
      selectedRestaurants.reduce((total, restaurant) => total + restaurant.mealCostPerPerson, 0) /
      selectedRestaurants.length;

    const transport = selectedRoute.totalPrice * request.travelers;
    const accommodation = selectedHotel.pricePerNight * dayCount * roomCount;
    const food = Math.round(averageMealCost * request.travelers * dayCount);
    const activities = attractions
      .slice(0, Math.min(dayCount * 2, attractions.length))
      .reduce((total, attraction) => total + attraction.entryFee * request.travelers, 0);
    const localTransport = Math.round(450 * dayCount * Math.max(1, request.travelers / 2));
    const miscellaneous = Math.round(request.budget * 0.05);
    const totalEstimatedCost =
      transport + accommodation + food + activities + localTransport + miscellaneous;
    const remainingBudget = request.budget - totalEstimatedCost;
    const budgetPercentageUsed = Math.round((totalEstimatedCost / request.budget) * 1000) / 10;

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

    const route = routeSearch.routes[0] ?? createFallbackRoute(request);
    const hotel = hotels[0] ?? createFallbackHotel(request.destination);
    const attractionList =
      attractions.length > 0 ? attractions : [createFallbackAttraction(request.destination)];
    const restaurantList =
      restaurants.length > 0 ? restaurants : [createFallbackRestaurant(request.destination)];

    return this.calculate(request, route, hotel, attractionList, restaurantList);
  }
}
