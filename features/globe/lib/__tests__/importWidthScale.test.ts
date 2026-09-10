import { describe, expect, it } from "vitest";
import { makeImportWidthScale } from "@/features/globe/lib/importWidthScale";

describe("makeImportWidthScale", () => {
  const s = makeImportWidthScale(1_000_000);

  it("width is monotonic in tonnes and clamped to [0.6, 9]", () => {
    expect(s.width(0)).toBeCloseTo(0.6, 5);
    expect(s.width(1_000_000)).toBeCloseTo(9, 5);
    expect(s.width(250_000)).toBeGreaterThan(s.width(0));
    expect(s.width(250_000)).toBeLessThan(s.width(1_000_000));
    expect(s.width(5_000_000)).toBeCloseTo(9, 5); // clamped above the domain
  });

  it("is super-linear — the top half of the range is where most width lives", () => {
    // sqrt would put width(half) well above the midpoint; a >1 exponent
    // keeps it below, so the big flows pull ahead.
    const mid = (s.width(0) + s.width(1_000_000)) / 2;
    expect(s.width(500_000)).toBeLessThan(mid);
  });

  it("count is an integer clamped to [1, 12]", () => {
    expect(s.count(0)).toBe(1);
    expect(s.count(1_000_000)).toBe(12);
    expect(Number.isInteger(s.count(400_000))).toBe(true);
    expect(s.count(400_000)).toBeGreaterThanOrEqual(1);
    expect(s.count(400_000)).toBeLessThanOrEqual(12);
  });

  it("tolerates a zero domain max (no data)", () => {
    const z = makeImportWidthScale(0);
    expect(z.width(0)).toBeCloseTo(0.6, 5);
    expect(z.count(0)).toBe(1);
  });
});
