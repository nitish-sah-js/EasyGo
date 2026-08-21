import type { Attraction, Hotel, Restaurant, TripPlanningRequest } from "@nexttour/shared";
import { env } from "../../../config/env";
import { cachedProviderResult } from "../../../lib/provider-cache";
import type { AttractionProvider, HotelProvider, RestaurantProvider } from "./places-provider.interface";

function baseTripParts(city: string, request: TripPlanningRequest) {
  return {
    city: city.trim().toLowerCase(),
    origin: request.origin.trim().toLowerCase(),
    destination: request.destination.trim().toLowerCase(),
    departureDate: request.departureDate,
    returnDate: request.returnDate,
    travelers: request.travelers,
  };
}

export class CachedHotelProvider implements HotelProvider {
  readonly name: string;

  constructor(private readonly provider: HotelProvider) {
    this.name = provider.name;
  }

  search(city: string, request: TripPlanningRequest): Promise<Hotel[]> {
    const normalizedCity = city.trim().toLowerCase();
    return cachedProviderResult(
      this.name,
      {
        keyParts: ["hotel", normalizedCity, request.departureDate, request.returnDate],
        request: {
          ...baseTripParts(city, request),
          accommodationPreference: request.accommodationPreference,
        },
      },
      env.HOTEL_CACHE_TTL_SECONDS,
      () => this.provider.search(city, request),
      {
        label: `hotels ${city} ${request.departureDate} -> ${request.returnDate}`,
        liveAction: "hotel provider hit",
      },
    );
  }
}

export class CachedAttractionProvider implements AttractionProvider {
  readonly name: string;

  constructor(private readonly provider: AttractionProvider) {
    this.name = provider.name;
  }

  search(city: string, request: TripPlanningRequest): Promise<Attraction[]> {
    const normalizedCity = city.trim().toLowerCase();
    return cachedProviderResult(
      this.name,
      {
        keyParts: ["attractions", normalizedCity],
        request: {
          city: normalizedCity,
          interests: [...request.interests].sort(),
        },
      },
      env.PLACES_CACHE_TTL_SECONDS,
      () => this.provider.search(city, request),
      {
        label: `attractions ${city}`,
        liveAction: "attractions API hit",
      },
    );
  }
}

export class CachedRestaurantProvider implements RestaurantProvider {
  readonly name: string;

  constructor(private readonly provider: RestaurantProvider) {
    this.name = provider.name;
  }

  search(city: string, request: TripPlanningRequest): Promise<Restaurant[]> {
    const normalizedCity = city.trim().toLowerCase();
    return cachedProviderResult(
      this.name,
      {
        keyParts: ["restaurants", normalizedCity],
        request: {
          city: normalizedCity,
          foodPreference: request.foodPreference,
        },
      },
      env.PLACES_CACHE_TTL_SECONDS,
      () => this.provider.search(city, request),
      {
        label: `restaurants ${city}`,
        liveAction: "restaurants API hit",
      },
    );
  }
}
