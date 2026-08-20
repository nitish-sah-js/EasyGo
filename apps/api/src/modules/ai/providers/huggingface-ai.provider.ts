import { env } from "../../../config/env";
import { OpenAICompatibleAIProvider, type OpenAICompatibleConfig } from "./openai-compatible.provider";

/**
 * DeepSeek (and any other model) served through the Hugging Face Inference Router,
 * which exposes an OpenAI-compatible `/chat/completions` endpoint — so this reuses the
 * shared request/parse/repair path rather than pulling in the `openai` SDK for one
 * provider. The SDK would send an identical request.
 *
 * Model ids carry an explicit inference provider suffix, e.g.
 * `deepseek-ai/DeepSeek-V4-Flash-0731:novita`.
 */
const HUGGINGFACE_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-ai/DeepSeek-V4-Flash-0731:novita";

export class HuggingFaceAIProvider extends OpenAICompatibleAIProvider {
  readonly name = "HUGGINGFACE_AI";

  protected config(): OpenAICompatibleConfig {
    return {
      name: "Hugging Face",
      url: HUGGINGFACE_ROUTER_URL,
      apiKey: env.HF_TOKEN,
      apiKeyVar: "HF_TOKEN",
      // HF_MODEL is separate from AI_MODEL so switching AI_PROVIDER back to GROQ does
      // not require also rewriting the model id.
      model: env.HF_MODEL ?? DEFAULT_MODEL,
      temperature: 0.2,
      maxTokens: 8_000,
      extraBody: {
        // DeepSeek-V4-Flash reasons by default and bills `reasoning_content` against
        // max_tokens. On a full itinerary prompt it spends the entire 8k budget
        // thinking and returns finish_reason=length with an empty answer.
        //
        // `reasoning_effort` (the OpenAI-style knob Groq honours) is ignored here;
        // turning thinking off through the chat template is what works — and it cuts
        // the call from ~80s to ~13s. Raising max_tokens instead is not an option:
        // the router times out at 120s with a 504.
        chat_template_kwargs: { thinking: false },
      },
    };
  }
}
