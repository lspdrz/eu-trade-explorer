import { describe, expect, it } from "vitest";
import { clampPhi, rotationDelta, zoomBy } from "@/features/globe/lib/projectionMath";

describe("clampPhi", () => {
  it("clamps to [-89, 89]", () => {
    expect(clampPhi(200)).toBe(89);
    expect(clampPhi(-200)).toBe(-89);
    expect(clampPhi(30)).toBe(30);
  });
});

describe("rotationDelta", () => {
  const start = { lambda: 0, phi: 0 };
  // A ~600px canvas fits an orthographic sphere at scale ≈ 290.
  const SCALE = 290;

  it("drag right increases lambda; drag down decreases phi", () => {
    const r = rotationDelta(start, 100, 40, SCALE);
    expect(r.lambda).toBeGreaterThan(0);
    expect(r.phi).toBeLessThan(0);
  });

  it("moves a usable amount — a 100px drag sweeps roughly 15–40°", () => {
    const { lambda } = rotationDelta(start, 100, 0, SCALE);
    expect(lambda).toBeGreaterThan(15);
    expect(lambda).toBeLessThan(40);
  });

  it("scales inversely with projection scale (bigger globe → smaller step)", () => {
    const near = rotationDelta(start, 100, 0, 200);
    const far = rotationDelta(start, 100, 0, 800);
    expect(Math.abs(far.lambda)).toBeLessThan(Math.abs(near.lambda));
  });

  it("keeps phi within [-89, 89]", () => {
    expect(rotationDelta({ lambda: 0, phi: 80 }, 0, -1000, SCALE).phi).toBe(89);
  });
});

describe("zoomBy", () => {
  it("scrolling up (negative deltaY) zooms in", () => {
    expect(zoomBy(1, -100)).toBeGreaterThan(1);
  });

  it("scrolling down zooms out", () => {
    expect(zoomBy(4, 100)).toBeLessThan(4);
  });

  it("clamps to [1, 8]", () => {
    let z = 1;
    for (let i = 0; i < 50; i++) z = zoomBy(z, -100);
    expect(z).toBe(8);
    for (let i = 0; i < 50; i++) z = zoomBy(z, 100);
    expect(z).toBe(1);
  });

  it("in and out by one notch is a round trip", () => {
    expect(zoomBy(zoomBy(3, -100), 100)).toBeCloseTo(3, 10);
  });
});
