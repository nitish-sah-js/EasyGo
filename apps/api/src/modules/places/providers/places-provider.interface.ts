import type { Attraction, Hotel, Restaurant, TripPlanningRequest } from "@nexttour/shared";

export interface HotelProvider {
  readonly name: string;
  search(city: string, request: TripPlanningRequest): Promise<Hotel[]>;
}

export interface AttractionProvider {
  readonly name: string;
  search(city: string, request: TripPlanningRequest): Promise<Attraction[]>;
}

export interface RestaurantProvider {
  readonly name: string;
  search(city: string, request: TripPlanningRequest): Promise<Restaurant[]>;
}
