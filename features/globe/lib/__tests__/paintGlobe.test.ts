import { geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import type { Feature } from "geojson";
import { describe, expect, it, vi } from "vitest";
import { ARC_SAMPLES } from "@/features/globe/constants/globeConfig";
import { EU_ANCHOR } from "@/features/globe/constants/euAnchor";
import {
  edgeFade,
  paintAnchor,
  paintFlows,
  paintLand,
  paintOcean,
  sampleArc,
  type Scene,
} from "@/features/globe/lib/paintGlobe";
import type { GlobeTokens } from "@/features/globe/lib/themeTokens";

const TOKENS: GlobeTokens = {
  surface: "#fff",
  background: "#eee",
  border: "#ccc",
  baseline: "#bbb",
  series1: "#2a78d6",
  muted: "#555",
  foreground: "#000",
};

/** A 2D context that records the calls the painters make. */
function fakeCtx() {
  const calls = { fill: 0, stroke: 0, arc: 0 };
  const ctx = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
    arc: vi.fn(() => void calls.arc++),
    fill: vi.fn(() => void calls.fill++),
    stroke: vi.fn(() => void calls.stroke++),
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const square = (lon: number, lat: number): Feature => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [lon, lat],
        [lon + 5, lat],
        [lon + 5, lat + 5],
        [lon, lat + 5],
        [lon, lat],
      ],
    ],
  },
});

function scene(over: Partial<Scene> = {}): { s: Scene; calls: ReturnType<typeof fakeCtx>["calls"] } {
  const { ctx, calls } = fakeCtx();
  const projection = geoOrthographic()
    .rotate([-EU_ANCHOR[0], -EU_ANCHOR[1], 0])
    .fitExtent(
      [
        [0, 0],
        [400, 400],
      ],
      { type: "Sphere" },
    );
  const s: Scene = {
    ctx,
    path: geoPath(projection, ctx),
    project: (p) => projection(p) ?? null,
    tokens: TOKENS,
    land: [],
    activeCodes: [],
    active: new Set(),
    hoverCode: undefined,
    viewCenter: [EU_ANCHOR[0], EU_ANCHOR[1]],
    centroidByCode: new Map(),
    tonnesByCode: new Map(),
    arcWidth: () => 2,
    particles: new Map(),
    ...over,
  };
  return { s, calls };
}

describe("paintOcean", () => {
  it("fills the disc and strokes the limb once", () => {
    const { s, calls } = scene();
    paintOcean(s);
    expect(calls.fill).toBe(1);
    expect(calls.stroke).toBe(1);
  });
});

describe("paintLand", () => {
  it("fills and strokes once per country", () => {
    const { s, calls } = scene({
      land: [
        { code: "AA", feature: square(0, 40), centroid: [2, 42] },
        { code: "BB", feature: square(10, 40), centroid: [12, 42] },
      ],
    });
    paintLand(s);
    expect(calls.fill).toBe(2);
    expect(calls.stroke).toBe(2);
  });
});

describe("paintFlows", () => {
  it("draws an arc for a code with a centroid", () => {
    const { s, calls } = scene({
      activeCodes: ["RU"],
      centroidByCode: new Map([["RU", [30, 55]]]),
      tonnesByCode: new Map([["RU", 1000]]),
    });
    paintFlows(s);
    expect(calls.stroke).toBe(1); // the arc
  });

  it("draws nothing for a code whose centroid is missing", () => {
    const { s, calls } = scene({
      activeCodes: ["ZZ"],
      centroidByCode: new Map(), // no entry
    });
    paintFlows(s);
    expect(calls.stroke).toBe(0);
    expect(calls.arc).toBe(0);
  });

  it("draws a particle on the near side of the arc but not one behind the limb", () => {
    const near = scene({
      activeCodes: ["RU"],
      centroidByCode: new Map([["RU", [10, 52]]]),
      particles: new Map([["RU", [{ t: 0.5 }]]]),
      viewCenter: [7, 51],
    });
    paintFlows(near.s);
    expect(near.calls.arc).toBe(1);

    const far = scene({
      activeCodes: ["RU"],
      centroidByCode: new Map([["RU", [10, 52]]]),
      particles: new Map([["RU", [{ t: 0.5 }]]]),
      viewCenter: [-173, -51], // antipode — the whole arc is behind the globe
    });
    paintFlows(far.s);
    expect(far.calls.arc).toBe(0);
  });
});

describe("paintAnchor", () => {
  it("draws the dot when the anchor faces the camera", () => {
    const { s, calls } = scene();
    paintAnchor(s);
    expect(calls.arc).toBe(1);
    expect(calls.fill).toBe(1);
  });

  it("draws nothing when the anchor is round the back", () => {
    const { s, calls } = scene({ viewCenter: [-175.65, -50.85] });
    paintAnchor(s);
    expect(calls.arc).toBe(0);
    expect(calls.fill).toBe(0);
  });
});

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
