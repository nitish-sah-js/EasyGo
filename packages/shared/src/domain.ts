export const TRANSPORT_MODES = ["FLIGHT", "TRAIN", "BUS"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const TRAVEL_STYLES = ["BUDGET", "BALANCED", "COMFORT", "LUXURY"] as const;
export type TravelStyle = (typeof TRAVEL_STYLES)[number];

export const FOOD_PREFERENCES = ["VEGETARIAN", "VEGAN", "NON_VEGETARIAN", "LOCAL"] as const;
export type FoodPreference = (typeof FOOD_PREFERENCES)[number];

export const ACCOMMODATION_PREFERENCES = ["BUDGET", "MID_RANGE", "PREMIUM"] as const;
export type AccommodationPreference = (typeof ACCOMMODATION_PREFERENCES)[number];

export const INTEREST_CATEGORIES = [
  "BEACH",
  "NATURE",
  "HISTORY",
  "CULTURE",
  "MUSEUM",
  "ADVENTURE",
  "RELIGIOUS",
  "SHOPPING",
] as const;
export type InterestCategory = (typeof INTEREST_CATEGORIES)[number];

export const PLACE_TYPES = ["HOTEL", "ATTRACTION", "RESTAURANT"] as const;
export type PlaceType = (typeof PLACE_TYPES)[number];

export const PLANNING_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "PARTIAL_SUCCESS",
  "FAILED",
] as const;
export type PlanningStatus = (typeof PLANNING_STATUSES)[number];

export const WEATHER_CONDITIONS = [
  "SUNNY",
  "PARTLY_CLOUDY",
  "CLOUDY",
  "LIGHT_RAIN",
  "HEAVY_RAIN",
] as const;
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationPoint extends Partial<Coordinates> {
  code?: string;
  name: string;
  city?: string;
}

export interface TransportSegment {
  origin: LocationPoint;
  destination: LocationPoint;
  departureTime: string;
  arrivalTime: string;
  mode: TransportMode;
  operator?: string;
  serviceNumber?: string;
}

export const TRAIN_CLASS_CODES = ["1A", "2A", "3A", "3E", "CC", "EC", "SL", "2S", "FC"] as const;
export type TrainClassCode = (typeof TRAIN_CLASS_CODES)[number];

export const TRAIN_AVAILABILITY_STATUSES = ["AVAILABLE", "RAC", "WAITLIST", "NOT_AVAILABLE", "UNKNOWN"] as const;
export type TrainAvailabilityStatus = (typeof TRAIN_AVAILABILITY_STATUSES)[number];

/** A single coach-class fare/availability offered on a real (RedBus-sourced) train. */
export interface TrainClassOption {
  code: TrainClassCode;
  label: string;
  ac: boolean;
  fare: number;
  /** "UNKNOWN" when redBus's page didn't render a parseable status — never treat as unavailable. */
  availability: TrainAvailabilityStatus;
  availableCount?: number;
}

/** Human label, blurb and AC/Non-AC flag for each Indian Railways coach-class code. */
export const TRAIN_CLASS_INFO: Record<TrainClassCode, { label: string; description: string; ac: boolean }> = {
  "1A": { label: "1st AC", description: "Premium, private and most comfortable", ac: true },
  "2A": { label: "2nd AC", description: "Comfortable AC coach, AC 2-Tier", ac: true },
  "3A": { label: "3rd AC", description: "Affordable AC coach, AC 3-Tier", ac: true },
  "3E": { label: "3rd AC Economy", description: "Budget AC coach", ac: true },
  CC: { label: "AC Chair Car", description: "AC seating for day journeys", ac: true },
  EC: { label: "Executive Chair Car", description: "Premium AC seating", ac: true },
  SL: { label: "Sleeper", description: "Non-AC sleeper coach", ac: false },
  "2S": { label: "General / Second Sitting", description: "Basic non-reserved travel", ac: false },
  FC: { label: "First Class", description: "Non-AC private compartment", ac: false },
};

export interface TransportOption {
  id: string;
  provider: string;
  mode: TransportMode;
  origin: LocationPoint;
  destination: LocationPoint;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  price: number;
  currency: "INR";
  stops: number;
  operator?: string;
  serviceNumber?: string;
  vehicleType?: string;
  segments: TransportSegment[];
  source: "REAL";
  fetchedAt: string;
  amenities?: string[];
  metadata?: Record<string, string | number | boolean | string[]>;
  /** Populated for TRAIN options with at least one parsed coach-class fare. */
  trainClasses?: TrainClassOption[];
}

export interface TransportSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  travelers: number;
  preferredTransport: TransportMode[];
  includeNetwork?: boolean;
}

export interface RouteOption {
  id: string;
  segments: TransportOption[];
  totalPrice: number;
  totalDurationMinutes: number;
  transferCount: number;
  modes: TransportMode[];
  score: number;
  recommendationReason?: string;
  label: "CHEAPEST" | "FASTEST" | "BALANCED" | "COMFORTABLE" | "ALTERNATIVE";
}

/**
 * A photo of a real place, sourced from Wikimedia Commons.
 *
 * `name` is a Commons file title, not a URL — the browser asks the API to
 * resolve it to a real image URL instead (`GET /api/places/photo?name=...`).
 * Most Commons licenses (e.g. CC BY-SA) require attribution, so the
 * photographer credit and license travel with the reference.
 */
export interface PlacePhoto {
  /** Commons file title, e.g. `File:Taj Mahal at sunset.jpg`. */
  name: string;
  attribution?: string;
  attributionUri?: string;
  license?: string;
  widthPx?: number;
  heightPx?: number;
}

export interface Place {
  id: string;
  type: PlaceType;
  name: string;
  city: string;
  location: string;
  latitude: number;
  longitude: number;
  rating: number;
  priceLevel?: "BUDGET" | "MID_RANGE" | "PREMIUM";
  estimatedCost?: number;
  source: "REAL";
  /** Empty when Wikimedia Commons has no matching photo for the place. */
  photos?: PlacePhoto[];
}

export interface Hotel extends Place {
  type: "HOTEL";
  reviewCount: number;
  pricePerNight: number;
  amenities: string[];
  roomType: string;
  distanceFromCenterKm: number;
  cancellationPolicy: string;
  /**
   * LIVE   — `pricePerNight` is a real quoted nightly rate for the trip dates.
   * ESTIMATE — derived from a coarse price tier; no provider quoted this room.
   */
  priceSource: "LIVE" | "ESTIMATE";
}

export interface Attraction extends Place {
  type: "ATTRACTION";
  category: InterestCategory;
  entryFee: number;
  openingHours: string;
  recommendedDurationMinutes: number;
  bestTimeToVisit: string;
}

export interface Restaurant extends Place {
  type: "RESTAURANT";
  cuisine: string;
  vegetarianAvailable: boolean;
  veganAvailable: boolean;
  openingHours: string;
  mealCostPerPerson: number;
  tags: FoodPreference[];
}

export interface WeatherData {
  id: string;
  city: string;
  date: string;
  temperature: number;
  condition: WeatherCondition;
  rainProbability: number;
  humidity: number;
  windSpeed: number;
  source: "REAL";
}

export interface RouteDistance {
  origin: Coordinates;
  destination: Coordinates;
  distanceKm: number;
  travelTimeMinutes: number;
  mode: "WALK" | "CAR" | "BUS" | "TRAIN";
}

export interface BudgetBreakdown {
  transport: number;
  accommodation: number;
  food: number;
  activities: number;
  localTransport: number;
  miscellaneous: number;
  totalEstimatedCost: number;
  userBudget: number;
  remainingBudget: number;
  budgetPercentageUsed: number;
  isWithinBudget: boolean;
}

export interface ItineraryActivity {
  id: string;
  time: string;
  title: string;
  category: "TRANSPORT" | "HOTEL" | "ATTRACTION" | "RESTAURANT" | "FREE_TIME";
  locationName?: string;
  durationMinutes: number;
  estimatedCost: number;
  travelTimeMinutes?: number;
  notes?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  summary: string;
  weather?: WeatherData;
  activities: ItineraryActivity[];
}

export interface GeneratedItinerary {
  recommendation: string;
  reason: string;
  itinerary: ItineraryDay[];
}

export interface TripPlanningRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  budget: number;
  travelStyle: TravelStyle;
  preferredTransport: TransportMode[];
  interests: InterestCategory[];
  foodPreference: FoodPreference;
  accommodationPreference: AccommodationPreference;
}

export interface PlanningProgressStep {
  key:
    | "preferences"
    | "transport"
    | "hotels"
    | "attractions"
    | "restaurants"
    | "weather"
    | "routes"
    | "budget"
    | "itinerary"
    | "store";
  label: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
}

export interface ProviderResult<T> {
  provider: string;
  status: "SUCCESS" | "FAILED";
  data: T[];
  error?: string;
}

export interface TripResultPayload {
  trip: {
    id: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    travelers: number;
    budget: number;
    status: PlanningStatus;
    preferences: TripPlanningRequest;
  };
  recommendedRoute?: RouteOption;
  alternativeRoutes: RouteOption[];
  hotel?: Hotel;
  attractions: Attraction[];
  restaurants: Restaurant[];
  weather: WeatherData[];
  budget?: BudgetBreakdown;
  itinerary?: GeneratedItinerary;
  providerMessages: string[];
}
