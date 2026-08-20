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
  /** Absent when no transport provider returned a usable route for this trip. */
  route?: RouteOption;
  /** Absent when no hotel provider returned a property for this destination. */
  hotel?: Hotel;
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
