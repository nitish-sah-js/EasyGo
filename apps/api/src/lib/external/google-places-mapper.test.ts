import { describe, expect, it } from "vitest";
import { isPlaceUsable, toAttraction, toHotel, toRestaurant } from "./google-places-mapper";
import type { GooglePlace } from "./google-places-client";

const museum: GooglePlace = {
  id: "place-museum-1",
  displayName: { text: "State Museum" },
  formattedAddress: "MG Road, Goa",
  location: { latitude: 15.49, longitude: 73.83 },
  rating: 4.4,
  userRatingCount: 1200,
  priceLevel: "PRICE_LEVEL_INEXPENSIVE",
  types: ["museum", "tourist_attraction"],
  primaryType: "museum",
};

const restaurant: GooglePlace = {
  id: "place-restaurant-1",
  displayName: { text: "Spice Route" },
  formattedAddress: "Baga, Goa",
  location: { latitude: 15.55, longitude: 73.75 },
  rating: 4.6,
  userRatingCount: 800,
  priceLevel: "PRICE_LEVEL_MODERATE",
  types: ["indian_restaurant", "restaurant", "food"],
  primaryType: "indian_restaurant",
};

const hotel: GooglePlace = {
  id: "place-hotel-1",
  displayName: { text: "Seaside Resort" },
  formattedAddress: "Candolim, Goa",
  location: { latitude: 15.52, longitude: 73.76 },
  rating: 4.2,
  userRatingCount: 500,
  priceLevel: "PRICE_LEVEL_EXPENSIVE",
  types: ["hotel", "lodging"],
  primaryType: "hotel",
};

describe("isPlaceUsable", () => {
  it("requires id, name, and coordinates", () => {
    expect(isPlaceUsable(museum)).toBe(true);
    expect(isPlaceUsable({ id: "place-1", displayName: { text: "No coordinates" } })).toBe(false);
    expect(isPlaceUsable({ id: "place-1", location: { latitude: 15.49, longitude: 73.83 } })).toBe(false);
  });
});

describe("toAttraction", () => {
  it("maps a museum place into an Attraction with MUSEUM category and source REAL", () => {
    const attraction = toAttraction(museum, "Goa", 0);
    expect(attraction.type).toBe("ATTRACTION");
    expect(attraction.source).toBe("REAL");
    expect(attraction.category).toBe("MUSEUM");
    expect(attraction.priceLevel).toBe("BUDGET");
    expect(attraction.latitude).toBe(15.49);
    expect(attraction.rating).toBe(4.4);
  });

  it("falls back to a default rating when Google omits it", () => {
    const museumWithoutRating: GooglePlace = { ...museum };
    delete museumWithoutRating.rating;
    const attraction = toAttraction(museumWithoutRating, "Goa", 0);
    expect(attraction.rating).toBe(4.0);
  });
});

describe("toRestaurant", () => {
  it("derives cuisine from the *_restaurant type and estimates meal cost from price level", () => {
    const result = toRestaurant(restaurant, "Goa", 0);
    expect(result.cuisine).toBe("Indian");
    expect(result.priceLevel).toBe("MID_RANGE");
    expect(result.mealCostPerPerson).toBe(500);
    expect(result.source).toBe("REAL");
  });

  it("defaults to Multi-cuisine when no *_restaurant type is present", () => {
    const generic = toRestaurant({ ...restaurant, types: ["restaurant", "food"] }, "Goa", 0);
    expect(generic.cuisine).toBe("Multi-cuisine");
  });
});

describe("toHotel", () => {
  it("estimates pricePerNight from priceLevel and computes distance from city center", () => {
    const center = { latitude: 15.2993, longitude: 74.124 };
    const result = toHotel(hotel, "Goa", center, 0);
    expect(result.type).toBe("HOTEL");
    expect(result.source).toBe("REAL");
    expect(result.priceLevel).toBe("PREMIUM");
    expect(result.pricePerNight).toBe(8_500);
    expect(result.distanceFromCenterKm).toBeGreaterThan(0);
  });
});
