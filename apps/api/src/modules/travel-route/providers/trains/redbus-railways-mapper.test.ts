import { describe, expect, it } from "vitest";
import type { LocationPoint } from "@nexttour/shared";
import type { RailwaySearchResult, RawTrainResult } from "../../../../lib/external/redbus-railways-scraper";
import { toTransportOptions } from "./redbus-railways-mapper";

const origin: LocationPoint = { name: "Patna Jn", code: "PNBE", city: "Patna" };
const destination: LocationPoint = { name: "Madgaon Jn", code: "MAO", city: "Goa" };
const DATE = "2026-09-15";
const PROVIDER = "REDBUS_TRAINS";

function train(overrides: Partial<RawTrainResult> = {}): RawTrainResult {
  return {
    trainNumber: "12742",
    name: "Vasco Da Gama Exp",
    departure: "02:05 PM",
    arrival: "06:10 AM",
    durationMinutes: 2405, // 40h 05min, as published by redBus
    price: "930",
    cheapestFare: 930,
    classFares: { SL: 930, "3A": 2480, "2A": 3595 },
    classAvailability: {
      SL: { status: "AVAILABLE", count: 12 },
      "3A": { status: "WAITLIST", count: 4 },
      "2A": { status: "UNKNOWN" },
    },
    boardingStation: "Patna Jn",
    droppingStation: "Madgaon Jn",
    rawText: "12742 Vasco Da Gama Exp 02:05 PM 40h 05min 06:10 AM SL ₹930 3A ₹2,480",
    ...overrides,
  };
}

function result(results: RawTrainResult[]): RailwaySearchResult {
  return {
    source: "redbus",
    query: { from: { code: "PNBE", name: "Patna Jn" }, to: { code: "MAO", name: "Madgaon Jn" }, date: DATE },
    count: results.length,
    results,
  };
}

describe("toTransportOptions", () => {
  it("maps a train onto a real transport option", () => {
    const [option] = toTransportOptions(result([train()]), origin, destination, DATE, PROVIDER);
    expect(option?.mode).toBe("TRAIN");
    expect(option?.source).toBe("REAL");
    expect(option?.serviceNumber).toBe("12742");
    expect(option?.operator).toBe("Indian Railways");
    expect(option?.vehicleType).toBe("Vasco Da Gama Exp");
  });

  it("uses the published multi-day duration rather than diffing clock times", () => {
    // Clock diffing 14:05 -> 06:10 would give 16h05m; the real journey is 40h05m.
    const [option] = toTransportOptions(result([train()]), origin, destination, DATE, PROVIDER);
    expect(option?.durationMinutes).toBe(2405);
    expect(option?.arrivalTime.slice(0, 10)).toBe("2026-09-17");
  });

  it("falls back to clock arithmetic when no duration is published", () => {
    const [option] = toTransportOptions(
      result([train({ durationMinutes: null, departure: "11:45 PM", arrival: "04:53 AM" })]),
      origin, destination, DATE, PROVIDER,
    );
    expect(option?.durationMinutes).toBe(308); // 23:45 -> 04:53 next day
  });

  it("ignores an implausible published duration and falls back", () => {
    const [option] = toTransportOptions(
      result([train({ durationMinutes: 99_999, departure: "11:45 PM", arrival: "04:53 AM" })]),
      origin, destination, DATE, PROVIDER,
    );
    expect(option?.durationMinutes).toBe(308);
  });

  it("prices from the cheapest class and structures each class's fare, AC flag and availability", () => {
    const [option] = toTransportOptions(result([train()]), origin, destination, DATE, PROVIDER);
    expect(option?.price).toBe(930);
    expect(option?.trainClasses).toEqual([
      { code: "2A", label: "2nd AC", ac: true, fare: 3595, availability: "UNKNOWN" },
      { code: "3A", label: "3rd AC", ac: true, fare: 2480, availability: "WAITLIST", availableCount: 4 },
      { code: "SL", label: "Sleeper", ac: false, fare: 930, availability: "AVAILABLE", availableCount: 12 },
    ]);
  });

  it("marks a class UNKNOWN rather than unavailable when no status text was parsed", () => {
    const [option] = toTransportOptions(result([train()]), origin, destination, DATE, PROVIDER);
    const secondAc = option?.trainClasses?.find((cls) => cls.code === "2A");
    expect(secondAc).toEqual({ code: "2A", label: "2nd AC", ac: true, fare: 3595, availability: "UNKNOWN" });
  });

  it("marks a class NOT_AVAILABLE only when redBus explicitly said so", () => {
    const [option] = toTransportOptions(
      result([
        train({
          classFares: { SL: 930, "1A": 5200 },
          classAvailability: { SL: { status: "AVAILABLE" }, "1A": { status: "NOT_AVAILABLE" } },
        }),
      ]),
      origin, destination, DATE, PROVIDER,
    );
    const firstAc = option?.trainClasses?.find((cls) => cls.code === "1A");
    expect(firstAc?.availability).toBe("NOT_AVAILABLE");
  });

  it("surfaces an alternate boarding station instead of the requested one", () => {
    const [option] = toTransportOptions(
      result([train({ boardingStation: "Patliputra", droppingStation: "Vasco Da Gama" })]),
      origin, destination, DATE, PROVIDER,
    );
    expect(option?.origin.name).toBe("Patliputra");
    expect(option?.destination.name).toBe("Vasco Da Gama");
    expect(option?.metadata?.alternateBoarding).toBe("Patliputra");
  });

  it("drops trains with no fare rather than inventing one", () => {
    const options = toTransportOptions(
      result([train({ cheapestFare: null, classFares: {}, price: null })]),
      origin, destination, DATE, PROVIDER,
    );
    expect(options).toHaveLength(0);
  });

  it("drops trains with neither a duration nor an arrival time", () => {
    const options = toTransportOptions(
      result([train({ durationMinutes: null, arrival: null })]),
      origin, destination, DATE, PROVIDER,
    );
    expect(options).toHaveLength(0);
  });

  it("skips entries without a train number", () => {
    const options = toTransportOptions(result([train({ trainNumber: null })]), origin, destination, DATE, PROVIDER);
    expect(options).toHaveLength(0);
  });
});
