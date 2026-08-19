import {
  modeComfortScore,
  type RouteOption,
  type TravelStyle,
} from "@nexttour/shared";

interface Weights {
  price: number;
  duration: number;
  comfort: number;
  transfer: number;
}

function weightsForStyle(style: TravelStyle): Weights {
  if (style === "BUDGET") {
    return { price: 0.55, duration: 0.2, comfort: 0.15, transfer: 0.1 };
  }
  if (style === "COMFORT" || style === "LUXURY") {
    return { price: 0.25, duration: 0.3, comfort: 0.35, transfer: 0.1 };
  }
  return { price: 0.4, duration: 0.3, comfort: 0.2, transfer: 0.1 };
}

function normalizedScore(value: number, min: number, max: number): number {
  if (max === min) {
    return 100;
  }
  return 100 - ((value - min) / (max - min)) * 100;
}

function comfortScore(route: RouteOption): number {
  const modeScore =
    route.segments.reduce((total, segment) => total + modeComfortScore(segment.mode), 0) /
    route.segments.length;
  const sleeperBonus = route.segments.some((segment) => segment.vehicleType?.toLowerCase().includes("sleeper"))
    ? 4
    : 0;
  return Math.max(0, Math.min(100, modeScore + sleeperBonus - route.transferCount * 6));
}

function reasonFor(route: RouteOption): string {
  const modes = route.modes.join(" + ");
  if (route.label === "CHEAPEST") {
    return `${modes} keeps the transport spend lowest while preserving feasible transfer windows.`;
  }
  if (route.label === "FASTEST") {
    return `${modes} is the quickest route found for the selected date.`;
  }
  if (route.label === "COMFORTABLE") {
    return `${modes} favors fewer difficult legs and higher-comfort transport.`;
  }
  if (route.label === "BALANCED") {
    return `${modes} balances fare, total journey time, comfort, and transfer count.`;
  }
  return `${modes} is a feasible alternative that matches your transport preferences.`;
}

export function optimizeRoutes(
  routes: RouteOption[],
  request: { travelStyle: TravelStyle },
): RouteOption[] {
  if (routes.length === 0) {
    return [];
  }

  const weights = weightsForStyle(request.travelStyle);
  const prices = routes.map((route) => route.totalPrice);
  const durations = routes.map((route) => route.totalDurationMinutes);
  const transfers = routes.map((route) => route.transferCount);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const minTransfers = Math.min(...transfers);
  const maxTransfers = Math.max(...transfers);

  const scored = routes.map((route) => {
    const priceScore = normalizedScore(route.totalPrice, minPrice, maxPrice);
    const durationScore = normalizedScore(route.totalDurationMinutes, minDuration, maxDuration);
    const transferScore = normalizedScore(route.transferCount, minTransfers, maxTransfers);
    const score =
      priceScore * weights.price +
      durationScore * weights.duration +
      comfortScore(route) * weights.comfort +
      transferScore * weights.transfer;

    return { ...route, score: Math.round(score * 10) / 10 };
  });

  const cheapest = [...scored].sort((left, right) => left.totalPrice - right.totalPrice)[0];
  const fastest = [...scored].sort(
    (left, right) => left.totalDurationMinutes - right.totalDurationMinutes,
  )[0];
  const balanced = [...scored].sort((left, right) => right.score - left.score)[0];
  const comfortable = [...scored].sort((left, right) => comfortScore(right) - comfortScore(left))[0];

  const byId = new Map<string, RouteOption>();
  const winners: Array<[RouteOption, "CHEAPEST" | "FASTEST" | "BALANCED" | "COMFORTABLE"]> = [];
  if (cheapest) winners.push([cheapest, "CHEAPEST"]);
  if (fastest) winners.push([fastest, "FASTEST"]);
  if (balanced) winners.push([balanced, "BALANCED"]);
  if (comfortable) winners.push([comfortable, "COMFORTABLE"]);

  for (const [route, label] of winners) {
    byId.set(route.id, { ...route, label, recommendationReason: reasonFor(route) });
  }

  for (const route of [...scored].sort((left, right) => right.score - left.score)) {
    if (byId.size >= 5) {
      break;
    }
    if (!byId.has(route.id)) {
      byId.set(route.id, { ...route, label: "ALTERNATIVE", recommendationReason: reasonFor(route) });
    }
  }

  return [...byId.values()].sort((left, right) => right.score - left.score);
}
