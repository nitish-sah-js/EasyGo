import type { PlaceSuggestion, PlaceSuggestionCategory } from "@nexttour/shared";
import { env } from "../../config/env";
import { GooglePlacesClient, type GooglePlaceAutocompleteSuggestion } from "../../lib/external/google-places-client";
import { cachedProviderResult } from "../../lib/provider-cache";

const client = new GooglePlacesClient();

/**
 * Confident type signals only — `political`/`geocode` are present on almost
 * every prediction (a train station's neighborhood is "political" too), so
 * they're deliberately excluded here and handled by the city-level fallback
 * below instead of being treated as a category on their own.
 */
const CATEGORY_BY_TYPE: Array<{ type: string; category: PlaceSuggestionCategory }> = [
  { type: "airport", category: "airport" },
  { type: "train_station", category: "train_station" },
  { type: "transit_station", category: "train_station" },
  { type: "subway_station", category: "train_station" },
  { type: "lodging", category: "hotel" },
  { type: "tourist_attraction", category: "attraction" },
];

const CITY_LEVEL_TYPES = ["locality", "administrative_area_level_1", "administrative_area_level_2", "country"];

/**
 * Google's Places Autocomplete rarely tags Indian railway stations with
 * `train_station`/`transit_station` — most come back as plain
 * `point_of_interest`/`geocode`. A text fallback on the name is what actually
 * gets "Patna Junction" a train icon in practice; it only runs once the type
 * list has failed to say anything more specific.
 */
const TRAIN_STATION_PATTERN = /\b(junction|jn\.?|railway station|rail(?:way)? terminus)\b/i;
const AIRPORT_PATTERN = /\bairport\b/i;
const HOTEL_PATTERN = /\b(hotel|resort|inn|guest ?house)\b/i;

function categorize(types: string[] | undefined, text: string): PlaceSuggestionCategory {
  const typeList = types ?? [];
  for (const { type, category } of CATEGORY_BY_TYPE) {
    if (typeList.includes(type)) return category;
  }
  if (TRAIN_STATION_PATTERN.test(text)) return "train_station";
  if (AIRPORT_PATTERN.test(text)) return "airport";
  if (HOTEL_PATTERN.test(text)) return "hotel";
  if (typeList.some((type) => CITY_LEVEL_TYPES.includes(type))) return "city";
  return "other";
}

function toSuggestion(entry: GooglePlaceAutocompleteSuggestion): PlaceSuggestion | undefined {
  const prediction = entry.placePrediction;
  const placeId = prediction?.placeId;
  const description = prediction?.text?.text;
  if (!placeId || !description) return undefined;

  const mainText = prediction?.structuredFormat?.mainText?.text ?? description;
  const secondaryText = prediction?.structuredFormat?.secondaryText?.text;

  return {
    placeId,
    description,
    mainText,
    ...(secondaryText ? { secondaryText } : {}),
    category: categorize(prediction?.types, description),
  };
}

/**
 * A short cache TTL still helps a lot here: many users type the same common
 * prefixes ("de", "mum", "goa"...), and this endpoint is public (the search
 * panel renders logged out), so it's the one Places call worth shielding from
 * repeat keystrokes across different visitors, not just one.
 *
 * Session tokens are intentionally excluded from the cache key — they only
 * affect Google's billing grouping, not which places come back for a given
 * input, so keying on them would just fragment the cache per keystroke burst.
 */
export async function autocompletePlaces(input: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
  return cachedProviderResult(
    "GOOGLE_PLACES_AUTOCOMPLETE",
    { keyParts: ["autocomplete", input.toLowerCase()], request: { input: input.toLowerCase() } },
    env.PLACES_AUTOCOMPLETE_CACHE_TTL_SECONDS,
    async () => {
      const result = await client.autocomplete(input, sessionToken);
      return (result.suggestions ?? []).map(toSuggestion).filter((value): value is PlaceSuggestion => Boolean(value));
    },
    { label: `places autocomplete "${input}"`, liveAction: "autocomplete hit" },
  );
}
