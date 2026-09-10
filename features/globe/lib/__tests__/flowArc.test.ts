import { geoInterpolate } from "d3-geo";
import { describe, expect, it } from "vitest";
import { ARC_SAMPLES } from "@/features/globe/constants/globeConfig";
import { edgeFade, sampleArc } from "@/features/globe/lib/flowArc";

describe("sampleArc", () => {
  const interp = geoInterpolate([0, 0], [90, 0]);

  it("returns ARC_SAMPLES + 1 points", () => {
    expect(sampleArc(interp)).toHaveLength(ARC_SAMPLES + 1);
  });

  it("hits both endpoints exactly", () => {
    const pts = sampleArc(interp);
    expect(pts[0][0]).toBeCloseTo(0, 6);
    expect(pts[pts.length - 1][0]).toBeCloseTo(90, 6);
  });

  it("is evenly spaced in the interpolation parameter", () => {
    const mid = sampleArc(interp)[ARC_SAMPLES / 2];
    expect(mid[0]).toBeCloseTo(45, 6); // halfway along the equator
  });
});

describe("edgeFade", () => {
  it("ramps 0→1 over the first `edge`", () => {
    expect(edgeFade(0)).toBe(0);
    expect(edgeFade(0.04, 0.08)).toBeCloseTo(0.5, 6);
    expect(edgeFade(0.08, 0.08)).toBe(1);
  });

  it("holds at 1 through the middle", () => {
    expect(edgeFade(0.5)).toBe(1);
  });

  it("ramps 1→0 over the last `edge`", () => {
    expect(edgeFade(0.96, 0.08)).toBeCloseTo(0.5, 6);
    expect(edgeFade(1)).toBe(0);
  });
});
