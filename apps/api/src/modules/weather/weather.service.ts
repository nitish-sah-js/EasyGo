import type { WeatherData } from "@nexttour/shared";
import { getWeatherProvider } from "./providers/weather-provider.registry";

export class WeatherService {
  private readonly provider = getWeatherProvider();

  async getForecast(city: string, dates: string[]): Promise<WeatherData[]> {
    return this.provider.getForecast(city, dates);
  }
}

export const weatherService = new WeatherService();