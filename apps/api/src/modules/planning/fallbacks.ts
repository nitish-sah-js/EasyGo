import {
  CITY_COORDINATES,
  addDays,
  createLocation,
  normalizeCity,
  type Attraction,
  type Hotel,
  type Restaurant,
  type RouteOption,
  type TransportOption,
  type TripPlanningRequest,
} from "@nexttour/shared";

export function createFallbackHotel(destination: string): Hotel {
  const city = normalizeCity(destination);
  const coords = CITY_COORDINATES[city as keyof typeof CITY_COORDINATES] ?? CITY_COORDINATES.Goa;
  return {
    id: `fallback-hotel-${city.toLowerCase()}`,
    type: "HOTEL",
    name: `${city} Central Stay`,
    city,
    location: `Central ${city}`,
    latitude: coords.latitude,
    longitude: coords.longitude,
    rating: 4.0,
    reviewCount: 120,
    pricePerNight: 2_000,
    priceLevel: "BUDGET",
    estimatedCost: 2_000,
    amenities: ["WiFi", "Breakfast"],
    roomType: "Standard double",
    distanceFromCenterKm: 1.4,
    cancellationPolicy: "Free cancellation up to 24 hours",
    source: "MOCK",
  };
}

export function createFallbackAttraction(destination: string): Attraction {
  const city = normalizeCity(destination);
  const coords = CITY_COORDINATES[city as keyof typeof CITY_COORDINATES] ?? CITY_COORDINATES.Goa;
  return {
    id: `fallback-attraction-${city.toLowerCase()}`,
    type: "ATTRACTION",
    name: `${city} City Walk`,
    city,
    location: `Central ${city}`,
    latitude: coords.latitude,
    longitude: coords.longitude,
    rating: 4.0,
    priceLevel: "BUDGET",
    estimatedCost: 0,
    category: "CULTURE",
    entryFee: 0,
    openingHours: "09:00-18:00",
    recommendedDurationMinutes: 120,
    bestTimeToVisit: "Morning",
    source: "MOCK",
  };
}

export function createFallbackRestaurant(destination: string): Restaurant {
  const city = normalizeCity(destination);
  const coords = CITY_COORDINATES[city as keyof typeof CITY_COORDINATES] ?? CITY_COORDINATES.Goa;
  return {
    id: `fallback-restaurant-${city.toLowerCase()}`,
    type: "RESTAURANT",
    name: `${city} Local Kitchen`,
    city,
    location: `Central ${city}`,
    latitude: coords.latitude,
    longitude: coords.longitude,
    rating: 4.0,
    priceLevel: "BUDGET",
    estimatedCost: 350,
    cuisine: "Local Indian",
    vegetarianAvailable: true,
    veganAvailable: true,
    openingHours: "08:00-23:00",
    mealCostPerPerson: 350,
    tags: ["VEGETARIAN", "LOCAL"],
    source: "MOCK",
  };
}

export function createFallbackRoute(request: TripPlanningRequest): RouteOption {
  const origin = createLocation("Patna", "PAT", request.origin);
  const destination = createLocation("Goa", "GOI", request.destination);
  const departureTime = `${request.departureDate}T03:00:00.000Z`;
  const arrivalTime = `${addDays(request.departureDate, 1)}T09:00:00.000Z`;
  const segment: TransportOption = {
    id: "fallback-route-train",
    provider: "MOCK_FALLBACK",
    mode: "TRAIN",
    origin,
    destination,
    departureTime,
    arrivalTime,
    durationMinutes: 1_800,
    price: 2_500,
    currency: "INR",
    stops: 16,
    operator: "Indian Railways Mock",
    serviceNumber: "NT-000",
    vehicleType: "Fallback Express",
    segments: [
      {
        origin,
        destination,
        departureTime,
        arrivalTime,
        mode: "TRAIN",
        operator: "Indian Railways Mock",
        serviceNumber: "NT-000",
      },
    ],
    source: "MOCK",
    fetchedAt: departureTime,
  };

  return {
    id: "route-fallback",
    segments: [segment],
    totalPrice: segment.price,
    totalDurationMinutes: segment.durationMinutes,
    transferCount: 0,
    modes: ["TRAIN"],
    score: 1,
    label: "BALANCED",
    recommendationReason: "Fallback mock route used because transport providers returned no usable options.",
  };
}