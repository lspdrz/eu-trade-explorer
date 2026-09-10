import { ARC_SAMPLES } from "@/features/globe/constants/globeConfig";

/**
 * Evenly-spaced points along a great-circle arc, given its `geoInterpolate`
 * function. `ARC_SAMPLES + 1` points so both endpoints are exact. Fed to
 * `geoPath` as a `LineString` (d3-geo clips it to the visible hemisphere).
 */
export function sampleArc(
  interp: (t: number) => [number, number],
): [number, number][] {
  return Array.from({ length: ARC_SAMPLES + 1 }, (_, i) =>
    interp(i / ARC_SAMPLES),
  );
}

/**
 * A particle's opacity as it travels its arc: ramps 0→1 over the first
 * `edge` of the path, holds at 1, ramps 1→0 over the last `edge`. Keeps
 * dots from blinking in and out at the endpoints.
 */
export function edgeFade(t: number, edge = 0.08): number {
  if (t < edge) return t / edge;
  if (t > 1 - edge) return (1 - t) / edge;
  return 1;
}
