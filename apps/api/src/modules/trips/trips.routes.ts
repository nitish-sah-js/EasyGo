import { Router } from "express";
import { z } from "zod";
import { tripPlanningSchema } from "@nexttour/shared";
import { requireAuth } from "../../middleware/auth";
import { ApiError, asyncHandler } from "../../middleware/errors";
import { validateBody } from "../../middleware/validate";
import type { Request } from "express";
import {
  createTrip,
  createTripAndPlan,
  deleteTrip,
  getTrip,
  getTripResource,
  getTripResult,
  getTripStatus,
  listTrips,
  startTripPlanning,
} from "./trips.service";

export const tripsRoutes = Router();

function tripIdOf(request: Request): string {
  const id = request.params.id;
  if (!id) {
    throw new ApiError(400, "Trip id is missing");
  }
  return id;
}

const listTripsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

tripsRoutes.use(requireAuth);

tripsRoutes.post(
  "/plan",
  validateBody(tripPlanningSchema),
  asyncHandler(async (request, response) => {
    const result = await createTripAndPlan(request.user!.id, request.body);
    response.status(201).json({ tripId: result.tripId, jobId: result.jobId });
  }),
);

tripsRoutes.post(
  "/",
  validateBody(tripPlanningSchema),
  asyncHandler(async (request, response) => {
    const trip = await createTrip(request.user!.id, request.body);
    response.status(201).json({ tripId: trip.id, trip });
  }),
);

tripsRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const parsed = listTripsQuerySchema.parse(request.query);
    response.json(await listTrips(request.user!.id, parsed.limit, parsed.offset));
  }),
);

tripsRoutes.get(
  "/:id",
  asyncHandler(async (request, response) => {
    response.json({ trip: await getTrip(request.user!.id, tripIdOf(request)) });
  }),
);

tripsRoutes.post(
  "/:id/plan",
  asyncHandler(async (request, response) => {
    response.status(202).json(await startTripPlanning(request.user!.id, tripIdOf(request)));
  }),
);

tripsRoutes.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    response.json(await deleteTrip(request.user!.id, tripIdOf(request)));
  }),
);

tripsRoutes.get(
  "/:id/status",
  asyncHandler(async (request, response) => {
    response.json(await getTripStatus(request.user!.id, tripIdOf(request)));
  }),
);

tripsRoutes.get(
  "/:id/result",
  asyncHandler(async (request, response) => {
    response.json(await getTripResult(request.user!.id, tripIdOf(request)));
  }),
);

tripsRoutes.get(
  "/:id/routes",
  asyncHandler(async (request, response) => {
    const result = await getTripResult(request.user!.id, tripIdOf(request));
    response.json({ routes: [result.recommendedRoute, ...result.alternativeRoutes].filter(Boolean) });
  }),
);

tripsRoutes.get(
  "/:id/hotels",
  asyncHandler(async (request, response) => {
    const result = await getTripResult(request.user!.id, tripIdOf(request));
    response.json({ hotels: result.hotel ? [result.hotel] : [] });
  }),
);

tripsRoutes.get(
  "/:id/attractions",
  asyncHandler(async (request, response) => {
    response.json({ attractions: await getTripResource(request.user!.id, tripIdOf(request), "attractions") });
  }),
);

tripsRoutes.get(
  "/:id/restaurants",
  asyncHandler(async (request, response) => {
    response.json({ restaurants: await getTripResource(request.user!.id, tripIdOf(request), "restaurants") });
  }),
);

tripsRoutes.get(
  "/:id/budget",
  asyncHandler(async (request, response) => {
    const result = await getTripResult(request.user!.id, tripIdOf(request));
    response.json({ budget: result.budget });
  }),
);
