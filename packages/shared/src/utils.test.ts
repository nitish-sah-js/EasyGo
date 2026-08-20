import { describe, expect, it } from "vitest";
import { locationsMatch, resolveCityName } from "./utils";

describe("locationsMatch", () => {
  it("matches when the provider's city name equals the resolved city", () => {
    expect(locationsMatch("Delhi", { name: "H Nizamuddin", code: "NDLS", city: "Delhi" })).toBe(true);
  });

  // Sky Scrapper reports Delhi's airport city as "New Delhi"; before this was handled,
  // every real flight was silently dropped from route building.
  it("matches a provider city-name variant via the alias set", () => {
    expect(locationsMatch("Delhi", { name: "Delhi Indira Gandhi International", code: "DEL", city: "New Delhi" })).toBe(true);
  });

  it("matches on an airport/station code alone", () => {
    expect(locationsMatch("Goa", { name: "Goa Dabolim", code: "GOI" })).toBe(true);
    expect(locationsMatch("Goa", { name: "Madgaon", code: "MAO", city: "Goa" })).toBe(true);
    expect(locationsMatch("Mumbai", { name: "Mumbai Cst", code: "CSTM" })).toBe(true);
  });

  it("matches when the provider returns a longer name containing the city", () => {
    expect(locationsMatch("Bengaluru", { name: "Bangalore Cy Junction", code: "SBC" })).toBe(true);
  });

  it("still matches an exact literal for cities outside the alias table", () => {
    expect(locationsMatch("Indore", { name: "Indore", code: "313" })).toBe(true);
  });

  it("does not match an unrelated place", () => {
    expect(locationsMatch("Delhi", { name: "Madgaon", code: "MAO", city: "Goa" })).toBe(false);
    expect(locationsMatch("Goa", { name: "Patna Jn", code: "PNBE", city: "Patna" })).toBe(false);
  });
});

describe("resolveCityName", () => {
  it("resolves aliases and codes to the canonical city", () => {
    expect(resolveCityName("New Delhi")).toBe("Delhi");
    expect(resolveCityName("Bombay")).toBe("Mumbai");
    expect(resolveCityName("MAO")).toBe("Goa");
    expect(resolveCityName("Calcutta")).toBe("Kolkata");
  });

  it("returns undefined for a city outside the table", () => {
    expect(resolveCityName("Indore")).toBeUndefined();
  });
});
