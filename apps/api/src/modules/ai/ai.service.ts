import {
  tripDateRange,
  type GeneratedItinerary,
  type ItineraryDay,
} from "@nexttour/shared";
import { env } from "../../config/env";
import type { AIProvider, ItineraryContext } from "./providers/ai-provider.interface";
import { GeminiAIProvider } from "./providers/gemini-ai.provider";
import { GroqAIProvider } from "./providers/groq-ai.provider";
import { MockAIProvider } from "./providers/mock-ai.provider";

export class FallbackAIProvider implements AIProvider {
  readonly name: string;
  lastFallbackReason: string | null = null;
  private readonly fallback = new MockAIProvider();

  constructor(private readonly primary: AIProvider) {
    this.name = primary.name;
  }

  async generateItinerary(context: ItineraryContext): Promise<GeneratedItinerary> {
    try {
      this.lastFallbackReason = null;
      return await this.primary.generateItinerary(context);
    } catch (error) {
      this.lastFallbackReason = error instanceof Error ? error.message : "AI provider failed";
      try {
        return await this.fallback.generateItinerary(context);
      } catch (fallbackError) {
        this.lastFallbackReason = `${this.lastFallbackReason}; fallback also failed (${
          fallbackError instanceof Error ? fallbackError.message : "unknown error"
        })`;
        return this.minimalItinerary(context);
      }
    }
  }

  private minimalItinerary(context: ItineraryContext): GeneratedItinerary {
    const days: ItineraryDay[] = tripDateRange(
      context.request.departureDate,
      context.request.returnDate,
    ).map((date, index) => {
      const weather = context.weather.find((item) => item.date === date);
      return {
        dayNumber: index + 1,
        date,
        summary: `Day ${index + 1} in ${context.request.destination}.`,
        ...(weather ? { weather } : {}),
        activities: [
          {
            id: `day-${index + 1}-free`,
            time: "10:00",
            title: `Explore ${context.request.destination} at leisure`,
            category: "FREE_TIME",
            locationName: context.hotel.name,
            durationMinutes: 240,
            estimatedCost: 0,
            notes: "Auto-generated because the AI provider was unavailable.",
          },
        ],
      };
    });

    return {
      recommendation: "Simple fallback plan",
      reason:
        "The AI itinerary provider was unavailable, so a minimal plan was generated instead of failing the trip.",
      itinerary: days,
    };
  }
}

export function createAIProvider(): FallbackAIProvider {
  switch (env.AI_PROVIDER) {
    case "GEMINI":
      return new FallbackAIProvider(new GeminiAIProvider());
    case "GROQ":
      return new FallbackAIProvider(new GroqAIProvider());
    case "MOCK":
    default:
      return new FallbackAIProvider(new MockAIProvider());
  }
}