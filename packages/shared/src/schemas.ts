import { z } from "zod";
import {
  ACCOMMODATION_PREFERENCES,
  FOOD_PREFERENCES,
  INTEREST_CATEGORIES,
  TRANSPORT_MODES,
  TRAVEL_STYLES,
} from "./domain";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(120),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const tripPlanningSchema = z
  .object({
    origin: z.string().trim().min(2).max(80),
    destination: z.string().trim().min(2).max(80),
    departureDate: dateStringSchema,
    returnDate: dateStringSchema,
    travelers: z.coerce.number().int().min(1).max(12),
    budget: z.coerce.number().int().min(5_000).max(2_000_000),
    travelStyle: z.enum(TRAVEL_STYLES),
    preferredTransport: z.array(z.enum(TRANSPORT_MODES)).min(1),
    interests: z.array(z.enum(INTEREST_CATEGORIES)).min(1).max(8),
    foodPreference: z.enum(FOOD_PREFERENCES),
    accommodationPreference: z.enum(ACCOMMODATION_PREFERENCES),
  })
  .refine((value) => value.origin.toLowerCase() !== value.destination.toLowerCase(), {
    path: ["destination"],
    message: "Destination must be different from origin",
  })
  .refine((value) => new Date(value.returnDate).getTime() > new Date(value.departureDate).getTime(), {
    path: ["returnDate"],
    message: "Return date must be after departure date",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TripPlanningInput = z.infer<typeof tripPlanningSchema>;
