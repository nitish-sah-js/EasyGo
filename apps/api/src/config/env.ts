import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(8).default("change-me-local-secret"),
  TRAVEL_DATA_MODE: z.enum(["MOCK", "REAL"]).default("MOCK"),
  AI_PROVIDER: z.enum(["MOCK", "GEMINI", "GROQ"]).default("MOCK"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  MIN_TRANSFER_MINUTES: z.coerce.number().int().positive().default(90),
  MOCK_FAIL_PROVIDERS: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
