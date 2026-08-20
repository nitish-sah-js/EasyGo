import { describe, expect, it } from "vitest";
import type { OpenMeteoForecast } from "./open-meteo-client";
import { toWeatherCondition, toWeatherData } from "./open-meteo-mapper";

// Shape captured from a live Open-Meteo call for Goa (15.2993, 74.124).
const forecast: OpenMeteoForecast = {
  daily: {
    time: ["2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28"],
    weather_code: [80, 2, 3, 95],
    temperature_2m_max: [27.7, 30.9, 31.2, 27.8],
    temperature_2m_mean: [24.9, 27.4, 27.83, 25.2],
    precipitation_probability_max: [44, 5, 34, 49],
    wind_speed_10m_max: [9.2, 11.2, 14.7, 19.2],
  },
  hourly: {
    time: ["2026-08-25T00:00", "2026-08-25T01:00", "2026-08-26T00:00"],
    relative_humidity_2m: [70, 80, 50],
  },
};

describe("toWeatherCondition", () => {
  it("maps clear and mainly-clear codes to SUNNY", () => {
    expect(toWeatherCondition(0)).toBe("SUNNY");
    expect(toWeatherCondition(1)).toBe("SUNNY");
  });

  it("maps overcast and fog to CLOUDY", () => {
    expect(toWeatherCondition(3)).toBe("CLOUDY");
    expect(toWeatherCondition(45)).toBe("CLOUDY");
    expect(toWeatherCondition(48)).toBe("CLOUDY");
  });

  it("maps drizzle, slight rain and slight showers to LIGHT_RAIN", () => {
    expect(toWeatherCondition(51)).toBe("LIGHT_RAIN");
    expect(toWeatherCondition(61)).toBe("LIGHT_RAIN");
    expect(toWeatherCondition(80)).toBe("LIGHT_RAIN");
  });

  it("maps heavy rain and thunderstorms to HEAVY_RAIN", () => {
    expect(toWeatherCondition(65)).toBe("HEAVY_RAIN");
    expect(toWeatherCondition(82)).toBe("HEAVY_RAIN");
    expect(toWeatherCondition(95)).toBe("HEAVY_RAIN");
  });

  it("falls back to PARTLY_CLOUDY when the code is missing", () => {
    expect(toWeatherCondition(null)).toBe("PARTLY_CLOUDY");
    expect(toWeatherCondition(undefined)).toBe("PARTLY_CLOUDY");
  });
});

describe("toWeatherData", () => {
  it("maps only the requested dates and marks them REAL", () => {
    const result = toWeatherData(forecast, "Goa", ["2026-08-25", "2026-08-26"]);
    expect(result).toHaveLength(2);
    expect(result.every((day) => day.source === "REAL")).toBe(true);
    expect(result.map((day) => day.date)).toEqual(["2026-08-25", "2026-08-26"]);
  });

  it("prefers the daily mean temperature and rounds to one decimal", () => {
    const [first, , third] = toWeatherData(forecast, "Goa", ["2026-08-25", "2026-08-26", "2026-08-27"]);
    expect(first?.temperature).toBe(24.9);
    expect(third?.temperature).toBe(27.8);
  });

  it("averages hourly humidity within each day", () => {
    const [first, second] = toWeatherData(forecast, "Goa", ["2026-08-25", "2026-08-26"]);
    expect(first?.humidity).toBe(75); // (70 + 80) / 2
    expect(second?.humidity).toBe(50);
  });

  it("carries rain probability, wind and condition through", () => {
    const [first] = toWeatherData(forecast, "Goa", ["2026-08-25"]);
    expect(first?.rainProbability).toBe(44);
    expect(first?.windSpeed).toBe(9);
    expect(first?.condition).toBe("LIGHT_RAIN");
  });

  it("omits dates the API did not return rather than inventing them", () => {
    const result = toWeatherData(forecast, "Goa", ["2026-08-25", "2026-12-31"]);
    expect(result.map((day) => day.date)).toEqual(["2026-08-25"]);
  });
});
