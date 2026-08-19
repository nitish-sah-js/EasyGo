import {
  addDays,
  type AccommodationPreference,
  type FoodPreference,
  type InterestCategory,
  type TravelStyle,
  type TripPlanningRequest,
} from "@nexttour/shared";
import {
  getAttractionProvider,
  getHotelProvider,
  getRestaurantProvider,
} from "./providers/places-provider.registry";

export interface PlaceSearchOptions {
  travelers?: number;
  budget?: number;
  travelStyle?: TravelStyle;
  accommodationPreference?: AccommodationPreference;
  foodPreference?: FoodPreference;
  interests?: InterestCategory[];
}

export function placesRequestFor(city: string, options: PlaceSearchOptions = {}): TripPlanningRequest {
  const today = new Date().toISOString().slice(0, 10);

  return {
    origin: "Patna",
    destination: city,
    departureDate: today,
    returnDate: addDays(today, 5),
    travelers: options.travelers ?? 2,
    budget: options.budget ?? 100_000,
    travelStyle: options.travelStyle ?? "BALANCED",
    preferredTransport: ["FLIGHT", "TRAIN", "BUS"],
    interests:
      options.interests ??
      (["BEACH", "NATURE", "HISTORY", "CULTURE", "MUSEUM", "ADVENTURE", "RELIGIOUS", "SHOPPING"] satisfies InterestCategory[]),
    foodPreference: options.foodPreference ?? "VEGETARIAN",
    accommodationPreference: options.accommodationPreference ?? "MID_RANGE",
  };
}

export async function searchHotels(city: string, options: PlaceSearchOptions = {}) {
  const request = placesRequestFor(city, options);
  return getHotelProvider().search(city, request);
}

export async function searchAttractions(city: string, options: PlaceSearchOptions = {}) {
  const request = placesRequestFor(city, options);
  return getAttractionProvider().search(city, request);
}

export async function searchRestaurants(city: string, options: PlaceSearchOptions = {}) {
  const request = placesRequestFor(city, options);
  return getRestaurantProvider().search(city, request);
}