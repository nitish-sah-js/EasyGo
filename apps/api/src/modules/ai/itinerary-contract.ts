import { z } from "zod";
import {
  tripDateRange,
  type GeneratedItinerary,
  type ItineraryActivity,
  type ItineraryDay,
  type RouteDistance,
} from "@nexttour/shared";
import type { ItineraryContext } from "./providers/ai-provider.interface";

/**
 * The provider-agnostic half of itinerary generation: the JSON contract handed to the
 * model, the context trimming, and the validation/repair applied to whatever comes
 * back. Every chat-completions model is asked for the same shape and held to the same
 * schema, so swapping or adding a model changes only transport details, never the
 * itinerary semantics.
 */

const activitySchema = z.object({
  id: z.string(),
  time: z.string().regex(/^\d{1,2}:\d{2}$/, "Time must be HH:MM"),
  title: z.string(),
  category: z.enum(["TRANSPORT", "HOTEL", "ATTRACTION", "RESTAURANT", "FREE_TIME"]),
  locationName: z.string().optional(),
  durationMinutes: z.number().nonnegative(),
  estimatedCost: z.number().nonnegative(),
  travelTimeMinutes: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

const itineraryDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  summary: z.string(),
  activities: z.array(activitySchema),
});

const itinerarySchema = z.object({
  recommendation: z.string(),
  reason: z.string(),
  itinerary: z.array(itineraryDaySchema),
});

/**
 * Groq's JSON mode guarantees syntactically valid JSON, not the requested *shape*.
 * In practice `gpt-oss-120b` sometimes answers with the bare day array, or wraps the
 * object under a single key. Both carry the full itinerary, so they are unwrapped
 * rather than thrown away — the alternative is discarding a good plan and falling
 * back to the template provider over a packaging difference.
 */
export function normalizeItineraryShape(parsed: unknown): unknown {
  if (Array.isArray(parsed)) {
    return { recommendation: "", reason: "", itinerary: parsed };
  }

  if (parsed !== null && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.itinerary) || Array.isArray(record.days)) {
      return {
        recommendation: typeof record.recommendation === "string" ? record.recommendation : "",
        reason: typeof record.reason === "string" ? record.reason : "",
        itinerary: record.itinerary ?? record.days,
      };
    }

    // A single wrapper key, e.g. { "plan": { recommendation, reason, itinerary } }.
    const values = Object.values(record);
    if (values.length === 1 && values[0] !== null && typeof values[0] === "object") {
      return normalizeItineraryShape(values[0]);
    }
  }

  return parsed;
}

function buildSystemPrompt(): string {
  return [
    "You are a travel itinerary planner. You receive a compact JSON context describing a trip:",
    "the traveller request, a chosen transport route, one hotel, several attractions, several restaurants, per-day weather, a budget breakdown, and travel times from the hotel to each attraction.",
    "You must produce a single JSON object (no prose, no markdown, no code fences) matching EXACTLY this shape:",
    JSON.stringify(
      {
        recommendation: "short human-readable recommendation label",
        reason: "2-3 sentence explanation of the plan",
        itinerary: [
          {
            dayNumber: 1,
            date: "YYYY-MM-DD",
            summary: "one-line summary of the day",
            activities: [
              {
                id: "day-1-arrival",
                time: "HH:MM",
                title: "Activity title",
                category: "TRANSPORT | HOTEL | ATTRACTION | RESTAURANT | FREE_TIME",
                locationName: "optional location name",
                durationMinutes: 0,
                estimatedCost: 0,
                travelTimeMinutes: 0,
                notes: "optional note",
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
    "RULES:",
    "1. Create exactly one itinerary entry per date in the trip date range, in order, dayNumber starting at 1. Use only the dates from the context.",
    "2. Use ONLY hotels, attractions, restaurants, and route segments provided in the context. Do not invent venues or prices.",
    "3. Day 1 must include a transport activity for the departure and a hotel check-in activity.",
    "4. The final day must include a checkout / return buffer activity.",
    "5. Each day should have 4-6 activities: sightseeing, a lunch restaurant, and a dinner restaurant on non-final days.",
    "6. Times must be realistic 24h HH:MM strings and activities sorted by time.",
    "7. estimatedCost is in Indian Rupees (INR). Respect the user's budget and travel style: budget means cheaper options, luxury means premium choices.",
    "8. If weather for a date is HEAVY_RAIN or LIGHT_RAIN, prefer indoor or covered attractions (MUSEUM, CULTURE, RELIGIOUS, SHOPPING) and add a rain-aware note.",
    "9. Respect the traveller's food preference and interests. Use the mapDistances travel times for moving between the hotel and attractions.",
    "10. Respond with ONLY the JSON object. Do not wrap it in markdown.",
  ].join("\n");
}

function trimContext(context: ItineraryContext): unknown {
  const sortedAttractions = [...context.attractions].sort(
    (left, right) =>
      Number(context.request.interests.includes(right.category)) -
        Number(context.request.interests.includes(left.category)) ||
      right.rating - left.rating,
  );
  const sortedRestaurants = [...context.restaurants].sort(
    (left, right) => right.rating - left.rating || left.mealCostPerPerson - right.mealCostPerPerson,
  );

  // route/hotel are omitted entirely when no provider returned one, so the model is
  // told what is genuinely unknown instead of being handed a placeholder to describe.
  const route = context.route
    ? {
        label: context.route.label,
        totalPrice: context.route.totalPrice,
        totalDurationMinutes: context.route.totalDurationMinutes,
        segments: context.route.segments.map((segment) => ({
          mode: segment.mode,
          origin: { name: segment.origin.name },
          destination: { name: segment.destination.name },
          departureTime: segment.departureTime,
          arrivalTime: segment.arrivalTime,
          price: segment.price,
        })),
      }
    : undefined;

  // Groq's free tier caps input + output at 8,000 tokens per minute, and real provider
  // payloads are far chattier than the mock ones were (full Google formatted addresses,
  // place ids, coordinates). Only the fields the model actually needs to schedule a day
  // are sent, and distances are limited to the attractions included above — otherwise
  // the request alone can exceed the window and Groq rejects it with HTTP 413.
  const attractions = sortedAttractions.slice(0, 5);
  const restaurants = sortedRestaurants.slice(0, 4);

  const mapDistances = Object.fromEntries(
    attractions
      .map((attraction) => [attraction.id, context.mapDistances?.[attraction.id]] as const)
      .filter((entry): entry is readonly [string, RouteDistance] => entry[1] !== undefined)
      .map(([id, distance]) => [id, { km: distance.distanceKm, minutes: distance.travelTimeMinutes }]),
  );

  return {
    request: {
      origin: context.request.origin,
      destination: context.request.destination,
      departureDate: context.request.departureDate,
      returnDate: context.request.returnDate,
      travelers: context.request.travelers,
      budget: context.request.budget,
      travelStyle: context.request.travelStyle,
      interests: context.request.interests,
      foodPreference: context.request.foodPreference,
    },
    route: route ?? "No transport route was available for these dates.",
    hotel: context.hotel
      ? {
          name: context.hotel.name,
          area: context.hotel.location.slice(0, 80),
          pricePerNight: context.hotel.pricePerNight,
          rating: context.hotel.rating,
        }
      : "No hotel was available for this destination.",
    attractions: attractions.map((attraction) => ({
      id: attraction.id,
      name: attraction.name,
      category: attraction.category,
      entryFee: attraction.entryFee,
      minutes: attraction.recommendedDurationMinutes,
      bestTimeToVisit: attraction.bestTimeToVisit,
    })),
    restaurants: restaurants.map((restaurant) => ({
      name: restaurant.name,
      cuisine: restaurant.cuisine,
      costPerPerson: restaurant.mealCostPerPerson,
      vegetarian: restaurant.vegetarianAvailable,
    })),
    weather: context.weather.map((day) => ({
      date: day.date,
      temperature: day.temperature,
      condition: day.condition,
      rainProbability: day.rainProbability,
    })),
    budget: {
      total: context.budget.totalEstimatedCost,
      userBudget: context.budget.userBudget,
      withinBudget: context.budget.isWithinBudget,
    },
    mapDistances,
  };
}

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  const match = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (match) {
    return match[1]?.trim() ?? trimmed;
  }
  return trimmed;
}

function normalizeTime(time: string): string {
  const parts = time.split(":");
  if (parts.length !== 2) {
    return time;
  }
  const hour = parts[0]?.padStart(2, "0") ?? "00";
  const minute = parts[1]?.padStart(2, "0") ?? "00";
  return `${hour}:${minute}`;
}

function repairItinerary(parsed: z.infer<typeof itinerarySchema>, context: ItineraryContext): GeneratedItinerary {
  const dates = tripDateRange(context.request.departureDate, context.request.returnDate);
  const daysByDate = new Map(parsed.itinerary.map((day) => [day.date, day]));

  const days: ItineraryDay[] = dates.map((date, index) => {
    const parsedDay = daysByDate.get(date);
    const weather = context.weather.find((item) => item.date === date);
    const activities: ItineraryActivity[] = parsedDay
      ? parsedDay.activities
          .map((activity, activityIndex) => ({
            id: activity.id.trim() || `day-${index + 1}-activity-${activityIndex + 1}`,
            time: normalizeTime(activity.time),
            title: activity.title.trim() || "Free time",
            category: activity.category,
            ...(activity.locationName?.trim() ? { locationName: activity.locationName.trim() } : {}),
            durationMinutes: activity.durationMinutes,
            estimatedCost: activity.estimatedCost,
            ...(activity.travelTimeMinutes !== undefined ? { travelTimeMinutes: activity.travelTimeMinutes } : {}),
            ...(activity.notes?.trim() ? { notes: activity.notes.trim() } : {}),
          }))
          .sort((left, right) => left.time.localeCompare(right.time))
      : [
          {
            id: `day-${index + 1}-free`,
            time: "10:00",
            title: `Explore ${context.request.destination} at leisure`,
            category: "FREE_TIME" as const,
            ...(context.hotel ? { locationName: context.hotel.name } : {}),
            durationMinutes: 180,
            estimatedCost: 0,
            notes: "Auto-generated to keep the itinerary complete.",
          },
        ];

    return {
      dayNumber: index + 1,
      date,
      summary: parsedDay?.summary.trim() || `Day ${index + 1} in ${context.request.destination}.`,
      ...(weather ? { weather } : {}),
      activities,
    };
  });

  return {
    recommendation: parsed.recommendation.trim() || "AI-planned itinerary",
    reason:
      parsed.reason.trim() ||
      `This ${dates.length}-day plan for ${context.request.destination} balances sightseeing, food, and budget.`,
    itinerary: days,
  };
}

export { itinerarySchema, buildSystemPrompt, trimContext, stripMarkdownFences, repairItinerary };
