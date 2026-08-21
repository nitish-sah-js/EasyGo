const providerLabels: Record<string, string> = {
  SKY_SCRAPPER_FLIGHTS: "Flight search",
  REDBUS_TRAINS: "Train search",
  REDBUS_BUSES: "Bus search",
  REDBUS_HOTELS: "Hotel search",
  GOOGLE_PLACES_ATTRACTIONS: "Attraction search",
  GOOGLE_PLACES_RESTAURANTS: "Restaurant search",
  OPEN_METEO: "Weather forecast",
  OPEN_METEO_WEATHER: "Weather forecast",
  AI: "Itinerary generation",
};

export function userFacingProviderMessage(provider: string, error?: string): string {
  const label = providerLabels[provider] ?? "Some travel data";
  const detail = error?.toLowerCase() ?? "";

  if (/quota|rate limit|request limit|429/.test(detail)) {
    return `${label} is temporarily unavailable because the service limit was reached. Try again later.`;
  }

  return `${label} is temporarily unavailable. You can continue without this option or try planning again later.`;
}
