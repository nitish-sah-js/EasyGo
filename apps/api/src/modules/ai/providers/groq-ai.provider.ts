import { z } from "zod";
import {
  tripDateRange,
  type GeneratedItinerary,
  type ItineraryActivity,
  type ItineraryDay,
} from "@nexttour/shared";
import { env } from "../../../config/env";
import type { AIProvider, ItineraryContext } from "./ai-provider.interface";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const REQUEST_TIMEOUT_MS = 60_000;

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

  const mapDistances = Object.fromEntries(
    Object.entries(context.mapDistances ?? {}).map(([id, distance]) => [
      id,
      {
        distanceKm: distance.distanceKm,
        travelTimeMinutes: distance.travelTimeMinutes,
        mode: distance.mode,
      },
    ]),
  );

  return {
    request: context.request,
    route: {
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
    },
    hotel: context.hotel,
    attractions: sortedAttractions.slice(0, 5),
    restaurants: sortedRestaurants.slice(0, 4),
    weather: context.weather,
    budget: context.budget,
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
            locationName: context.hotel.name,
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

export class GroqAIProvider implements AIProvider {
  readonly name = "GROQ_AI";

  async generateItinerary(context: ItineraryContext): Promise<GeneratedItinerary> {
    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: env.AI_MODEL ?? DEFAULT_MODEL,
          temperature: 0.7,
          max_tokens: 5000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: JSON.stringify(trimContext(context)) },
          ],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Groq API error ${response.status}: ${errorText.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Groq returned an empty completion");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripMarkdownFences(content));
    } catch {
      throw new Error("Groq returned invalid JSON");
    }

    const validated = itinerarySchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`Groq returned itinerary that failed validation: ${validated.error.message}`);
    }

    return repairItinerary(validated.data, context);
  }
}