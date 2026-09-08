import { describe, expect, it } from "vitest";
import { xAxisLabelStep } from "../xAxisLabelStep";

describe("xAxisLabelStep", () => {
  it("labels every year for a short range", () => {
    expect(xAxisLabelStep(1)).toBe(1);
    expect(xAxisLabelStep(12)).toBe(1);
  });

  it("labels every other year past 12", () => {
    expect(xAxisLabelStep(13)).toBe(2);
    expect(xAxisLabelStep(24)).toBe(2);
  });

  it("labels every fifth year past 24", () => {
    expect(xAxisLabelStep(25)).toBe(5);
    expect(xAxisLabelStep(40)).toBe(5);
  });
});
