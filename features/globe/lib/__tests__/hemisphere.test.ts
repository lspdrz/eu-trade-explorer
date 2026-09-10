import { describe, expect, it } from "vitest";
import { isOnFrontHemisphere } from "@/features/globe/lib/hemisphere";

describe("isOnFrontHemisphere", () => {
  const center: [number, number] = [10, 50];

  it("true at the view centre", () => {
    expect(isOnFrontHemisphere(center, center)).toBe(true);
  });
  it("false at the antipode", () => {
    expect(isOnFrontHemisphere([-170, -50], center)).toBe(false);
  });
  it("false at exactly 90° away along the meridian (the limb)", () => {
    // [10, -40] is 90° of great-circle distance from [10, 50].
    expect(isOnFrontHemisphere([10, -40], center)).toBe(false);
  });

  it("true just inside the limb", () => {
    expect(isOnFrontHemisphere([10, -39], center)).toBe(true);
  });
});
