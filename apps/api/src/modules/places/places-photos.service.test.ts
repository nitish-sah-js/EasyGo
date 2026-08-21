import { describe, expect, it } from "vitest";
import { isPhotoName, normalizePhotoWidth } from "./places-photos.service";

describe("isPhotoName", () => {
  it("accepts a Google Places photo resource name", () => {
    expect(isPhotoName("places/ChIJ-abc_123/photos/AeJbb3f-Xyz_09")).toBe(true);
  });

  it("rejects anything that is not a photo resource name", () => {
    // The endpoint is unauthenticated, so this guard is what stops it being used
    // as an open redirect or a generic proxy for other Google endpoints.
    expect(isPhotoName("https://evil.example.com/steal")).toBe(false);
    expect(isPhotoName("places/ChIJ-abc/photos/../../v1/places:searchText")).toBe(false);
    expect(isPhotoName("places/ChIJ-abc")).toBe(false);
    expect(isPhotoName("")).toBe(false);
  });
});

describe("normalizePhotoWidth", () => {
  it("snaps a requested width up to the next cache step", () => {
    expect(normalizePhotoWidth(150)).toBe(200);
    expect(normalizePhotoWidth(201)).toBe(400);
    expect(normalizePhotoWidth(800)).toBe(800);
  });

  it("clamps beyond the ladder instead of billing an oversized photo", () => {
    expect(normalizePhotoWidth(9_000)).toBe(1_600);
  });

  it("falls back to a sensible default for a missing or unusable width", () => {
    expect(normalizePhotoWidth(undefined)).toBe(800);
    expect(normalizePhotoWidth(Number.NaN)).toBe(800);
  });
});
