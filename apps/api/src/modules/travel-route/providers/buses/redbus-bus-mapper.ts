import { addMinutesToIso, isoAtIndiaClock, type LocationPoint, type TransportOption } from "@nexttour/shared";
import type { BusRouteSummary, BusSearchResult, RawBusResult } from "../../../../lib/external/redbus-bus-scraper";

/** Cap on options built from the route summary, so one route cannot flood the optimizer. */
const MAX_SUMMARY_OPTIONS = 8;

function buildOption(input: {
  id: string;
  provider: string;
  origin: LocationPoint;
  destination: LocationPoint;
  departureDate: string;
  departureClock: string;
  durationMinutes: number;
  price: number;
  operator?: string;
  vehicleType?: string;
  seatsAvailable?: number;
  fetchedAt: string;
  metadata?: Record<string, string | number | boolean>;
}): TransportOption {
  const departureTime = isoAtIndiaClock(input.departureDate, input.departureClock);
  const arrivalTime = addMinutesToIso(departureTime, input.durationMinutes);
  const metadata = {
    ...(input.metadata ?? {}),
    ...(input.seatsAvailable !== undefined ? { seatsAvailable: input.seatsAvailable } : {}),
  };

  return {
    id: input.id,
    provider: input.provider,
    mode: "BUS",
    origin: input.origin,
    destination: input.destination,
    departureTime,
    arrivalTime,
    durationMinutes: input.durationMinutes,
    price: input.price,
    currency: "INR",
    stops: 0,
    ...(input.operator !== undefined ? { operator: input.operator } : {}),
    ...(input.vehicleType !== undefined ? { vehicleType: input.vehicleType } : {}),
    segments: [
      {
        origin: input.origin,
        destination: input.destination,
        departureTime,
        arrivalTime,
        mode: "BUS",
        ...(input.operator !== undefined ? { operator: input.operator } : {}),
      },
    ],
    source: "REAL",
    fetchedAt: input.fetchedAt,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

/** Bookable departures: real operator, real clock times, real per-seat fare. */
function fromDepartures(
  departures: RawBusResult[],
  origin: LocationPoint,
  destination: LocationPoint,
  departureDate: string,
  provider: string,
  fetchedAt: string,
): TransportOption[] {
  const options: TransportOption[] = [];

  departures.forEach((bus, index) => {
    if (!bus.departure || bus.durationMinutes === null || bus.fare === null) return;

    options.push(
      buildOption({
        id: `redbus-bus-${departureDate}-${index}`,
        provider,
        origin,
        destination,
        departureDate,
        departureClock: bus.departure,
        durationMinutes: bus.durationMinutes,
        price: bus.fare,
        ...(bus.operator ? { operator: bus.operator } : {}),
        ...(bus.busType ? { vehicleType: bus.busType } : {}),
        ...(bus.seatsAvailable !== null ? { seatsAvailable: bus.seatsAvailable } : {}),
        fetchedAt,
      }),
    );
  });

  return options;
}

/**
 * Fallback for when redBus lists no bookable departures (dates beyond its booking
 * window, or a route with no live inventory) but still publishes the route summary.
 *
 * Operator names, first-departure times and durations here are real. The per-seat
 * fare is not — redBus only exposes the route's cheapest fare in this view — so every
 * option is flagged `priceEstimated` and, when the departure time is the route-level
 * first bus rather than the operator's own, `departureEstimated`.
 */
function fromSummary(
  summary: BusRouteSummary,
  origin: LocationPoint,
  destination: LocationPoint,
  departureDate: string,
  provider: string,
  fetchedAt: string,
): TransportOption[] {
  const price = summary.cheapestFare;
  if (price === null) return [];

  const fallbackDuration = summary.averageDurationMinutes;

  if (summary.operatorTimings.length > 0) {
    return summary.operatorTimings
      .filter((timing) => timing.firstBus !== null && (timing.durationMinutes ?? fallbackDuration) !== null)
      .slice(0, MAX_SUMMARY_OPTIONS)
      .map((timing, index) =>
        buildOption({
          id: `redbus-bus-${departureDate}-operator-${index}`,
          provider,
          origin,
          destination,
          departureDate,
          departureClock: timing.firstBus as string,
          durationMinutes: (timing.durationMinutes ?? fallbackDuration) as number,
          price,
          operator: timing.operator,
          fetchedAt,
          metadata: {
            priceEstimated: true,
            priceBasis: "route cheapest fare",
            ...(timing.durationMinutes === null ? { durationEstimated: true } : {}),
          },
        }),
      );
  }

  // Nothing per-operator — one route-level option from the first departure.
  if (!summary.firstBusClock || fallbackDuration === null) return [];

  return [
    buildOption({
      id: `redbus-bus-${departureDate}-route`,
      provider,
      origin,
      destination,
      departureDate,
      departureClock: summary.firstBusClock,
      durationMinutes: fallbackDuration,
      price,
      ...(summary.operatorCount ? { operator: `${summary.operatorCount} operators on this route` } : {}),
      fetchedAt,
      metadata: {
        priceEstimated: true,
        priceBasis: "route cheapest fare",
        durationEstimated: true,
        ...(summary.dailyServices ? { dailyServices: summary.dailyServices } : {}),
      },
    }),
  ];
}

export function toTransportOptions(
  result: BusSearchResult,
  origin: LocationPoint,
  destination: LocationPoint,
  departureDate: string,
  provider: string,
): TransportOption[] {
  const fetchedAt = new Date().toISOString();

  const departures = fromDepartures(result.results, origin, destination, departureDate, provider, fetchedAt);
  if (departures.length > 0) return departures;

  return result.summary
    ? fromSummary(result.summary, origin, destination, departureDate, provider, fetchedAt)
    : [];
}
