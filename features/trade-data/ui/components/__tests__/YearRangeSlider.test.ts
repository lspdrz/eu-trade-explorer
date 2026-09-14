import { describe, expect, it } from "vitest";
import { clampToMaxSpan } from "@/features/trade-data/ui/components/YearRangeSlider";

describe("clampToMaxSpan", () => {
  it("passes values through unchanged when maxSpan is undefined", () => {
    expect(clampToMaxSpan(2010, 2026, 2010, undefined)).toEqual([2010, 2026]);
  });

  it("passes values through unchanged when already within maxSpan", () => {
    expect(clampToMaxSpan(2019, 2024, 2019, 7)).toEqual([2019, 2024]);
  });

  it("pushes the 'to' thumb along when the 'from' thumb is the one that moved", () => {
    // prevA=2019 (starting "from"), a=2012 means the "from" thumb just
    // dragged left — the "to" thumb (2026, stationary) should follow to
    // hold the span, not let the drag pass through it.
    expect(clampToMaxSpan(2012, 2026, 2019, 7)).toEqual([2012, 2019]);
  });

  it("pushes the 'from' thumb along when the 'to' thumb is the one that moved", () => {
    // prevA=2019 unchanged means "from" didn't move — "to" dragged out to
    // 2030, so "from" follows to hold the span.
    expect(clampToMaxSpan(2019, 2030, 2019, 7)).toEqual([2023, 2030]);
  });

  it("is a no-op exactly at the cap", () => {
    expect(clampToMaxSpan(2019, 2026, 2019, 7)).toEqual([2019, 2026]);
  });
});
