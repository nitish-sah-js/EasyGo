import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

/**
 * `z.coerce.boolean()` is NOT usable for env flags: it applies `Boolean(value)`,
 * so the string "false" coerces to `true`. Parse the literal instead.
 */
const booleanFlag = (defaultValue: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(defaultValue)
    .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(8).default("change-me-local-secret"),
  AI_PROVIDER: z.enum(["TEMPLATE", "GEMINI", "GROQ", "HUGGINGFACE"]).default("GROQ"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  MIN_TRANSFER_MINUTES: z.coerce.number().int().positive().default(90),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  // Hugging Face Inference Router (OpenAI-compatible), used when AI_PROVIDER=HUGGINGFACE.
  HF_TOKEN: z.string().optional(),
  // Kept separate from AI_MODEL so switching providers does not require editing both.
  HF_MODEL: z.string().optional(),

  // Flights — Sky Scrapper via RapidAPI
  SKY_SCRAPPER_RAPIDAPI_KEY: z.string().optional(),
  SKY_SCRAPPER_RAPIDAPI_HOST: z.string().default("sky-scrapper.p.rapidapi.com"),

  // Hotels / attractions / restaurants — Google Places API (New)
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  // How many top-ranked hotels get a real coordinate lookup. Each costs one
  // Places `searchText` call, which is metered separately from `searchNearby` and
  // is capped per-day at the project level (default 100/day). Only the first hotel
  // is actually shown and used for distances, so keep this small.
  HOTEL_GEOCODE_LIMIT: z.coerce.number().int().min(0).max(20).default(3),

  // Buses / trains / hotel rates — RedBus via Playwright
  REDBUS_HEADLESS: booleanFlag("true"),
  REDBUS_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
  REDBUS_HOTEL_TIMEOUT_MS: z.coerce.number().int().positive().default(40_000),

  // Shared timeout for plain REST providers (Sky Scrapper, Google Places, Open-Meteo)
  EXTERNAL_API_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
});

export const env = envSchema.parse(process.env);
