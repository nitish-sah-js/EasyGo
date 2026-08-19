import type {
  Coordinates,
  LocationPoint,
  MockTransportRecord,
  TransportMode,
  TransportOption,
} from "./domain";

export const MIN_TRANSFER_MINUTES_DEFAULT = 90;

export const CITY_COORDINATES = {
  Patna: { latitude: 25.5941, longitude: 85.1376, aliases: ["PAT", "PNBE", "Patna"] },
  Goa: { latitude: 15.2993, longitude: 74.124, aliases: ["GOI", "MAO", "Madgaon", "Goa"] },
  Delhi: { latitude: 28.6139, longitude: 77.209, aliases: ["DEL", "NDLS", "Delhi"] },
  Mumbai: { latitude: 19.076, longitude: 72.8777, aliases: ["BOM", "BCT", "Mumbai"] },
  Bengaluru: { latitude: 12.9716, longitude: 77.5946, aliases: ["BLR", "SBC", "Bengaluru", "Bangalore"] },
  Kolkata: { latitude: 22.5726, longitude: 88.3639, aliases: ["CCU", "HWH", "Kolkata"] },
  Jaipur: { latitude: 26.9124, longitude: 75.7873, aliases: ["JAI", "JP", "Jaipur"] },
  Varanasi: { latitude: 25.3176, longitude: 82.9739, aliases: ["VNS", "BSB", "Varanasi"] },
} as const;

export type SupportedCity = keyof typeof CITY_COORDINATES;

export function resolveCityName(input: string): SupportedCity | undefined {
  const normalized = input.trim().toLowerCase();
  const entries = Object.entries(CITY_COORDINATES) as Array<
    [SupportedCity, (typeof CITY_COORDINATES)[SupportedCity]]
  >;

  return entries.find(([city, value]) => {
    const aliases = [city, ...value.aliases].map((alias) => alias.toLowerCase());
    return aliases.includes(normalized);
  })?.[0];
}

export function normalizeCity(input: string): string {
  return resolveCityName(input) ?? input.trim();
}

export function createLocation(city: SupportedCity, code: string, name: string): LocationPoint {
  const coords = CITY_COORDINATES[city];
  return {
    code,
    name,
    city,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

export function locationsMatch(input: string, location: LocationPoint): boolean {
  const inputCity = resolveCityName(input);
  if (inputCity && location.city === inputCity) {
    return true;
  }

  const normalized = input.trim().toLowerCase();
  return [location.code, location.name, location.city]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase() === normalized);
}

export function cityMatches(city: string, input: string): boolean {
  const resolved = resolveCityName(input);
  return resolved ? city === resolved : city.toLowerCase() === input.trim().toLowerCase();
}

function parseDateParts(date: string): { year: number; month: number; day: number } {
  const [yearRaw, monthRaw, dayRaw] = date.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!year || !month || !day) {
    throw new Error(`Invalid ISO date: ${date}`);
  }

  return { year, month, day };
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDateParts(date);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function dateDifferenceInDays(startDate: string, endDate: string): number {
  const start = parseDateParts(startDate);
  const end = parseDateParts(endDate);
  const startMs = Date.UTC(start.year, start.month - 1, start.day);
  const endMs = Date.UTC(end.year, end.month - 1, end.day);
  return Math.max(1, Math.round((endMs - startMs) / 86_400_000));
}

export function tripDateRange(startDate: string, endDate: string): string[] {
  const dayCount = dateDifferenceInDays(startDate, endDate);
  return Array.from({ length: dayCount }, (_, index) => addDays(startDate, index));
}

export function isoAtIndiaClock(date: string, clock: string, dayOffset = 0): string {
  const scheduledDate = addDays(date, dayOffset);
  return new Date(`${scheduledDate}T${clock}:00+05:30`).toISOString();
}

export function addMinutesToIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

export function materializeTransportRecord(
  record: MockTransportRecord,
  departureDate: string,
  dayOffset = 0,
): TransportOption {
  const departureTime = isoAtIndiaClock(departureDate, record.departureClock, dayOffset);
  const arrivalTime = addMinutesToIso(departureTime, record.durationMinutes);

  return {
    id: record.id,
    provider: record.provider,
    mode: record.mode,
    origin: record.origin,
    destination: record.destination,
    departureTime,
    arrivalTime,
    durationMinutes: record.durationMinutes,
    price: record.price,
    currency: record.currency,
    stops: record.stops,
    ...(record.operator !== undefined ? { operator: record.operator } : {}),
    ...(record.serviceNumber !== undefined ? { serviceNumber: record.serviceNumber } : {}),
    ...(record.vehicleType !== undefined ? { vehicleType: record.vehicleType } : {}),
    segments: [
      {
        origin: record.origin,
        destination: record.destination,
        departureTime,
        arrivalTime,
        mode: record.mode,
        ...(record.operator !== undefined ? { operator: record.operator } : {}),
        ...(record.serviceNumber !== undefined ? { serviceNumber: record.serviceNumber } : {}),
      },
    ],
    source: "MOCK",
    fetchedAt: isoAtIndiaClock(departureDate, "05:00"),
    ...(record.amenities !== undefined ? { amenities: record.amenities } : {}),
    ...(record.metadata !== undefined ? { metadata: record.metadata } : {}),
  };
}

export function shiftTransportOptionToDeparture(option: TransportOption, departureIso: string) {
  const arrivalTime = addMinutesToIso(departureIso, option.durationMinutes);
  return {
    ...option,
    id: `${option.id}-${departureIso.slice(0, 10)}`,
    departureTime: departureIso,
    arrivalTime,
    segments: option.segments.map((segment) => ({
      ...segment,
      departureTime: departureIso,
      arrivalTime,
    })),
  };
}

export function nextFeasibleDeparture(option: TransportOption, earliestIso: string): string {
  let candidate = option.departureTime;

  while (new Date(candidate).getTime() < new Date(earliestIso).getTime()) {
    candidate = addMinutesToIso(candidate, 1_440);
  }

  return candidate;
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function stableHash(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function deterministicNumber(seed: string, min: number, max: number): number {
  const range = max - min + 1;
  return min + (stableHash(seed) % range);
}

export function haversineDistanceKm(origin: Coordinates, destination: Coordinates): number {
  const radiusKm = 6_371;
  const latDelta = toRadians(destination.latitude - origin.latitude);
  const lonDelta = toRadians(destination.longitude - origin.longitude);
  const originLat = toRadians(origin.latitude);
  const destinationLat = toRadians(destination.latitude);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(lonDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(radiusKm * c * 10) / 10;
}

export function modeComfortScore(mode: TransportMode): number {
  if (mode === "FLIGHT") {
    return 95;
  }
  if (mode === "TRAIN") {
    return 76;
  }
  return 58;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
