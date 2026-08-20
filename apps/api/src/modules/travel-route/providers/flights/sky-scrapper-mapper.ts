import type { LocationPoint, TransportOption, TransportSegment } from "@nexttour/shared";

export interface ResolvedAirport {
  skyId: string;
  entityId: string;
  name: string;
}

/**
 * The Sky Scrapper RapidAPI response shape isn't documented in Project B beyond a
 * reduced CLI summary, so this reads several plausible field paths defensively and
 * skips anything it can't confidently parse instead of throwing mid-batch.
 */
function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

export function parseAirportSearchResponse(payload: unknown, preferAirport = true): ResolvedAirport | undefined {
  const record = payload as Record<string, unknown> | null;
  const items = (record?.data as unknown[]) ?? (record?.results as unknown[]) ?? [];
  if (!Array.isArray(items) || items.length === 0) return undefined;

  const candidates = items as Record<string, unknown>[];
  const ranked = preferAirport
    ? [
        ...candidates.filter((item) => {
          const navigation = item.navigation as Record<string, unknown> | undefined;
          return navigation?.entityType === "AIRPORT" || item.entityType === "AIRPORT" || item.type === "AIRPORT";
        }),
        ...candidates,
      ]
    : candidates;

  for (const item of ranked) {
    const navigation = item.navigation as Record<string, unknown> | undefined;
    const relevantParams = navigation?.relevantFlightParams as Record<string, unknown> | undefined;
    const presentation = item.presentation as Record<string, unknown> | undefined;

    const skyId = firstString(relevantParams?.skyId, item.skyId, navigation?.skyId);
    const entityId = firstString(relevantParams?.entityId, item.entityId, navigation?.entityId);
    const name = firstString(
      relevantParams?.localizedName,
      navigation?.localizedName,
      presentation?.title,
      item.name,
    );

    if (skyId && entityId && name) {
      return { skyId, entityId, name };
    }
  }

  return undefined;
}

export interface ParsedFlightItinerary {
  id: string;
  price: number;
  origin: LocationPoint;
  destination: LocationPoint;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  operator?: string;
  segments: TransportSegment[];
}

function toLocationPoint(place: Record<string, unknown> | undefined, fallbackName: string): LocationPoint {
  const name = firstString(place?.name, place?.displayCode, fallbackName) ?? fallbackName;
  const code = firstString(place?.displayCode, place?.id);
  const city = firstString(place?.city, place?.parent && (place.parent as Record<string, unknown>).name);
  return {
    name,
    ...(code !== undefined ? { code } : {}),
    ...(city !== undefined ? { city } : {}),
  };
}

export function parseFlightSearchResponse(
  payload: unknown,
  context: { originName: string; destinationName: string; departureDate: string },
): ParsedFlightItinerary[] {
  const record = payload as Record<string, unknown> | null;
  const data = record?.data as Record<string, unknown> | undefined;
  const itineraries = (data?.itineraries as unknown[]) ?? (record?.itineraries as unknown[]) ?? [];
  if (!Array.isArray(itineraries)) return [];

  const parsed: ParsedFlightItinerary[] = [];

  for (const raw of itineraries) {
    const itinerary = raw as Record<string, unknown>;
    const legs = (itinerary.legs as Record<string, unknown>[]) ?? [];
    const leg = legs[0];
    if (!leg) continue;

    const price = firstNumber(
      (itinerary.price as Record<string, unknown> | undefined)?.raw,
      (itinerary.price as Record<string, unknown> | undefined)?.formatted,
      itinerary.price,
    );
    const departureTime = firstString(leg.departure, leg.departureTime);
    const arrivalTime = firstString(leg.arrival, leg.arrivalTime);
    const durationMinutes = firstNumber(leg.durationInMinutes, leg.duration);
    if (price === undefined || !departureTime || !arrivalTime || durationMinutes === undefined) continue;

    const origin = toLocationPoint(leg.origin as Record<string, unknown> | undefined, context.originName);
    const destination = toLocationPoint(leg.destination as Record<string, unknown> | undefined, context.destinationName);
    const carriers = leg.carriers as Record<string, unknown> | undefined;
    const marketing = (carriers?.marketing as Record<string, unknown>[]) ?? [];
    const operator = firstString(marketing[0]?.name);
    const stops = firstNumber(leg.stopCount) ?? 0;
    const legId = firstString(leg.id, itinerary.id) ?? `${context.originName}-${context.destinationName}-${parsed.length}`;

    const rawSegments = leg.segments as Record<string, unknown>[] | undefined;
    const segments: TransportSegment[] =
      rawSegments && rawSegments.length > 0
        ? rawSegments
            .map((segment) => {
              const segmentDeparture = firstString(segment.departure, segment.departureTime);
              const segmentArrival = firstString(segment.arrival, segment.arrivalTime);
              if (!segmentDeparture || !segmentArrival) return undefined;
              const segmentOperator = firstString(
                (segment.marketingCarrier as Record<string, unknown> | undefined)?.name,
                operator,
              );
              return {
                origin: toLocationPoint(segment.origin as Record<string, unknown> | undefined, origin.name),
                destination: toLocationPoint(segment.destination as Record<string, unknown> | undefined, destination.name),
                departureTime: segmentDeparture,
                arrivalTime: segmentArrival,
                mode: "FLIGHT" as const,
                ...(segmentOperator !== undefined ? { operator: segmentOperator } : {}),
              };
            })
            .filter((segment): segment is NonNullable<typeof segment> => segment !== undefined)
        : [];

    parsed.push({
      id: legId,
      price,
      origin,
      destination,
      departureTime,
      arrivalTime,
      durationMinutes,
      stops,
      ...(operator !== undefined ? { operator } : {}),
      segments:
        segments.length > 0
          ? segments
          : [
              {
                origin,
                destination,
                departureTime,
                arrivalTime,
                mode: "FLIGHT" as const,
                ...(operator !== undefined ? { operator } : {}),
              },
            ],
    });
  }

  return parsed;
}

export function toTransportOption(
  itinerary: ParsedFlightItinerary,
  provider: string,
  fetchedAt: string,
): TransportOption {
  return {
    id: `sky-scrapper-${itinerary.id}`,
    provider,
    mode: "FLIGHT",
    origin: itinerary.origin,
    destination: itinerary.destination,
    departureTime: itinerary.departureTime,
    arrivalTime: itinerary.arrivalTime,
    durationMinutes: itinerary.durationMinutes,
    price: itinerary.price,
    currency: "INR",
    stops: itinerary.stops,
    ...(itinerary.operator !== undefined ? { operator: itinerary.operator } : {}),
    segments: itinerary.segments,
    source: "REAL",
    fetchedAt,
  };
}
