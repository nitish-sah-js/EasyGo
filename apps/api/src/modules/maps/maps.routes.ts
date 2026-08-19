import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { ApiError, asyncHandler } from "../../middleware/errors";
import { mapsService } from "./maps.service";

const mapsQuerySchema = z.object({
  origin: z.string().min(3).max(80),
  destination: z.string().min(3).max(80),
  mode: z.enum(["WALK", "CAR", "BUS", "TRAIN"]).default("CAR"),
});

export const mapsRoutes = Router();

mapsRoutes.use(requireAuth);

mapsRoutes.get(
  "/distance",
  asyncHandler(async (request, response) => {
    const parsed = mapsQuerySchema.parse(request.query);
    if (parsed.origin === parsed.destination) {
      throw new ApiError(422, "Origin and destination must differ");
    }
    response.json(await mapsService.getDistance(parsed.origin, parsed.destination, parsed.mode));
  }),
);

mapsRoutes.get(
  "/travel-time",
  asyncHandler(async (request, response) => {
    const parsed = mapsQuerySchema.parse(request.query);
    if (parsed.origin === parsed.destination) {
      throw new ApiError(422, "Origin and destination must differ");
    }
    response.json(await mapsService.getLeg(parsed.origin, parsed.destination, parsed.mode));
  }),
);