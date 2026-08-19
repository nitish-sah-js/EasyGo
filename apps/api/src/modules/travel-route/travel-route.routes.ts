import { Router } from "express";
import { z } from "zod";
import { TRANSPORT_MODES } from "@nexttour/shared";
import { requireAuth } from "../../middleware/auth";
import { ApiError, asyncHandler } from "../../middleware/errors";
import { travelRouteService } from "./travel-route.service";

const travelRouteQuerySchema = z.object({
  origin: z.string().trim().min(2).max(80),
  destination: z.string().trim().min(2).max(80),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  travelers: z.coerce.number().int().min(1).max(12).default(2),
  transports: z
    .string()
    .optional()
    .transform((value) =>
      value?.split(",").map((item) => item.trim().toUpperCase() as (typeof TRANSPORT_MODES)[number]),
    ),
  includeNetwork: z.coerce.boolean().default(true),
});

export const travelRouteRoutes = Router();

travelRouteRoutes.use(requireAuth);

travelRouteRoutes.get(
  "/search",
  asyncHandler(async (request, response) => {
    const parsed = travelRouteQuerySchema.parse(request.query);
    if (parsed.origin.toLowerCase() === parsed.destination.toLowerCase()) {
      throw new ApiError(422, "Destination must be different from origin");
    }
    const result = await travelRouteService.search({
      origin: parsed.origin,
      destination: parsed.destination,
      departureDate: parsed.departureDate,
      travelers: parsed.travelers,
      preferredTransport: parsed.transports ?? [...TRANSPORT_MODES],
      includeNetwork: parsed.includeNetwork,
    });
    response.json(result);
  }),
);