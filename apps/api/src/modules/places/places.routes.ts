import { Router } from "express";
import { z } from "zod";
import { ACCOMMODATION_PREFERENCES, FOOD_PREFERENCES, INTEREST_CATEGORIES, TRAVEL_STYLES } from "@nexttour/shared";
import { requireAuth } from "../../middleware/auth";
import { ApiError, asyncHandler } from "../../middleware/errors";
import { searchAttractions, searchHotels, searchRestaurants, type PlaceSearchOptions } from "./places.service";

const placesQuerySchema = z.object({
  city: z.string().trim().min(2).max(80),
  travelers: z.coerce.number().int().min(1).max(12).optional(),
  budget: z.coerce.number().int().min(5_000).optional(),
  travelStyle: z.enum(TRAVEL_STYLES).optional(),
  accommodationPreference: z.enum(ACCOMMODATION_PREFERENCES).optional(),
  foodPreference: z.enum(FOOD_PREFERENCES).optional(),
  interests: z
    .string()
    .optional()
    .transform((value) =>
      value?.split(",").map((item) => item.trim().toUpperCase() as (typeof INTEREST_CATEGORIES)[number]),
    ),
});

type ParsedPlacesQuery = z.output<typeof placesQuerySchema>;

function toSearchOptions(parsed: ParsedPlacesQuery): PlaceSearchOptions {
  const options: PlaceSearchOptions = {};
  if (parsed.travelers !== undefined) options.travelers = parsed.travelers;
  if (parsed.budget !== undefined) options.budget = parsed.budget;
  if (parsed.travelStyle !== undefined) options.travelStyle = parsed.travelStyle;
  if (parsed.accommodationPreference !== undefined) options.accommodationPreference = parsed.accommodationPreference;
  if (parsed.foodPreference !== undefined) options.foodPreference = parsed.foodPreference;
  if (parsed.interests !== undefined) options.interests = parsed.interests;
  return options;
}

export const placesRoutes = Router();

placesRoutes.use(requireAuth);

placesRoutes.get(
  "/hotels",
  asyncHandler(async (request, response) => {
    const parsed = placesQuerySchema.parse(request.query);
    if (!parsed.city) {
      throw new ApiError(422, "Query parameter `city` is required");
    }
    response.json({ hotels: await searchHotels(parsed.city, toSearchOptions(parsed)) });
  }),
);

placesRoutes.get(
  "/attractions",
  asyncHandler(async (request, response) => {
    const parsed = placesQuerySchema.parse(request.query);
    if (!parsed.city) {
      throw new ApiError(422, "Query parameter `city` is required");
    }
    response.json({ attractions: await searchAttractions(parsed.city, toSearchOptions(parsed)) });
  }),
);

placesRoutes.get(
  "/restaurants",
  asyncHandler(async (request, response) => {
    const parsed = placesQuerySchema.parse(request.query);
    if (!parsed.city) {
      throw new ApiError(422, "Query parameter `city` is required");
    }
    response.json({ restaurants: await searchRestaurants(parsed.city, toSearchOptions(parsed)) });
  }),
);