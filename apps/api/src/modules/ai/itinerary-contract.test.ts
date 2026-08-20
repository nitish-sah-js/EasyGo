import { describe, expect, it } from "vitest";
import { normalizeItineraryShape } from "./itinerary-contract";

const day = { dayNumber: 1, date: "2026-09-15", summary: "Arrive", activities: [] };

describe("normalizeItineraryShape", () => {
  it("passes a correctly shaped object through unchanged", () => {
    const input = { recommendation: "Plan", reason: "Because", itinerary: [day] };
    expect(normalizeItineraryShape(input)).toEqual(input);
  });

  it("wraps a bare day array, which models sometimes return instead of the object", () => {
    expect(normalizeItineraryShape([day])).toEqual({ recommendation: "", reason: "", itinerary: [day] });
  });

  it("accepts `days` as an alias for `itinerary`", () => {
    expect(normalizeItineraryShape({ recommendation: "P", reason: "R", days: [day] })).toEqual({
      recommendation: "P", reason: "R", itinerary: [day],
    });
  });

  it("unwraps a single wrapper key", () => {
    const inner = { recommendation: "P", reason: "R", itinerary: [day] };
    expect(normalizeItineraryShape({ plan: inner })).toEqual(inner);
  });

  it("defaults missing recommendation/reason to empty strings so repair can fill them", () => {
    expect(normalizeItineraryShape({ itinerary: [day] })).toEqual({
      recommendation: "", reason: "", itinerary: [day],
    });
  });

  it("leaves an unrecognisable payload alone for the schema to reject", () => {
    expect(normalizeItineraryShape({ foo: 1, bar: 2 })).toEqual({ foo: 1, bar: 2 });
    expect(normalizeItineraryShape("nope")).toBe("nope");
  });
});
