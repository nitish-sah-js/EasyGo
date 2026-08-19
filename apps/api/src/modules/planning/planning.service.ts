import type { Prisma } from "@prisma/client";
import {
  dateDifferenceInDays,
  tripDateRange,
  type PlanningProgressStep,
  type ProviderResult,
  type RouteOption,
  type TransportMode,
  type TransportOption,
  type TravelStyle,
  type TripPlanningRequest,
  type WeatherData,
} from "@nexttour/shared";
import { env } from "../../config/env";
import { toJson } from "../../lib/json";
import { prisma } from "../../lib/prisma";
import { createAIProvider } from "../ai/ai.service";
import { BudgetService } from "../budget/budget.service";
import { getMapProvider } from "../maps/providers/map-provider.registry";
import { getAttractionProvider } from "../places/providers/places-provider.registry";
import { getHotelProvider } from "../places/providers/places-provider.registry";
import { getRestaurantProvider } from "../places/providers/places-provider.registry";
import { getTransportProviders } from "../travel-route/providers/transport-provider.registry";
import type { TransportProvider } from "../travel-route/providers/transport-provider.interface";
import { buildRouteOptions } from "../travel-route/services/route-builder.service";
import { optimizeRoutes } from "../travel-route/services/route-optimizer.service";
import { getWeatherProvider } from "../weather/providers/weather-provider.registry";
import { createInitialProgress, markProgress } from "./progress";
import {
  createFallbackAttraction,
  createFallbackHotel,
  createFallbackRestaurant,
  createFallbackRoute,
} from "./fallbacks";

export {
  createFallbackAttraction,
  createFallbackHotel,
  createFallbackRestaurant,
  createFallbackRoute,
} from "./fallbacks";

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toPrismaDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function preferenceRequestFromTrip(trip: {
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate: Date;
  travelers: number;
  budget: number;
  preferences: {
    travelStyle: TravelStyle;
    preferredTransport: string[];
    interests: string[];
    foodPreference: TripPlanningRequest["foodPreference"];
    accommodationPreference: TripPlanningRequest["accommodationPreference"];
  } | null;
}): TripPlanningRequest {
  if (!trip.preferences) {
    throw new Error("Trip preferences are missing");
  }

  return {
    origin: trip.origin,
    destination: trip.destination,
    departureDate: toDateOnly(trip.departureDate),
    returnDate: toDateOnly(trip.returnDate),
    travelers: trip.travelers,
    budget: trip.budget,
    travelStyle: trip.preferences.travelStyle,
    preferredTransport: trip.preferences.preferredTransport as TransportMode[],
    interests: trip.preferences.interests as TripPlanningRequest["interests"],
    foodPreference: trip.preferences.foodPreference,
    accommodationPreference: trip.preferences.accommodationPreference,
  };
}

async function collectProvider<T>(provider: string, task: () => Promise<T[]>): Promise<ProviderResult<T>> {
  try {
    return { provider, status: "SUCCESS", data: await task() };
  } catch (error) {
    return {
      provider,
      status: "FAILED",
      data: [],
      error: error instanceof Error ? error.message : "Provider failed",
    };
  }
}

function providerNotes(results: Array<ProviderResult<unknown>>): string[] {
  return results
    .filter((result) => result.status === "FAILED")
    .map((result) => `${result.provider}: ${result.error ?? "Unavailable"}`);
}

async function updateProgress(
  tripId: string,
  progress: PlanningProgressStep[],
  key: PlanningProgressStep["key"],
  status: PlanningProgressStep["status"],
) {
  const nextProgress = markProgress(progress, key, status);
  await prisma.planningJob.upsert({
    where: { tripId },
    update: { progress: toJson(nextProgress) },
    create: {
      tripId,
      status: "PROCESSING",
      progress: toJson(nextProgress),
      providerNotes: [],
      startedAt: new Date(),
    },
  });
  return nextProgress;
}

export class PlanningService {
  private readonly transportProviders: TransportProvider[] = getTransportProviders();

  private readonly hotelProvider = getHotelProvider();
  private readonly attractionProvider = getAttractionProvider();
  private readonly restaurantProvider = getRestaurantProvider();
  private readonly weatherProvider = getWeatherProvider();
  private readonly mapProvider = getMapProvider();
  private readonly aiProvider = createAIProvider();
  private readonly budgetService = new BudgetService();

  async planTrip(tripId: string): Promise<void> {
    let progress = createInitialProgress();

    await prisma.trip.update({ where: { id: tripId }, data: { status: "PROCESSING" } });
    await prisma.planningJob.upsert({
      where: { tripId },
      update: { status: "PROCESSING", progress: toJson(progress), providerNotes: [], startedAt: new Date() },
      create: {
        tripId,
        status: "PROCESSING",
        progress: toJson(progress),
        providerNotes: [],
        startedAt: new Date(),
      },
    });

    try {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { preferences: true },
      });

      if (!trip) {
        throw new Error("Trip not found");
      }

      progress = await updateProgress(tripId, progress, "preferences", "PROCESSING");
      const request = preferenceRequestFromTrip(trip);
      progress = await updateProgress(tripId, progress, "preferences", "COMPLETED");

      const transportRequest = {
        origin: request.origin,
        destination: request.destination,
        departureDate: request.departureDate,
        travelers: request.travelers,
        preferredTransport: request.preferredTransport,
        includeNetwork: true,
      };

      progress = await updateProgress(tripId, progress, "transport", "PROCESSING");
      const transportResults = await Promise.all(
        this.transportProviders.map((provider) =>
          collectProvider(provider.name, () => provider.search(transportRequest)),
        ),
      );
      const transportOptions = transportResults.flatMap((result) => result.data);
      progress = await updateProgress(
        tripId,
        progress,
        "transport",
        transportOptions.length > 0 ? "COMPLETED" : "FAILED",
      );

      progress = await updateProgress(tripId, progress, "hotels", "PROCESSING");
      const hotelResult = await collectProvider(this.hotelProvider.name, () =>
        this.hotelProvider.search(request.destination, request),
      );
      const hotels = hotelResult.data.length > 0 ? hotelResult.data : [createFallbackHotel(request.destination)];
      progress = await updateProgress(tripId, progress, "hotels", "COMPLETED");

      progress = await updateProgress(tripId, progress, "attractions", "PROCESSING");
      const attractionResult = await collectProvider(this.attractionProvider.name, () =>
        this.attractionProvider.search(request.destination, request),
      );
      const attractions =
        attractionResult.data.length > 0 ? attractionResult.data : [createFallbackAttraction(request.destination)];
      progress = await updateProgress(tripId, progress, "attractions", "COMPLETED");

      progress = await updateProgress(tripId, progress, "restaurants", "PROCESSING");
      const restaurantResult = await collectProvider(this.restaurantProvider.name, () =>
        this.restaurantProvider.search(request.destination, request),
      );
      const restaurants =
        restaurantResult.data.length > 0 ? restaurantResult.data : [createFallbackRestaurant(request.destination)];
      progress = await updateProgress(tripId, progress, "restaurants", "COMPLETED");

      progress = await updateProgress(tripId, progress, "weather", "PROCESSING");
      const weatherResult = await collectProvider(this.weatherProvider.name, () =>
        this.weatherProvider.getForecast(request.destination, tripDateRange(request.departureDate, request.returnDate)),
      );
      const weather = weatherResult.data;
      progress = await updateProgress(tripId, progress, "weather", "COMPLETED");

      progress = await updateProgress(tripId, progress, "routes", "PROCESSING");
      const routeCandidates = buildRouteOptions(transportOptions, request, env.MIN_TRANSFER_MINUTES);
      const routeOptions = optimizeRoutes(routeCandidates, request);
      const plannedRoutes = routeOptions.length > 0 ? routeOptions : [createFallbackRoute(request)];
      const selectedRoute = plannedRoutes[0] ?? createFallbackRoute(request);
      progress = await updateProgress(tripId, progress, "routes", "COMPLETED");

      const selectedHotel = hotels[0] ?? createFallbackHotel(request.destination);
      const selectedAttractions = attractions.slice(0, Math.max(8, dateDifferenceInDays(request.departureDate, request.returnDate) * 2));
      const selectedRestaurants = restaurants.slice(0, Math.max(5, dateDifferenceInDays(request.departureDate, request.returnDate)));

      const mapDistances = await Promise.all(
        selectedAttractions.map(async (attraction) => {
          const distance = await this.mapProvider.getDistance(
            { latitude: selectedHotel.latitude, longitude: selectedHotel.longitude },
            { latitude: attraction.latitude, longitude: attraction.longitude },
          );
          return [attraction.id, distance] as const;
        }),
      );
      const mapDistancesRecord = Object.fromEntries(mapDistances);

      progress = await updateProgress(tripId, progress, "budget", "PROCESSING");
      const budget = this.budgetService.calculate(
        request,
        selectedRoute,
        selectedHotel,
        selectedAttractions,
        selectedRestaurants,
      );
      progress = await updateProgress(tripId, progress, "budget", "COMPLETED");

      progress = await updateProgress(tripId, progress, "itinerary", "PROCESSING");
      const itinerary = await this.aiProvider.generateItinerary({
        request,
        route: selectedRoute,
        hotel: selectedHotel,
        attractions: selectedAttractions,
        restaurants: selectedRestaurants,
        weather,
        budget,
        mapDistances: mapDistancesRecord,
      });
      progress = await updateProgress(tripId, progress, "itinerary", "COMPLETED");

      progress = await updateProgress(tripId, progress, "store", "PROCESSING");
      const notes = providerNotes([
        ...transportResults,
        hotelResult,
        attractionResult,
        restaurantResult,
        weatherResult,
      ]);
      if (this.aiProvider.lastFallbackReason) {
        notes.push(`AI: ${this.aiProvider.lastFallbackReason}`);
      }
      const finalStatus = notes.length > 0 ? "PARTIAL_SUCCESS" : "COMPLETED";

      await prisma.$transaction(
        async (tx) => {
          await tx.itinerary.deleteMany({ where: { tripId } });
        await tx.budgetBreakdown.deleteMany({ where: { tripId } });
        await tx.weatherData.deleteMany({ where: { tripId } });
        await tx.restaurant.deleteMany({ where: { tripId } });
        await tx.attraction.deleteMany({ where: { tripId } });
        await tx.hotel.deleteMany({ where: { tripId } });
        await tx.routeOption.deleteMany({ where: { tripId } });
        await tx.transportOption.deleteMany({ where: { tripId } });

        await tx.transportOption.createMany({
          data: transportOptions.map((option) => ({
            tripId,
            externalId: option.id,
            provider: option.provider,
            mode: option.mode,
            price: option.price,
            durationMinutes: option.durationMinutes,
            data: toJson(option),
          })),
        });

        await tx.routeOption.createMany({
          data: plannedRoutes.map((route, index) => ({
            tripId,
            externalId: route.id,
            rank: index + 1,
            label: route.label,
            isRecommended: index === 0,
            totalPrice: route.totalPrice,
            totalDurationMinutes: route.totalDurationMinutes,
            transferCount: route.transferCount,
            modes: route.modes,
            score: route.score,
            data: toJson(route),
          })),
        });

        await tx.hotel.createMany({
          data: hotels.map((hotel) => ({
            tripId,
            externalId: hotel.id,
            name: hotel.name,
            city: hotel.city,
            selected: hotel.id === selectedHotel.id,
            pricePerNight: hotel.pricePerNight,
            rating: hotel.rating,
            data: toJson(hotel),
          })),
        });

        await tx.attraction.createMany({
          data: attractions.map((attraction) => ({
            tripId,
            externalId: attraction.id,
            name: attraction.name,
            city: attraction.city,
            category: attraction.category,
            selected: selectedAttractions.some((selected) => selected.id === attraction.id),
            rating: attraction.rating,
            data: toJson(attraction),
          })),
        });

        await tx.restaurant.createMany({
          data: restaurants.map((restaurant) => ({
            tripId,
            externalId: restaurant.id,
            name: restaurant.name,
            city: restaurant.city,
            cuisine: restaurant.cuisine,
            selected: selectedRestaurants.some((selected) => selected.id === restaurant.id),
            rating: restaurant.rating,
            data: toJson(restaurant),
          })),
        });

        await tx.weatherData.createMany({
          data: weather.map((weatherItem) => ({
            tripId,
            city: weatherItem.city,
            date: toPrismaDate(weatherItem.date),
            data: toJson(weatherItem),
          })),
        });

        await tx.budgetBreakdown.create({
          data: {
            tripId,
            transport: budget.transport,
            accommodation: budget.accommodation,
            food: budget.food,
            activities: budget.activities,
            localTransport: budget.localTransport,
            miscellaneous: budget.miscellaneous,
            totalEstimatedCost: budget.totalEstimatedCost,
            userBudget: budget.userBudget,
            remainingBudget: budget.remainingBudget,
            budgetPercentageUsed: budget.budgetPercentageUsed,
            isWithinBudget: budget.isWithinBudget,
          },
        });

        await tx.itinerary.create({
          data: {
            tripId,
            recommendation: itinerary.recommendation,
            reason: itinerary.reason,
            days: {
              create: itinerary.itinerary.map((day) => ({
                dayNumber: day.dayNumber,
                date: toPrismaDate(day.date),
                summary: day.summary,
                activities: {
                  create: day.activities.map((activity) => ({
                    time: activity.time,
                    title: activity.title,
                    category: activity.category,
                    locationName: activity.locationName ?? null,
                    durationMinutes: activity.durationMinutes,
                    estimatedCost: activity.estimatedCost,
                    travelTimeMinutes: activity.travelTimeMinutes ?? null,
                    notes: activity.notes ?? null,
                  })),
                },
              })),
            },
          },
        });

        await tx.trip.update({ where: { id: tripId }, data: { status: finalStatus } });
        await tx.planningJob.update({
          where: { tripId },
          data: {
            status: finalStatus,
            progress: toJson(markProgress(progress, "store", "COMPLETED")),
            providerNotes: notes,
            completedAt: new Date(),
          },
        });
        },
        { maxWait: 30_000, timeout: 90_000 },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Planning failed";
      await prisma.trip.update({ where: { id: tripId }, data: { status: "FAILED" } });
      await prisma.planningJob.upsert({
        where: { tripId },
        update: {
          status: "FAILED",
          error: message,
          progress: toJson(progress),
          completedAt: new Date(),
        },
        create: {
          tripId,
          status: "FAILED",
          error: message,
          progress: toJson(progress),
          providerNotes: [],
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }
}

export const planningService = new PlanningService();
