import type { WeatherProvider } from "./weather-provider.interface";
import { OpenMeteoWeatherProvider } from "./open-meteo-weather.provider";

export function getWeatherProvider(): WeatherProvider {
  return new OpenMeteoWeatherProvider();
}
