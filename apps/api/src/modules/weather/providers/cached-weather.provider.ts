import type { WeatherData } from "@nexttour/shared";
import { env } from "../../../config/env";
import { cachedProviderResult } from "../../../lib/provider-cache";
import type { WeatherProvider } from "./weather-provider.interface";

export class CachedWeatherProvider implements WeatherProvider {
  readonly name: string;

  constructor(private readonly provider: WeatherProvider) {
    this.name = provider.name;
  }

  getForecast(city: string, dates: string[]): Promise<WeatherData[]> {
    const normalizedCity = city.trim().toLowerCase();
    return cachedProviderResult(
      this.name,
      {
        keyParts: ["weather", normalizedCity, dates[0] ?? "empty", dates[dates.length - 1] ?? "empty"],
        request: {
          city: normalizedCity,
          dates: [...dates].sort(),
        },
      },
      env.WEATHER_CACHE_TTL_SECONDS,
      () => this.provider.getForecast(city, dates),
      {
        label: `weather ${city} ${dates[0] ?? "empty"} -> ${dates[dates.length - 1] ?? "empty"}`,
        liveAction: "weather API hit",
      },
    );
  }
}
