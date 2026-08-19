import { env } from "../../../config/env";
import type { WeatherProvider } from "./weather-provider.interface";
import { MockWeatherProvider } from "./mock-weather.provider";

export function getWeatherProvider(): WeatherProvider {
  if (env.TRAVEL_DATA_MODE !== "MOCK") {
    throw new Error(
      `TRAVEL_DATA_MODE=${env.TRAVEL_DATA_MODE} is not implemented. Real weather providers are not available in this MVP.`,
    );
  }
  return new MockWeatherProvider();
}