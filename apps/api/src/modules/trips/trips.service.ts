import type { PlanningStatus, TripPlanningInput, TripResultPayload } from "@nexttour/shared";
import { createInitialProgress } from "../planning/progress";
import { enqueuePlanningJob } from "../../queues/planning.queue";
import { toJson } from "../../lib/json";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errors";

function toDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function getOwnedTripOrThrow(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId },
    include: { preferences: true, planningJob: true },
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  return trip;
}

export async function createTrip(userId: string, input: TripPlanningInput) {
  return prisma.trip.create({
    data: {
      userId,
      origin: input.origin,
      destination: input.destination,
      departureDate: toDate(input.departureDate),
      returnDate: toDate(input.returnDate),
      travelers: input.travelers,
      budget: input.budget,
      status: "PENDING",
      preferences: {
        create: {
          travelStyle: input.travelStyle,
          preferredTransport: input.preferredTransport,
          interests: input.interests,
          foodPreference: input.foodPreference,
          accommodationPreference: input.accommodationPreference,
        },
      },
      planningJob: {
        create: {
          status: "PENDING",
          progress: toJson(createInitialProgress()),
          providerNotes: [],
        },
      },
    },
    include: { preferences: true, planningJob: true },
  });
}

export async function startTripPlanning(userId: string, tripId: string) {
  const trip = await getOwnedTripOrThrow(userId, tripId);

  await prisma.planningJob.upsert({
    where: { tripId },
    update: {
      status: "PENDING",
      progress: toJson(createInitialProgress()),
      providerNotes: [],
      error: null,
      startedAt: null,
      completedAt: null,
    },
    create: {
      tripId,
      status: "PENDING",
      progress: toJson(createInitialProgress()),
      providerNotes: [],
    },
  });
  await prisma.trip.update({ where: { id: trip.id }, data: { status: "PENDING" } });

  const job = await enqueuePlanningJob({ tripId: trip.id, userId });
  if (job.id) {
    await prisma.planningJob.update({
      where: { tripId: trip.id },
      data: { bullJobId: job.id },
    });
  }

  return { tripId: trip.id, jobId: job.id };
}

export async function createTripAndPlan(userId: string, input: TripPlanningInput) {
  const trip = await createTrip(userId, input);
  const queued = await startTripPlanning(userId, trip.id);
  return { trip, ...queued };
}

export async function listTrips(userId: string, limit = 20, offset = 0) {
  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(50, Math.max(1, limit)),
      skip: Math.max(0, offset),
      include: { planningJob: true },
    }),
    prisma.trip.count({ where: { userId } }),
  ]);

  return {
    trips: trips.map((trip) => ({
      id: trip.id,
      origin: trip.origin,
      destination: trip.destination,
      departureDate: toDateOnly(trip.departureDate),
      returnDate: toDateOnly(trip.returnDate),
      travelers: trip.travelers,
      budget: trip.budget,
      status: trip.status,
      createdAt: trip.createdAt.toISOString(),
      providerNotes: trip.planningJob?.providerNotes ?? [],
    })),
    total,
    limit: Math.min(50, Math.max(1, limit)),
    offset: Math.max(0, offset),
  };
}

export async function getTrip(userId: string, tripId: string) {
  const trip = await getOwnedTripOrThrow(userId, tripId);
  return {
    id: trip.id,
    origin: trip.origin,
    destination: trip.destination,
    departureDate: toDateOnly(trip.departureDate),
    returnDate: toDateOnly(trip.returnDate),
    travelers: trip.travelers,
    budget: trip.budget,
    status: trip.status,
    preferences: trip.preferences,
    planningJob: trip.planningJob,
  };
}

export async function getTripStatus(userId: string, tripId: string) {
  const trip = await getOwnedTripOrThrow(userId, tripId);
  return {
    tripId: trip.id,
    status: (trip.planningJob?.status ?? trip.status) as PlanningStatus,
    progress: trip.planningJob?.progress ?? createInitialProgress(),
    providerNotes: trip.planningJob?.providerNotes ?? [],
    error: trip.planningJob?.error,
  };
}

export async function deleteTrip(userId: string, tripId: string) {
  const trip = await getOwnedTripOrThrow(userId, tripId);
  await prisma.trip.delete({ where: { id: trip.id } });
  return { deleted: true, tripId: trip.id };
}

export async function getTripResult(userId: string, tripId: string): Promise<TripResultPayload> {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId },
    relationLoadStrategy: "join",
    include: {
      preferences: true,
      planningJob: true,
      routes: { orderBy: { rank: "asc" } },
      hotels: true,
      attractions: true,
      restaurants: true,
      weather: { orderBy: { date: "asc" } },
      budgetBreakdown: true,
      itinerary: {
        include: {
          days: {
            orderBy: { dayNumber: "asc" },
            include: { activities: { orderBy: { time: "asc" } } },
          },
        },
      },
    },
  });

  if (!trip || !trip.preferences) {
    throw new ApiError(404, "Trip result not found");
  }

  const routes = trip.routes.map((route) => route.data as unknown as TripResultPayload["alternativeRoutes"][number]);
  const recommendedRoute = routes[0];
  const selectedHotelRecord = trip.hotels.find((hotel) => hotel.selected) ?? trip.hotels[0];
  const selectedHotel = selectedHotelRecord?.data as TripResultPayload["hotel"] | undefined;
  const selectedAttractions = trip.attractions
    .filter((attraction) => attraction.selected)
    .map((attraction) => attraction.data as unknown as TripResultPayload["attractions"][number]);
  const selectedRestaurants = trip.restaurants
    .filter((restaurant) => restaurant.selected)
    .map((restaurant) => restaurant.data as unknown as TripResultPayload["restaurants"][number]);
  const weather = trip.weather.map((weatherItem) => weatherItem.data as unknown as TripResultPayload["weather"][number]);

  return {
    trip: {
      id: trip.id,
      origin: trip.origin,
      destination: trip.destination,
      departureDate: toDateOnly(trip.departureDate),
      returnDate: toDateOnly(trip.returnDate),
      travelers: trip.travelers,
      budget: trip.budget,
      status: trip.status,
      preferences: {
        origin: trip.origin,
        destination: trip.destination,
        departureDate: toDateOnly(trip.departureDate),
        returnDate: toDateOnly(trip.returnDate),
        travelers: trip.travelers,
        budget: trip.budget,
        travelStyle: trip.preferences.travelStyle,
        preferredTransport: trip.preferences.preferredTransport as TripResultPayload["trip"]["preferences"]["preferredTransport"],
        interests: trip.preferences.interests as TripResultPayload["trip"]["preferences"]["interests"],
        foodPreference: trip.preferences.foodPreference,
        accommodationPreference: trip.preferences.accommodationPreference,
      },
    },
    ...(recommendedRoute ? { recommendedRoute } : {}),
    alternativeRoutes: routes.slice(1),
    ...(selectedHotel ? { hotel: selectedHotel } : {}),
    attractions:
      selectedAttractions.length > 0
        ? selectedAttractions
        : trip.attractions.map((attraction) => attraction.data as unknown as TripResultPayload["attractions"][number]),
    restaurants:
      selectedRestaurants.length > 0
        ? selectedRestaurants
        : trip.restaurants.map((restaurant) => restaurant.data as unknown as TripResultPayload["restaurants"][number]),
    weather,
    ...(trip.budgetBreakdown
      ? {
          budget: {
            transport: trip.budgetBreakdown.transport,
            accommodation: trip.budgetBreakdown.accommodation,
            food: trip.budgetBreakdown.food,
            activities: trip.budgetBreakdown.activities,
            localTransport: trip.budgetBreakdown.localTransport,
            miscellaneous: trip.budgetBreakdown.miscellaneous,
            totalEstimatedCost: trip.budgetBreakdown.totalEstimatedCost,
            userBudget: trip.budgetBreakdown.userBudget,
            remainingBudget: trip.budgetBreakdown.remainingBudget,
            budgetPercentageUsed: trip.budgetBreakdown.budgetPercentageUsed,
            isWithinBudget: trip.budgetBreakdown.isWithinBudget,
          },
        }
      : {}),
    ...(trip.itinerary
      ? {
          itinerary: {
            recommendation: trip.itinerary.recommendation,
            reason: trip.itinerary.reason,
            itinerary: trip.itinerary.days.map((day) => {
              const dayWeather = weather.find((item) => item.date === toDateOnly(day.date));
              return {
                dayNumber: day.dayNumber,
                date: toDateOnly(day.date),
                summary: day.summary,
                ...(dayWeather ? { weather: dayWeather } : {}),
                activities: day.activities.map((activity) => ({
                  id: activity.id,
                  time: activity.time,
                  title: activity.title,
                  category: activity.category as NonNullable<TripResultPayload["itinerary"]>["itinerary"][number]["activities"][number]["category"],
                  ...(activity.locationName ? { locationName: activity.locationName } : {}),
                  durationMinutes: activity.durationMinutes,
                  estimatedCost: activity.estimatedCost,
                  ...(activity.travelTimeMinutes !== null ? { travelTimeMinutes: activity.travelTimeMinutes } : {}),
                  ...(activity.notes ? { notes: activity.notes } : {}),
                })),
              };
            }),
          },
        }
      : {}),
    providerMessages: trip.planningJob?.providerNotes ?? [],
  };
}

export async function getTripResource<TResource extends keyof Pick<
  TripResultPayload,
  "alternativeRoutes" | "attractions" | "restaurants" | "weather"
>>(userId: string, tripId: string, resource: TResource): Promise<TripResultPayload[TResource]> {
  const result = await getTripResult(userId, tripId);
  return result[resource];
}
