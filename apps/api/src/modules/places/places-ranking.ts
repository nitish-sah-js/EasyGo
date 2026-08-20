import type { Attraction, Hotel, Restaurant, TripPlanningRequest } from "@nexttour/shared";

/**
 * Preference-aware ordering for place results.
 *
 * This logic originally lived inside the mock place providers. It is provider-agnostic
 * — it only reads fields every `Place` carries — so the real Google Places providers
 * reuse it and the user's stated preferences keep shaping results.
 */

export function rankHotels(hotels: Hotel[], request: TripPlanningRequest): Hotel[] {
  const preferredLevel = request.accommodationPreference;

  return [...hotels].sort((left, right) => {
    const leftMatch = left.priceLevel === preferredLevel ? 1 : 0;
    const rightMatch = right.priceLevel === preferredLevel ? 1 : 0;
    return rightMatch - leftMatch || left.pricePerNight - right.pricePerNight || right.rating - left.rating;
  });
}

export function rankAttractions(attractions: Attraction[], request: TripPlanningRequest): Attraction[] {
  return [...attractions].sort((left, right) => {
    const leftInterest = request.interests.includes(left.category) ? 1 : 0;
    const rightInterest = request.interests.includes(right.category) ? 1 : 0;
    return rightInterest - leftInterest || right.rating - left.rating || left.entryFee - right.entryFee;
  });
}

export function filterAndRankRestaurants(restaurants: Restaurant[], request: TripPlanningRequest): Restaurant[] {
  const matchesDiet = (restaurant: Restaurant): boolean => {
    if (request.foodPreference === "VEGETARIAN") return restaurant.vegetarianAvailable;
    if (request.foodPreference === "VEGAN") return restaurant.veganAvailable;
    return true;
  };

  // A strict diet filter can empty the list entirely; when that happens keep the
  // unfiltered set rather than reporting "no restaurants" for the whole city.
  const filtered = restaurants.filter(matchesDiet);
  const pool = filtered.length > 0 ? filtered : restaurants;

  return [...pool].sort((left, right) => {
    const leftTag = left.tags.includes(request.foodPreference) ? 1 : 0;
    const rightTag = right.tags.includes(request.foodPreference) ? 1 : 0;
    return rightTag - leftTag || left.mealCostPerPerson - right.mealCostPerPerson || right.rating - left.rating;
  });
}
