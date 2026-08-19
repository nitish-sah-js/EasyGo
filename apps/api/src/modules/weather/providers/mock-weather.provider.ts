import {
  deterministicNumber,
  normalizeCity,
  type WeatherCondition,
  type WeatherData,
} from "@nexttour/shared";
import { throwIfMockProviderDisabled } from "../../../lib/mock-failure";
import type { WeatherProvider } from "./weather-provider.interface";

export class MockWeatherProvider implements WeatherProvider {
  readonly name = "MOCK_WEATHER";

  async getForecast(city: string, dates: string[]): Promise<WeatherData[]> {
    throwIfMockProviderDisabled(this.name);
    const normalizedCity = normalizeCity(city);

    return dates.map((date) => {
      const seed = `${normalizedCity}-${date}`;
      const rainProbability = deterministicNumber(seed, normalizedCity === "Goa" ? 18 : 8, normalizedCity === "Goa" ? 72 : 48);
      const condition: WeatherCondition =
        rainProbability > 65
          ? "HEAVY_RAIN"
          : rainProbability > 45
            ? "LIGHT_RAIN"
            : rainProbability > 28
              ? "PARTLY_CLOUDY"
              : "SUNNY";

      return {
        id: `weather-${normalizedCity.toLowerCase()}-${date}`,
        city: normalizedCity,
        date,
        temperature: deterministicNumber(`${seed}-temp`, normalizedCity === "Goa" ? 26 : 22, normalizedCity === "Goa" ? 31 : 35),
        condition,
        rainProbability,
        humidity: deterministicNumber(`${seed}-humidity`, 48, 88),
        windSpeed: deterministicNumber(`${seed}-wind`, 6, 24),
        source: "MOCK",
      };
    });
  }
}
