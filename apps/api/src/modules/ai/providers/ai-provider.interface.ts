import type {
  Attraction,
  BudgetBreakdown,
  GeneratedItinerary,
  Hotel,
  Restaurant,
  RouteDistance,
  RouteOption,
  TripPlanningRequest,
  WeatherData,
} from "@nexttour/shared";

export interface ItineraryContext {
  request: TripPlanningRequest;
  route: RouteOption;
  hotel: Hotel;
  attractions: Attraction[];
  restaurants: Restaurant[];
  weather: WeatherData[];
  budget: BudgetBreakdown;
  mapDistances?: Record<string, RouteDistance>;
}

export interface AIProvider {
  readonly name: string;
  generateItinerary(context: ItineraryContext): Promise<GeneratedItinerary>;
}
