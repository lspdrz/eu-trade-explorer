import { describe, expect, it } from "vitest";
import { shouldShowYearLabel, xAxisLabelStep } from "@/features/trade-data/lib/xAxisLabelStep";

describe("xAxisLabelStep", () => {
  it("labels every year when there's room", () => {
    expect(xAxisLabelStep(16, 900)).toBe(1); // ~56px/year
    expect(xAxisLabelStep(5, 400)).toBe(1);
  });

  it("thins labels as the chart narrows", () => {
    expect(xAxisLabelStep(16, 400)).toBe(2); // ~25px/year → every other
    expect(xAxisLabelStep(16, 200)).toBe(4); // ~12.5px/year → every fourth
  });

  it("never returns less than 1, and is safe with degenerate inputs", () => {
    expect(xAxisLabelStep(1, 800)).toBe(1);
    expect(xAxisLabelStep(16, 0)).toBe(1);
  });
});

describe("shouldShowYearLabel", () => {
  it("always shows the last index", () => {
    expect(shouldShowYearLabel(16, 16, 3)).toBe(true);
  });

  it("shows every step-th index when it's not crowding the last one", () => {
    expect(shouldShowYearLabel(0, 16, 3)).toBe(true);
    expect(shouldShowYearLabel(3, 16, 3)).toBe(true);
    expect(shouldShowYearLabel(6, 16, 3)).toBe(true);
    expect(shouldShowYearLabel(9, 16, 3)).toBe(true);
  });

  it("hides an off-step index", () => {
    expect(shouldShowYearLabel(1, 16, 3)).toBe(false);
    expect(shouldShowYearLabel(14, 16, 3)).toBe(false);
  });

  it("suppresses a step-th index that would collide with the forced last-year label", () => {
    // 17 years (index 0..16), step 3: the naive `i % step === 0` selection
    // includes index 15 (2010 + 15), just 1 slot from the forced index 16 —
    // reproduces the actual mobile Imports-page collision (adjacent
    // "2025"/"2026*" labels with no room between them).
    expect(shouldShowYearLabel(15, 16, 3)).toBe(false);
    // But a step hit with a full step of clearance is still shown.
    expect(shouldShowYearLabel(12, 16, 3)).toBe(true);
  });

  it("with step 1, every index (including the last) is shown — no suppression", () => {
    for (let i = 0; i <= 5; i++) expect(shouldShowYearLabel(i, 5, 1)).toBe(true);
  });
});
