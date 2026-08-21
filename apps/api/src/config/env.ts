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

const ttlSeconds = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((value, context) => {
      if (!value) return defaultValue;
      const trimmed = value.trim();
      const factors = trimmed.split("*").map((part) => part.trim());
      if (factors.length === 0 || factors.some((part) => !/^\d+$/.test(part))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Use seconds or a multiplication expression like 15*60",
        });
        return z.NEVER;
      }
      return factors.reduce((total, factor) => total * Number(factor), 1);
    })
    .pipe(z.number().int().min(0));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  TRANSPORT_CACHE_TTL_SECONDS: ttlSeconds(900),
  HOTEL_CACHE_TTL_SECONDS: ttlSeconds(1_800),
  PLACES_CACHE_TTL_SECONDS: ttlSeconds(21_600),
  WEATHER_CACHE_TTL_SECONDS: ttlSeconds(3_600),
  JWT_SECRET: z.string().min(8).default("change-me-local-secret"),
  AI_PROVIDER: z.enum(["TEMPLATE", "GEMINI", "GROQ", "HUGGINGFACE"]).default("GROQ"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  /**
   * Origin(s) the browser app is served from. Accepts a comma-separated list:
   * Next.js silently falls back to the next free port when 3000 is taken, and a
   * single pinned origin turns that into an opaque CORS failure at login.
   */
  FRONTEND_URL: z
    .string()
    .default("http://localhost:3000")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
    .refine((origins) => origins.length > 0, "FRONTEND_URL must list at least one origin"),
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

  // Hotels / attractions / restaurants (search, address, rating) — Google Places API (New)
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  // How many top-ranked hotels get a real coordinate lookup. Each costs one
  // Places `searchText` call, which is metered separately from `searchNearby` and
  // is capped per-day at the project level (default 100/day). Only the first hotel
  // is actually shown and used for distances, so keep this small.
  HOTEL_GEOCODE_LIMIT: z.coerce.number().int().min(0).max(20).default(3),

  // Photos — Wikimedia Commons (no API key required)
  // Wikimedia's API etiquette policy asks every client to identify itself; an
  // anonymous/generic User-Agent risks being throttled ahead of everyone else.
  WIKIMEDIA_USER_AGENT: z
    .string()
    .default("NextTour-TripPlanner/1.0 (https://github.com/nexttour; contact: support@nexttour.app)"),
  // Resolved thumbnail URLs are cached well inside their practical lifetime, so a
  // popular destination card costs one Commons lookup per TTL rather than one per
  // visitor.
  PLACE_PHOTO_CACHE_TTL_SECONDS: ttlSeconds(3_600),
  // How many top-ranked places (per hotel/attraction/restaurant list) get a
  // Commons photo search. Commons is free and keyless, unlike Google Photos, so
  // this can be larger than HOTEL_GEOCODE_LIMIT — the constraint here is request
  // latency and API etiquette, not billing.
  WIKIMEDIA_PHOTO_LIMIT: z.coerce.number().int().min(0).max(40).default(12),

  // Buses / trains / hotel rates — RedBus via Playwright
  REDBUS_HEADLESS: booleanFlag("true"),
  REDBUS_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
  REDBUS_HOTEL_TIMEOUT_MS: z.coerce.number().int().positive().default(40_000),

  // Shared timeout for plain REST providers (Sky Scrapper, Google Places, Open-Meteo)
  EXTERNAL_API_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
});

export const env = envSchema.parse(process.env);
