import { haversineDistanceKm, type Attraction, type FoodPreference, type Hotel, type InterestCategory, type PlacePhoto, type Restaurant } from "@nexttour/shared";
import type { GooglePlace } from "./google-places-client";

type AppPriceLevel = "BUDGET" | "MID_RANGE" | "PREMIUM";

function mapPriceLevel(priceLevel: string | undefined): AppPriceLevel {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
    case "PRICE_LEVEL_INEXPENSIVE":
      return "BUDGET";
    case "PRICE_LEVEL_EXPENSIVE":
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "PREMIUM";
    default:
      return "MID_RANGE";
  }
}

// Google Places (New) does not return live pricing. These are ballpark INR estimates
// per price tier, clearly an approximation until a real pricing/booking API is added.
const HOTEL_NIGHTLY_ESTIMATE: Record<AppPriceLevel, number> = {
  BUDGET: 1_800,
  MID_RANGE: 3_800,
  PREMIUM: 8_500,
};

const MEAL_COST_ESTIMATE: Record<AppPriceLevel, number> = {
  BUDGET: 250,
  MID_RANGE: 500,
  PREMIUM: 1_200,
};

const INTEREST_RULES: Array<{ category: InterestCategory; keywords: string[] }> = [
  { category: "MUSEUM", keywords: ["museum", "art_gallery"] },
  { category: "BEACH", keywords: ["beach"] },
  { category: "RELIGIOUS", keywords: ["temple", "church", "mosque", "synagogue", "place_of_worship"] },
  { category: "HISTORY", keywords: ["historical", "monument", "landmark"] },
  { category: "ADVENTURE", keywords: ["amusement_park", "zoo", "water_park", "hiking_area", "adventure"] },
  { category: "SHOPPING", keywords: ["shopping_mall", "market", "store"] },
  { category: "NATURE", keywords: ["park", "natural_feature", "national_park", "garden"] },
];

function mapInterestCategory(place: GooglePlace): InterestCategory {
  const haystack = [place.primaryType, ...(place.types ?? [])].filter(Boolean).join(" ").toLowerCase();
  for (const rule of INTEREST_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) return rule.category;
  }
  return "CULTURE";
}

const ATTRACTION_DURATION_MINUTES: Record<InterestCategory, number> = {
  MUSEUM: 90,
  HISTORY: 90,
  NATURE: 120,
  BEACH: 150,
  ADVENTURE: 180,
  RELIGIOUS: 45,
  SHOPPING: 90,
  CULTURE: 90,
};

const ATTRACTION_ENTRY_FEE: Record<InterestCategory, number> = {
  MUSEUM: 150,
  HISTORY: 100,
  NATURE: 0,
  BEACH: 0,
  ADVENTURE: 400,
  RELIGIOUS: 0,
  SHOPPING: 0,
  CULTURE: 50,
};

/**
 * Google returns up to ten photo references per place. Only the first few are
 * ever rendered (a card image and, at most, a small gallery), and every extra
 * one is a photo-media call the UI would never make — so the tail is dropped
 * here rather than carried through the trip payload and into the database.
 */
const MAX_PHOTOS_PER_PLACE = 3;

function placePhotos(place: GooglePlace): PlacePhoto[] {
  return (place.photos ?? [])
    .slice(0, MAX_PHOTOS_PER_PLACE)
    .flatMap<PlacePhoto>((photo) => {
      if (!photo.name) return [];
      const author = photo.authorAttributions?.[0];
      return [
        {
          name: photo.name,
          ...(author?.displayName ? { attribution: author.displayName } : {}),
          ...(author?.uri ? { attributionUri: author.uri } : {}),
          ...(photo.widthPx !== undefined ? { widthPx: photo.widthPx } : {}),
          ...(photo.heightPx !== undefined ? { heightPx: photo.heightPx } : {}),
        },
      ];
    });
}

function placeCoordinates(place: GooglePlace): { latitude: number; longitude: number } {
  return {
    latitude: place.location?.latitude ?? 0,
    longitude: place.location?.longitude ?? 0,
  };
}

function detectCuisine(place: GooglePlace): string {
  const restaurantType = (place.types ?? []).find((type) => type.endsWith("_restaurant") && type !== "restaurant");
  if (restaurantType) {
    return restaurantType
      .replace(/_restaurant$/, "")
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  if ((place.types ?? []).includes("cafe")) return "Cafe";
  return "Multi-cuisine";
}

export function isPlaceUsable(place: GooglePlace): boolean {
  return Boolean(place.id && place.displayName?.text && place.location?.latitude !== undefined && place.location?.longitude !== undefined);
}

export function toAttraction(place: GooglePlace, city: string, index: number): Attraction {
  const category = mapInterestCategory(place);
  const priceLevel = mapPriceLevel(place.priceLevel);
  const { latitude, longitude } = placeCoordinates(place);

  return {
    id: `google-places-attraction-${place.id ?? index}`,
    type: "ATTRACTION",
    name: place.displayName?.text ?? "Unnamed attraction",
    city,
    location: place.formattedAddress ?? city,
    latitude,
    longitude,
    rating: place.rating ?? 4.0,
    priceLevel,
    estimatedCost: ATTRACTION_ENTRY_FEE[category],
    source: "REAL",
    photos: placePhotos(place),
    category,
    entryFee: ATTRACTION_ENTRY_FEE[category],
    openingHours: place.regularOpeningHours?.weekdayDescriptions?.[0] ?? "Hours vary, check locally",
    recommendedDurationMinutes: ATTRACTION_DURATION_MINUTES[category],
    bestTimeToVisit: category === "BEACH" || category === "ADVENTURE" ? "Morning" : "Anytime",
  };
}

export function toRestaurant(place: GooglePlace, city: string, index: number): Restaurant {
  const priceLevel = mapPriceLevel(place.priceLevel);
  const { latitude, longitude } = placeCoordinates(place);
  const types = place.types ?? [];
  const isVegType = types.some((type) => type.includes("vegetarian"));
  const isVeganType = types.some((type) => type.includes("vegan"));
  const vegetarianAvailable = isVegType || !isVeganType;
  const veganAvailable = isVeganType;
  const tags: FoodPreference[] = ["LOCAL"];
  if (vegetarianAvailable) tags.push("VEGETARIAN");
  if (veganAvailable) tags.push("VEGAN");
  if (!isVegType) tags.push("NON_VEGETARIAN");

  return {
    id: `google-places-restaurant-${place.id ?? index}`,
    type: "RESTAURANT",
    name: place.displayName?.text ?? "Unnamed restaurant",
    city,
    location: place.formattedAddress ?? city,
    latitude,
    longitude,
    rating: place.rating ?? 4.0,
    priceLevel,
    estimatedCost: MEAL_COST_ESTIMATE[priceLevel],
    source: "REAL",
    photos: placePhotos(place),
    cuisine: detectCuisine(place),
    vegetarianAvailable,
    veganAvailable,
    openingHours: place.regularOpeningHours?.weekdayDescriptions?.[0] ?? "Hours vary, check locally",
    mealCostPerPerson: MEAL_COST_ESTIMATE[priceLevel],
    tags,
  };
}

export function toHotel(place: GooglePlace, city: string, cityCenter: { latitude: number; longitude: number }, index: number): Hotel {
  const priceLevel = mapPriceLevel(place.priceLevel);
  const { latitude, longitude } = placeCoordinates(place);

  return {
    id: `google-places-hotel-${place.id ?? index}`,
    type: "HOTEL",
    name: place.displayName?.text ?? "Unnamed hotel",
    city,
    location: place.formattedAddress ?? city,
    latitude,
    longitude,
    rating: place.rating ?? 4.0,
    priceLevel,
    estimatedCost: HOTEL_NIGHTLY_ESTIMATE[priceLevel],
    source: "REAL",
    photos: placePhotos(place),
    reviewCount: place.userRatingCount ?? 0,
    pricePerNight: HOTEL_NIGHTLY_ESTIMATE[priceLevel],
    amenities: ["WiFi"],
    roomType: "Standard",
    distanceFromCenterKm: haversineDistanceKm(cityCenter, { latitude, longitude }),
    cancellationPolicy: "Contact property for cancellation policy",
    priceSource: "ESTIMATE",
  };
}
