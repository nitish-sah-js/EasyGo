import {
  type ProviderResult,
  type RouteOption,
  type TransportOption,
  type TransportSearchRequest,
  type TripPlanningRequest,
} from "@nexttour/shared";
import { env } from "../../config/env";
import { getTransportProviders } from "./providers/transport-provider.registry";
import { buildRouteOptions } from "./services/route-builder.service";
import { optimizeRoutes } from "./services/route-optimizer.service";

export interface TravelRouteSearchResult {
  transportOptions: TransportOption[];
  routes: RouteOption[];
  notes: string[];
}

async function collectProvider(
  provider: { name: string; search(request: TransportSearchRequest): Promise<TransportOption[]> },
  request: TransportSearchRequest,
): Promise<ProviderResult<TransportOption>> {
  try {
    return { provider: provider.name, status: "SUCCESS", data: await provider.search(request) };
  } catch (error) {
    return {
      provider: provider.name,
      status: "FAILED",
      data: [],
      error: error instanceof Error ? error.message : "Provider failed",
    };
  }
}

export class TravelRouteService {
  async search(request: TransportSearchRequest & { travelStyle?: TripPlanningRequest["travelStyle"] }): Promise<TravelRouteSearchResult> {
    const providers = getTransportProviders();
    const results = await Promise.all(
      providers.map((provider) => collectProvider(provider, request)),
    );
    const transportOptions = results.flatMap((result) => result.data);
    const routes = optimizeRoutes(
      buildRouteOptions(transportOptions, request, env.MIN_TRANSFER_MINUTES),
      { travelStyle: request.travelStyle ?? "BALANCED" },
    );
    const notes = results
      .filter((result) => result.status === "FAILED")
      .map((result) => `${result.provider}: ${result.error ?? "Unavailable"}`);

    return { transportOptions, routes, notes };
  }
}

export const travelRouteService = new TravelRouteService();