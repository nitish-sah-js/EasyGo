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

export function friendlyProviderMessage(message: string): string {
  const separator = message.indexOf(":");
  if (separator < 0) return message;

  const provider = message.slice(0, separator).trim();
  const detail = message.slice(separator + 1).toLowerCase();
  const label = providerLabels[provider];
  if (!label) return message;

  if (/quota|rate limit|request limit|429/.test(detail)) {
    return `${label} is temporarily unavailable because the service limit was reached. Try again later.`;
  }

  return `${label} is temporarily unavailable. You can continue without this option or try planning again later.`;
}
