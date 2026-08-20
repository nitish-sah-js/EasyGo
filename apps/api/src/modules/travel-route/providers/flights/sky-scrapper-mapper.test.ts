import { describe, expect, it } from "vitest";
import { parseAirportSearchResponse, parseFlightSearchResponse, toTransportOption } from "./sky-scrapper-mapper";

describe("parseAirportSearchResponse", () => {
  it("prefers an AIRPORT entity and extracts skyId/entityId/name", () => {
    const payload = {
      status: true,
      data: [
        {
          presentation: { title: "Patna", suggestionTitle: "Patna (PAT)" },
          navigation: {
            entityId: "27544850",
            entityType: "CITY",
            relevantFlightParams: { skyId: "PATC", entityId: "27544850", localizedName: "Patna" },
          },
        },
        {
          presentation: { title: "Jay Prakash Narayan Airport" },
          navigation: {
            entityId: "95673302",
            entityType: "AIRPORT",
            relevantFlightParams: { skyId: "PATN", entityId: "95673302", localizedName: "Patna" },
          },
        },
      ],
    };

    expect(parseAirportSearchResponse(payload)).toEqual({ skyId: "PATN", entityId: "95673302", name: "Patna" });
  });

  it("returns undefined when nothing parseable is present", () => {
    expect(parseAirportSearchResponse({ status: true, data: [] })).toBeUndefined();
    expect(parseAirportSearchResponse(null)).toBeUndefined();
  });
});

describe("parseFlightSearchResponse", () => {
  const context = { originName: "Patna", destinationName: "Mumbai", departureDate: "2026-08-21" };

  it("maps itineraries with legs into ParsedFlightItinerary records", () => {
    const payload = {
      status: true,
      data: {
        itineraries: [
          {
            id: "itin-1",
            price: { raw: 5200, formatted: "₹5,200" },
            legs: [
              {
                id: "leg-1",
                origin: { displayCode: "PAT", name: "Patna", city: "Patna" },
                destination: { displayCode: "BOM", name: "Mumbai", city: "Mumbai" },
                departure: "2026-08-21T08:00:00",
                arrival: "2026-08-21T10:10:00",
                durationInMinutes: 130,
                stopCount: 0,
                carriers: { marketing: [{ name: "Example Airline" }] },
              },
            ],
          },
        ],
      },
    };

    const result = parseFlightSearchResponse(payload, context);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      price: 5200,
      departureTime: "2026-08-21T08:00:00",
      arrivalTime: "2026-08-21T10:10:00",
      durationMinutes: 130,
      stops: 0,
      operator: "Example Airline",
    });
    expect(result[0]!.origin.code).toBe("PAT");
    expect(result[0]!.destination.code).toBe("BOM");
  });

  it("skips itineraries missing required fields instead of throwing", () => {
    const payload = { data: { itineraries: [{ id: "broken", legs: [{ origin: {}, destination: {} }] }] } };
    expect(parseFlightSearchResponse(payload, context)).toEqual([]);
  });

  it("returns an empty array for an unexpected payload shape", () => {
    expect(parseFlightSearchResponse({ unexpected: true }, context)).toEqual([]);
  });
});

describe("toTransportOption", () => {
  it("builds a domain TransportOption with source REAL", () => {
    const itinerary = {
      id: "leg-1",
      price: 5200,
      origin: { name: "Patna", code: "PAT" },
      destination: { name: "Mumbai", code: "BOM" },
      departureTime: "2026-08-21T08:00:00",
      arrivalTime: "2026-08-21T10:10:00",
      durationMinutes: 130,
      stops: 0,
      operator: "Example Airline",
      segments: [
        {
          origin: { name: "Patna", code: "PAT" },
          destination: { name: "Mumbai", code: "BOM" },
          departureTime: "2026-08-21T08:00:00",
          arrivalTime: "2026-08-21T10:10:00",
          mode: "FLIGHT" as const,
          operator: "Example Airline",
        },
      ],
    };

    const option = toTransportOption(itinerary, "SKY_SCRAPPER_FLIGHTS", "2026-08-21T00:00:00.000Z");
    expect(option.mode).toBe("FLIGHT");
    expect(option.currency).toBe("INR");
    expect(option.source).toBe("REAL");
    expect(option.provider).toBe("SKY_SCRAPPER_FLIGHTS");
    expect(option.segments).toHaveLength(1);
  });
});
