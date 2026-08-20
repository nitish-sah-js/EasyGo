import { describe, expect, it } from "vitest";
import type { LocationPoint } from "@nexttour/shared";
import type { BusSearchResult } from "../../../../lib/external/redbus-bus-scraper";
import { toTransportOptions } from "./redbus-bus-mapper";

const origin: LocationPoint = { name: "Ahmedabad", code: "551", city: "Ahmedabad" };
const destination: LocationPoint = { name: "Indore", code: "313", city: "Indore" };
const DATE = "2026-09-15";
const PROVIDER = "REDBUS_BUSES";

function result(overrides: Partial<BusSearchResult>): BusSearchResult {
  return {
    source: "redbus",
    query: { from: { name: "Ahmedabad", id: "551" }, to: { name: "Indore", id: "313" }, date: DATE },
    count: 0,
    results: [],
    summary: null,
    noServiceOnRoute: false,
    ...overrides,
  };
}

describe("toTransportOptions — bookable departures", () => {
  // Card shape documented in real-data-easyGo/docs/BUS_SEARCH_DATA.md
  const departures = result({
    results: [
      {
        operator: "STARLINE BUS",
        departure: "22:30",
        arrival: "05:35",
        durationMinutes: 425,
        fare: 1139,
        seatsAvailable: 27,
        busType: "A/C Sleeper (2+1)",
        rating: 4.7,
        rawText: "22:30 05:35 7h 5m 27 Seats ₹1,139 Onwards STARLINE BUS A/C Sleeper (2+1) 4.7",
      },
      {
        operator: "Shrinath Travel Agency",
        departure: "21:00",
        arrival: "06:00",
        durationMinutes: 540,
        fare: 1770,
        seatsAvailable: 12,
        busType: "A/C Seater",
        rating: 4.1,
        rawText: "21:00 06:00 9h 0m 12 Seats ₹1,770",
      },
    ],
  });

  it("builds one option per real departure", () => {
    const options = toTransportOptions(departures, origin, destination, DATE, PROVIDER);
    expect(options).toHaveLength(2);
    expect(options.every((option) => option.mode === "BUS" && option.source === "REAL")).toBe(true);
  });

  it("carries the real fare, operator, bus type and seat count", () => {
    const [first] = toTransportOptions(departures, origin, destination, DATE, PROVIDER);
    expect(first?.price).toBe(1139);
    expect(first?.operator).toBe("STARLINE BUS");
    expect(first?.vehicleType).toBe("A/C Sleeper (2+1)");
    expect(first?.metadata?.seatsAvailable).toBe(27);
  });

  it("does not flag real departures as estimated", () => {
    const options = toTransportOptions(departures, origin, destination, DATE, PROVIDER);
    for (const option of options) {
      expect(option.metadata?.priceEstimated).toBeUndefined();
      expect(option.metadata?.durationEstimated).toBeUndefined();
    }
  });

  it("derives arrival from the scraped duration, rolling past midnight", () => {
    const [first] = toTransportOptions(departures, origin, destination, DATE, PROVIDER);
    expect(first?.durationMinutes).toBe(425);
    // 22:30 IST + 7h05m => 05:35 IST the next day
    expect(new Date(first?.arrivalTime ?? "").getTime() - new Date(first?.departureTime ?? "").getTime()).toBe(425 * 60_000);
    expect(first?.arrivalTime.slice(0, 10)).toBe("2026-09-16");
  });

  it("skips departures missing a fare or duration rather than inventing one", () => {
    const partial = result({
      results: [
        { operator: "Unknown", departure: "10:00", arrival: null, durationMinutes: null, fare: null, seatsAvailable: null, busType: null, rating: null, rawText: "x" },
      ],
    });
    expect(toTransportOptions(partial, origin, destination, DATE, PROVIDER)).toHaveLength(0);
  });
});

describe("toTransportOptions — route summary fallback", () => {
  // Shape observed on a redBus route page with no bookable inventory.
  const summary = result({
    summary: {
      operatorCount: 109,
      dailyServices: 391,
      cheapestFare: 93,
      averageDurationMinutes: 349,
      firstBusClock: "00:20",
      lastBusClock: "23:59",
      operatorTimings: [
        { operator: "Maharani Travels", firstBus: "03:20", lastBus: "23:55", durationMinutes: 315 },
        { operator: "NueGo", firstBus: "06:30", lastBus: "23:55", durationMinutes: 322 },
      ],
    },
  });

  it("builds one option per operator when no departures are bookable", () => {
    const options = toTransportOptions(summary, origin, destination, DATE, PROVIDER);
    expect(options).toHaveLength(2);
    expect(options.map((option) => option.operator)).toEqual(["Maharani Travels", "NueGo"]);
  });

  it("uses the operator's real first departure and duration", () => {
    const [first] = toTransportOptions(summary, origin, destination, DATE, PROVIDER);
    expect(first?.durationMinutes).toBe(315);
    expect(first?.departureTime).toBe("2026-09-14T21:50:00.000Z"); // 03:20 IST
  });

  it("flags the fare as estimated, since only the route cheapest fare is published", () => {
    const options = toTransportOptions(summary, origin, destination, DATE, PROVIDER);
    for (const option of options) {
      expect(option.price).toBe(93);
      expect(option.metadata?.priceEstimated).toBe(true);
      expect(option.metadata?.priceBasis).toBe("route cheapest fare");
    }
  });

  it("falls back to a single route-level option when no operator table is present", () => {
    const routeOnly = result({
      summary: {
        operatorCount: 109, dailyServices: 391, cheapestFare: 93,
        averageDurationMinutes: 349, firstBusClock: "00:20", lastBusClock: "23:59",
        operatorTimings: [],
      },
    });
    const options = toTransportOptions(routeOnly, origin, destination, DATE, PROVIDER);
    expect(options).toHaveLength(1);
    expect(options[0]?.metadata?.durationEstimated).toBe(true);
    expect(options[0]?.operator).toBe("109 operators on this route");
  });

  it("prefers real departures over the summary when both are present", () => {
    const both = result({
      results: [{ operator: "STARLINE BUS", departure: "22:30", arrival: "05:35", durationMinutes: 425, fare: 1139, seatsAvailable: 27, busType: "A/C Sleeper", rating: 4.7, rawText: "x" }],
      summary: summary.summary,
    });
    const options = toTransportOptions(both, origin, destination, DATE, PROVIDER);
    expect(options).toHaveLength(1);
    expect(options[0]?.price).toBe(1139);
    expect(options[0]?.metadata?.priceEstimated).toBeUndefined();
  });

  it("returns nothing when redBus published neither departures nor a fare", () => {
    expect(toTransportOptions(result({}), origin, destination, DATE, PROVIDER)).toHaveLength(0);
  });
});
