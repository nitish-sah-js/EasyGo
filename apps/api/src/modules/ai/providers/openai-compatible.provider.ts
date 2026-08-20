import type { GeneratedItinerary } from "@nexttour/shared";
import {
  buildSystemPrompt,
  itinerarySchema,
  normalizeItineraryShape,
  repairItinerary,
  stripMarkdownFences,
  trimContext,
} from "../itinerary-contract";
import type { AIProvider, ItineraryContext } from "./ai-provider.interface";

const REQUEST_TIMEOUT_MS = 90_000;

export interface OpenAICompatibleConfig {
  /** Provider name recorded in `providerNotes`. */
  readonly name: string;
  /** Full chat-completions endpoint. */
  readonly url: string;
  /** Bearer token; a missing key is reported as a configuration error, not a fault. */
  readonly apiKey: string | undefined;
  /** Name of the env var holding the key, used only for the error message. */
  readonly apiKeyVar: string;
  readonly model: string;
  /** Vendor-specific body fields (`reasoning_effort`, `top_p`, …). */
  readonly extraBody?: Record<string, unknown>;
  readonly maxTokens: number;
  readonly temperature: number;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
      /** Reasoning models return their scratchpad separately from the answer. */
      reasoning_content?: string;
    };
    finish_reason?: string;
  }>;
}

/**
 * Base for any provider exposing an OpenAI-compatible `/chat/completions` endpoint.
 *
 * Groq and the Hugging Face router speak the same protocol, so the request/parse/repair
 * path lives here once and subclasses supply only endpoint, credentials, model and any
 * vendor-specific body fields. Nothing here is Groq- or HF-specific.
 */
export abstract class OpenAICompatibleAIProvider implements AIProvider {
  abstract readonly name: string;

  protected abstract config(): OpenAICompatibleConfig;

  async generateItinerary(context: ItineraryContext): Promise<GeneratedItinerary> {
    const config = this.config();
    if (!config.apiKey) {
      throw new Error(`${config.apiKeyVar} is not set`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          response_format: { type: "json_object" },
          ...config.extraBody,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: JSON.stringify(trimContext(context)) },
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new Error(`${config.name} timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw new Error(`${config.name} request failed: ${(error as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }

    // Gateways in front of these APIs return HTML error pages (e.g. a 504 from the
    // Hugging Face router on a long generation), so the body is read as text and
    // parsed defensively rather than assumed to be JSON.
    const rawBody = await response.text().catch(() => "");

    if (!response.ok) {
      throw new Error(
        `${config.name} API error ${response.status}: ${rawBody.replace(/\s+/g, " ").slice(0, 300)}`,
      );
    }

    let payload: ChatCompletionResponse;
    try {
      payload = JSON.parse(rawBody) as ChatCompletionResponse;
    } catch {
      throw new Error(
        `${config.name} returned a non-JSON response: ${rawBody.replace(/\s+/g, " ").slice(0, 200)}`,
      );
    }
    const choice = payload.choices?.[0];
    const content = choice?.message?.content;

    if (!content) {
      // A reasoning model that spends its whole budget thinking returns an empty
      // `content` with a populated `reasoning_content`; say so rather than "empty".
      const reasoned = Boolean(choice?.message?.reasoning_content);
      throw new Error(
        reasoned
          ? `${config.name} returned only reasoning and no answer (finish_reason=${choice?.finish_reason ?? "unknown"}); raise max_tokens or lower reasoning effort`
          : `${config.name} returned an empty completion`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripMarkdownFences(content));
    } catch {
      throw new Error(`${config.name} returned invalid JSON`);
    }

    const validated = itinerarySchema.safeParse(normalizeItineraryShape(parsed));
    if (!validated.success) {
      throw new Error(`${config.name} returned itinerary that failed validation: ${validated.error.message}`);
    }

    return repairItinerary(validated.data, context);
  }
}
