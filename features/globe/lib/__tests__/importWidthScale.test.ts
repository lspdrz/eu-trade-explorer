import { describe, expect, it } from "vitest";
import { makeImportWidthScale } from "@/features/globe/lib/importWidthScale";

describe("makeImportWidthScale", () => {
  const s = makeImportWidthScale(1_000_000);

  it("width is monotonic in tonnes and clamped to [0.75, 7]", () => {
    expect(s.width(0)).toBeCloseTo(0.75, 5);
    expect(s.width(1_000_000)).toBeCloseTo(7, 5);
    expect(s.width(250_000)).toBeGreaterThan(s.width(0));
    expect(s.width(250_000)).toBeLessThan(s.width(1_000_000));
    expect(s.width(5_000_000)).toBeCloseTo(7, 5); // clamped above the domain
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
    expect(z.width(0)).toBeCloseTo(0.75, 5);
    expect(z.count(0)).toBe(1);
  });
});
