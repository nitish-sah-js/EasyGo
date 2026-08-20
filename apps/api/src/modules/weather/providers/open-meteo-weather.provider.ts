import { addDays, type WeatherData } from "@nexttour/shared";
import { env } from "../../../config/env";
import { GooglePlacesClient } from "../../../lib/external/google-places-client";
import { resolveCityCenter } from "../../../lib/external/google-places-search";
import { FORECAST_HORIZON_DAYS, OpenMeteoClient } from "../../../lib/external/open-meteo-client";
import { toWeatherData } from "../../../lib/external/open-meteo-mapper";
import { withTimeout } from "../../../lib/with-timeout";
import type { WeatherProvider } from "./weather-provider.interface";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  readonly name = "OPEN_METEO_WEATHER";

  private readonly client = new OpenMeteoClient();
  private readonly placesClient = new GooglePlacesClient();

  async getForecast(city: string, dates: string[]): Promise<WeatherData[]> {
    if (dates.length === 0) return [];
    return withTimeout(this.fetchForecast(city, dates), env.EXTERNAL_API_TIMEOUT_MS * 3, this.name);
  }

  private async fetchForecast(city: string, dates: string[]): Promise<WeatherData[]> {
    const sorted = [...dates].sort();
    const today = todayIso();
    const horizonEnd = addDays(today, FORECAST_HORIZON_DAYS);

    // Open-Meteo rejects the whole request if the range runs past its horizon, so
    // clamp it and let the mapper return only the days actually covered.
    const inRange = sorted.filter((date) => date >= today && date <= horizonEnd);
    if (inRange.length === 0) {
      throw new Error(
        `Trip dates ${sorted[0]}–${sorted[sorted.length - 1]} are outside Open-Meteo's ${FORECAST_HORIZON_DAYS}-day forecast horizon.`,
      );
    }

    const center = await this.resolveCoordinates(city);
    const forecast = await this.client.getForecast({
      latitude: center.latitude,
      longitude: center.longitude,
      startDate: inRange[0] as string,
      endDate: inRange[inRange.length - 1] as string,
    });

    return toWeatherData(forecast, center.name, inRange);
  }

  /**
   * Google Places resolves "Goa" to the state; Open-Meteo's settlement-name geocoder
   * resolves it to an unrelated village. Google is therefore primary, with the keyless
   * Open-Meteo geocoder as a fallback for when the Places key is missing or failing.
   */
  private async resolveCoordinates(city: string): Promise<{ latitude: number; longitude: number; name: string }> {
    try {
      return await resolveCityCenter(this.placesClient, city);
    } catch (placesError) {
      const geocoded = await this.client.geocode(city);
      if (geocoded) return geocoded;
      throw new Error(
        `Could not resolve coordinates for "${city}": ${(placesError as Error).message}`,
      );
    }
  }
}
