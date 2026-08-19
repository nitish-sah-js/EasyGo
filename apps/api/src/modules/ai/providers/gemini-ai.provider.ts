import type { AIProvider, ItineraryContext } from "./ai-provider.interface";
import type { GeneratedItinerary } from "@nexttour/shared";

export class GeminiAIProvider implements AIProvider {
  readonly name = "GEMINI_AI";

  async generateItinerary(_context: ItineraryContext): Promise<GeneratedItinerary> {
    throw new Error(
      "GEMINI_AI provider is not implemented yet. Keep AI_PROVIDER=MOCK for the mock-data MVP.",
    );
  }
}