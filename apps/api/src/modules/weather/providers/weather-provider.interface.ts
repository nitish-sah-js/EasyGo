import type { WeatherData } from "@nexttour/shared";

export interface WeatherProvider {
  readonly name: string;
  getForecast(city: string, dates: string[]): Promise<WeatherData[]>;
}
