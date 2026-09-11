import { describe, expect, it } from "vitest";
import { YEARS, toYearlyValues } from "@/features/ru-trade-timeline/lib/years";

describe("YEARS", () => {
  it("spans 2010-2025 inclusive", () => {
    expect(YEARS[0]).toBe(2010);
    expect(YEARS[YEARS.length - 1]).toBe(2025);
    expect(YEARS).toHaveLength(16);
  });
});

describe("toYearlyValues", () => {
  it("converts 100kg to tonnes and aligns to YEARS, zero-filling gaps", () => {
    const values = toYearlyValues([
      { year: 2010, quantity100kg: 10_000 }, // 1000 t
      { year: 2012, quantity100kg: 5_000 }, // 500 t
    ]);
    expect(values).toHaveLength(YEARS.length);
    expect(values[0]).toBe(1000); // 2010
    expect(values[1]).toBe(0); // 2011, gap
    expect(values[2]).toBe(500); // 2012
  });

  it("drops any year outside YEARS (e.g. the current partial year)", () => {
    const values = toYearlyValues([
      { year: 2025, quantity100kg: 10_000 },
      { year: 2026, quantity100kg: 999_999 }, // out of range, ignored
    ]);
    expect(values[values.length - 1]).toBe(1000); // 2025
    expect(values.reduce((a, b) => a + b, 0)).toBe(1000); // 2026's value never counted
  });

  it("returns all-zero for no rows", () => {
    expect(toYearlyValues([])).toEqual(YEARS.map(() => 0));
  });
});
