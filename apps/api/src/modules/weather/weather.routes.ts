import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { ApiError, asyncHandler } from "../../middleware/errors";
import { weatherService } from "./weather.service";

const weatherQuerySchema = z.object({
  city: z.string().trim().min(2).max(80),
  dates: z
    .string()
    .min(1)
    .transform((value) => value.split(",").map((item) => item.trim()))
    .refine((value) => value.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)), {
      message: "Dates must use YYYY-MM-DD format",
    }),
});

export const weatherRoutes = Router();

weatherRoutes.use(requireAuth);

weatherRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const parsed = weatherQuerySchema.parse(request.query);
    if (!parsed.city) {
      throw new ApiError(422, "Query parameter `city` is required");
    }
    response.json({ weather: await weatherService.getForecast(parsed.city, parsed.dates) });
  }),
);