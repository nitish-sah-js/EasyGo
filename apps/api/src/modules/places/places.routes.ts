import { Router, type Response } from "express";
import { z } from "zod";
import { ACCOMMODATION_PREFERENCES, FOOD_PREFERENCES, TRAVEL_STYLES, type INTEREST_CATEGORIES } from "@nexttour/shared";
import { requireAuth } from "../../middleware/auth";
import { ApiError, asyncHandler } from "../../middleware/errors";
import { searchAttractions, searchHotels, searchRestaurants, type PlaceSearchOptions } from "./places.service";
import { getCityPhoto, isPhotoName, resolvePhotoUri } from "./places-photos.service";

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

const photoQuerySchema = z.object({
  w: z.coerce.number().int().min(160).max(1_600).optional(),
});

/**
 * Photo endpoints redirect to Google's CDN instead of streaming the bytes: the
 * API key stays server-side, but the image itself never touches this process.
 *
 * They sit above `requireAuth` on purpose. A cross-origin `<img>` does not carry
 * the session cookie, so an authenticated photo route could not render anywhere,
 * and the landing page needs images while logged out. Abuse is bounded instead by
 * the resource-name format, the supported-city allowlist and the response cache.
 */
const PHOTO_BROWSER_CACHE_SECONDS = 1_800;

function sendPhotoRedirect(response: Response, uri: string | undefined) {
  if (!uri) {
    throw new ApiError(404, "No photo is available for this place");
  }
  response.setHeader("Cache-Control", `public, max-age=${PHOTO_BROWSER_CACHE_SECONDS}`);
  // helmet defaults to same-origin, which would block the web app from loading
  // this response cross-origin as an image.
  response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  response.redirect(302, uri);
}

placesRoutes.get(
  "/photo",
  asyncHandler(async (request, response) => {
    const name = typeof request.query.name === "string" ? request.query.name : "";
    if (!isPhotoName(name)) {
      throw new ApiError(422, "Query parameter `name` must be a Google Places photo resource name");
    }
    const { w } = photoQuerySchema.parse(request.query);
    sendPhotoRedirect(response, await resolvePhotoUri(name, w ?? 800));
  }),
);

placesRoutes.get(
  "/city-photo",
  asyncHandler(async (request, response) => {
    const city = typeof request.query.city === "string" ? request.query.city.trim() : "";
    if (!city) {
      throw new ApiError(422, "Query parameter `city` is required");
    }
    const photo = await getCityPhoto(city);
    if (!photo) {
      throw new ApiError(404, `No destination photo is available for ${city}`);
    }
    const { w } = photoQuerySchema.parse(request.query);
    sendPhotoRedirect(response, await resolvePhotoUri(photo.name, w ?? 1_200));
  }),
);

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