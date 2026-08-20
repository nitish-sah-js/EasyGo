import type { WeatherCondition, WeatherData } from "@nexttour/shared";
import type { OpenMeteoForecast } from "./open-meteo-client";

/**
 * WMO 4677 weather codes as published by Open-Meteo, collapsed onto the five
 * conditions Project A's `WeatherCondition` union supports.
 * Reference: https://open-meteo.com/en/docs (Weather variable documentation)
 */
export function toWeatherCondition(code: number | null | undefined): WeatherCondition {
  if (code === null || code === undefined) return "PARTLY_CLOUDY";

  // 0 clear, 1 mainly clear
  if (code <= 1) return "SUNNY";
  // 2 partly cloudy
  if (code === 2) return "PARTLY_CLOUDY";
  // 3 overcast, 45/48 fog
  if (code === 3 || code === 45 || code === 48) return "CLOUDY";
  // 51-55 drizzle, 56/57 freezing drizzle, 61 slight rain, 66 freezing rain,
  // 71-77 snow, 80 slight showers, 85 slight snow showers
  if ((code >= 51 && code <= 61) || code === 66 || (code >= 71 && code <= 77) || code === 80 || code === 85) {
    return "LIGHT_RAIN";
  }
  // 63/65 moderate+heavy rain, 67 heavy freezing rain, 81/82 heavy showers,
  // 86 heavy snow showers, 95/96/99 thunderstorm
  return "HEAVY_RAIN";
}

function averageHumidityForDate(forecast: OpenMeteoForecast, date: string): number | undefined {
  const times = forecast.hourly?.time;
  const values = forecast.hourly?.relative_humidity_2m;
  if (!times || !values) return undefined;

  let total = 0;
  let count = 0;
  for (let index = 0; index < times.length; index += 1) {
    const value = values[index];
    if (times[index]?.startsWith(date) && typeof value === "number") {
      total += value;
      count += 1;
    }
  }

  return count > 0 ? Math.round(total / count) : undefined;
}

/**
 * Maps an Open-Meteo response onto `WeatherData[]`, restricted to `requestedDates`.
 * Dates the API did not return (beyond its forecast horizon) are simply absent —
 * the caller reports the gap rather than inventing a forecast.
 */
export function toWeatherData(forecast: OpenMeteoForecast, city: string, requestedDates: string[]): WeatherData[] {
  const days = forecast.daily?.time ?? [];
  const wanted = new Set(requestedDates);
  const results: WeatherData[] = [];

  for (let index = 0; index < days.length; index += 1) {
    const date = days[index];
    if (!date || !wanted.has(date)) continue;

    const temperature = forecast.daily?.temperature_2m_mean?.[index] ?? forecast.daily?.temperature_2m_max?.[index];
    if (typeof temperature !== "number") continue;

    results.push({
      id: `open-meteo-${city.toLowerCase().replace(/\s+/g, "-")}-${date}`,
      city,
      date,
      temperature: Math.round(temperature * 10) / 10,
      condition: toWeatherCondition(forecast.daily?.weather_code?.[index]),
      rainProbability: forecast.daily?.precipitation_probability_max?.[index] ?? 0,
      humidity: averageHumidityForDate(forecast, date) ?? 0,
      windSpeed: Math.round(forecast.daily?.wind_speed_10m_max?.[index] ?? 0),
      source: "REAL",
    });
  }

  return results;
}
