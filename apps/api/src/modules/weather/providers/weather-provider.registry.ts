import type { WeatherProvider } from "./weather-provider.interface";
import { CachedWeatherProvider } from "./cached-weather.provider";
import { OpenMeteoWeatherProvider } from "./open-meteo-weather.provider";

export function getWeatherProvider(): WeatherProvider {
  return new CachedWeatherProvider(new OpenMeteoWeatherProvider());
}
