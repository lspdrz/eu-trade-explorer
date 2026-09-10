import { describe, expect, it } from "vitest";
import { xAxisLabelStep } from "../xAxisLabelStep";

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
