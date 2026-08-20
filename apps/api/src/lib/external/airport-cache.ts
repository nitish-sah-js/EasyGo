import airportsSeed from "../../data/airports.json";
import { parseAirportSearchResponse, type ResolvedAirport } from "../../modules/travel-route/providers/flights/sky-scrapper-mapper";
import type { SkyScrapperClient } from "./sky-scrapper-client";

type AirportSeed = Record<string, { skyId: string; entityId: string | null; name: string }>;

const seed = airportsSeed as AirportSeed;
const runtimeCache = new Map<string, ResolvedAirport>();

export async function resolveAirport(client: SkyScrapperClient, query: string): Promise<ResolvedAirport> {
  const normalized = query.trim().toLowerCase();

  const cached = runtimeCache.get(normalized);
  if (cached) return cached;

  const seeded = seed[normalized];
  if (seeded?.skyId && seeded.entityId) {
    const resolved: ResolvedAirport = { skyId: seeded.skyId, entityId: seeded.entityId, name: seeded.name };
    runtimeCache.set(normalized, resolved);
    return resolved;
  }

  const payload = await client.searchAirport({ query });
  const resolved = parseAirportSearchResponse(payload);
  if (!resolved) {
    throw new Error(`Sky Scrapper could not resolve an airport for "${query}".`);
  }

  runtimeCache.set(normalized, resolved);
  return resolved;
}
