import { describe, expect, it } from "vitest";
import { randomPhases, spacedPhases, stepParticles } from "@/features/globe/lib/particles";

describe("stepParticles", () => {
  it("advances every particle's t by dt*speed and wraps past 1", () => {
    const state = new Map([["RU", [{ t: 0.1 }, { t: 0.95 }]]]);
    stepParticles(state, 1, 0.1); // +0.1
    expect(state.get("RU")![0].t).toBeCloseTo(0.2, 5);
    expect(state.get("RU")![1].t).toBeCloseTo(0.05, 5); // 1.05 → 0.05
  });
});

describe("spacedPhases", () => {
  it("returns `count` evenly-spaced phases in [0, 1)", () => {
    expect(spacedPhases(4).map((p) => p.t)).toEqual([0, 0.25, 0.5, 0.75]);
  });
  it("returns [] for count 0", () => {
    expect(spacedPhases(0)).toEqual([]);
  });
});

describe("randomPhases", () => {
  it("returns `count` phases, all in [0, 1)", () => {
    const ps = randomPhases(5);
    expect(ps).toHaveLength(5);
    for (const p of ps) {
      expect(p.t).toBeGreaterThanOrEqual(0);
      expect(p.t).toBeLessThan(1);
    }
  });
});
