import {
  addMinutesToIso,
  locationsMatch,
  MIN_TRANSFER_MINUTES_DEFAULT,
  minutesBetween,
  nextFeasibleDeparture,
  normalizeCity,
  shiftTransportOptionToDeparture,
  type RouteOption,
  type TransportOption,
} from "@nexttour/shared";

function cityOf(location: { city?: string; name: string }) {
  return normalizeCity(location.city ?? location.name);
}

function routeIdFor(segments: TransportOption[]): string {
  return `route-${segments.map((segment) => segment.id).join("-")}`;
}

function createRoute(segments: TransportOption[]): RouteOption {
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];

  if (!firstSegment || !lastSegment) {
    throw new Error("Cannot create a route without transport segments");
  }

  const totalDurationMinutes = minutesBetween(firstSegment.departureTime, lastSegment.arrivalTime);
  const modes = [...new Set(segments.map((segment) => segment.mode))];

  return {
    id: routeIdFor(segments),
    segments,
    totalPrice: segments.reduce((total, segment) => total + segment.price, 0),
    totalDurationMinutes,
    transferCount: Math.max(0, segments.length - 1),
    modes,
    score: 0,
    label: "ALTERNATIVE",
  };
}

function canConnect(first: TransportOption, second: TransportOption, minimumTransferMinutes: number) {
  if (cityOf(first.destination) !== cityOf(second.origin)) {
    return undefined;
  }

  const earliestDeparture = addMinutesToIso(first.arrivalTime, minimumTransferMinutes);
  const feasibleDeparture = nextFeasibleDeparture(second, earliestDeparture);
  return shiftTransportOptionToDeparture(second, feasibleDeparture);
}

export function buildRouteOptions(
  options: TransportOption[],
  request: { origin: string; destination: string },
  minimumTransferMinutes = MIN_TRANSFER_MINUTES_DEFAULT,
): RouteOption[] {
  const directRoutes = options
    .filter((option) => locationsMatch(request.origin, option.origin))
    .filter((option) => locationsMatch(request.destination, option.destination))
    .map((option) => createRoute([option]));

  const firstLegs = options
    .filter((option) => locationsMatch(request.origin, option.origin))
    .filter((option) => !locationsMatch(request.destination, option.destination));

  const secondLegs = options.filter((option) => locationsMatch(request.destination, option.destination));

  const oneStopRoutes = firstLegs.flatMap((firstLeg) =>
    secondLegs
      .map((secondLeg) => canConnect(firstLeg, secondLeg, minimumTransferMinutes))
      .filter((secondLeg): secondLeg is TransportOption => Boolean(secondLeg))
      .map((secondLeg) => createRoute([firstLeg, secondLeg])),
  );

  const routesById = new Map<string, RouteOption>();
  for (const route of [...directRoutes, ...oneStopRoutes]) {
    const previous = routesById.get(route.id);
    if (!previous || route.totalDurationMinutes < previous.totalDurationMinutes) {
      routesById.set(route.id, route);
    }
  }

  return [...routesById.values()]
    .sort((left, right) => left.totalPrice - right.totalPrice || left.totalDurationMinutes - right.totalDurationMinutes)
    .slice(0, 30);
}
