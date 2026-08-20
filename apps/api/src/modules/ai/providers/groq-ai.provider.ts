import { env } from "../../../config/env";
import { OpenAICompatibleAIProvider, type OpenAICompatibleConfig } from "./openai-compatible.provider";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

export class GroqAIProvider extends OpenAICompatibleAIProvider {
  readonly name = "GROQ_AI";

  protected config(): OpenAICompatibleConfig {
    return {
      name: "Groq",
      url: GROQ_API_URL,
      apiKey: env.GROQ_API_KEY,
      apiKeyVar: "GROQ_API_KEY",
      model: env.AI_MODEL ?? DEFAULT_MODEL,
      // Structured output, not creative writing: high temperature makes the model emit
      // tokens that break strict JSON, which Groq rejects wholesale as
      // json_validate_failed. Low temperature keeps the schema intact.
      temperature: 0.2,
      // Groq's free tier allows 8,000 tokens/min for input and output combined. The
      // trimmed context costs ~1k, leaving room for a full multi-day itinerary without
      // tripping either a 413 (request too large) or a mid-JSON truncation.
      maxTokens: 6_000,
      extraBody: {
        // gpt-oss bills reasoning tokens against max_tokens. At default effort a
        // multi-day itinerary spends ~650 tokens thinking and then gets cut off
        // mid-JSON; low effort drops that to ~50. This is structured scheduling over
        // data we supply, not a reasoning problem.
        reasoning_effort: "low",
      },
    };
  }
}
