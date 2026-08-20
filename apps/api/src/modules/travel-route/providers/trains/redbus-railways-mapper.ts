import { addMinutesToIso, isoAtIndiaClock, minutesBetween, type LocationPoint, type TransportOption } from "@nexttour/shared";
import type { RailwaySearchResult, RawTrainResult } from "../../../../lib/external/redbus-railways-scraper";

/** Sanity bound: the longest scheduled Indian Railways run is a little over three days. */
const MAX_JOURNEY_MINUTES = 96 * 60;

function parseClock(raw: string): string | undefined {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)?$/i);
  if (!match) return undefined;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return undefined;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Journey length, preferring redBus's published duration.
 *
 * Diffing the two clock times only works for same-day journeys: a Patna→Goa train runs
 * roughly 40 hours, so clock arithmetic would report ~14h unless the correct number of
 * whole days is added — and the number of days is exactly what the clocks don't say.
 * The published "40h 05min" is authoritative; clock diffing is the fallback and is
 * rolled forward a day at a time until it is consistent.
 */
function resolveDuration(train: RawTrainResult, departureClock: string, arrivalClock: string | undefined): number | undefined {
  if (train.durationMinutes !== null && train.durationMinutes > 0 && train.durationMinutes <= MAX_JOURNEY_MINUTES) {
    return train.durationMinutes;
  }

  if (!arrivalClock) return undefined;

  const [departureHours = 0, departureMinutes = 0] = departureClock.split(":").map(Number);
  const [arrivalHours = 0, arrivalMinutes = 0] = arrivalClock.split(":").map(Number);
  const delta = arrivalHours * 60 + arrivalMinutes - (departureHours * 60 + departureMinutes);
  return delta > 0 ? delta : delta + 24 * 60;
}

export function toTransportOptions(
  result: RailwaySearchResult,
  origin: LocationPoint,
  destination: LocationPoint,
  departureDate: string,
  provider: string,
): TransportOption[] {
  const fetchedAt = new Date().toISOString();

  return result.results
    .filter((train): train is RawTrainResult & { trainNumber: string } => Boolean(train.trainNumber))
    .map((train) => {
      const departureClock = train.departure ? parseClock(train.departure) : undefined;
      if (!departureClock) return undefined;

      const arrivalClock = train.arrival ? parseClock(train.arrival) : undefined;
      const durationMinutes = resolveDuration(train, departureClock, arrivalClock);
      // No published duration and no arrival time means we cannot say when this train
      // gets in — better to drop it than to publish an invented arrival.
      if (durationMinutes === undefined || durationMinutes <= 0) return undefined;

      const departureTime = isoAtIndiaClock(departureDate, departureClock);
      const arrivalTime = addMinutesToIso(departureTime, durationMinutes);

      const price = train.cheapestFare;
      if (price === null || price <= 0) return undefined;

      // redBus may answer with an alternate trip from a nearby station; surface the
      // station actually served rather than implying the requested one.
      const boarding: LocationPoint = train.boardingStation
        ? { ...origin, name: train.boardingStation }
        : origin;
      const dropping: LocationPoint = train.droppingStation
        ? { ...destination, name: train.droppingStation }
        : destination;

      const classFareEntries = Object.entries(train.classFares);

      const option: TransportOption = {
        id: `redbus-train-${train.trainNumber}-${departureDate}`,
        provider,
        mode: "TRAIN",
        origin: boarding,
        destination: dropping,
        departureTime,
        arrivalTime,
        durationMinutes: minutesBetween(departureTime, arrivalTime),
        price,
        currency: "INR",
        stops: 0,
        operator: "Indian Railways",
        serviceNumber: train.trainNumber,
        ...(train.name ? { vehicleType: train.name } : {}),
        segments: [
          {
            origin: boarding,
            destination: dropping,
            departureTime,
            arrivalTime,
            mode: "TRAIN",
            operator: "Indian Railways",
            serviceNumber: train.trainNumber,
          },
        ],
        source: "REAL",
        fetchedAt,
        ...(classFareEntries.length > 0
          ? {
              metadata: {
                classes: classFareEntries.map(([cls, fare]) => `${cls}:${fare}`),
                ...(train.boardingStation && train.boardingStation !== origin.name
                  ? { alternateBoarding: train.boardingStation }
                  : {}),
              },
            }
          : {}),
      };

      return option;
    })
    .filter((option): option is TransportOption => option !== undefined);
}
