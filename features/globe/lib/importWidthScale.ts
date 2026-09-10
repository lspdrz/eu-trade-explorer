import { scaleSqrt } from "d3-scale";

const MIN_W = 0.75;
const MAX_W = 7;
const MAX_PARTICLES = 12;

/**
 * Maps a country's tonnage to its arc's stroke width and particle count.
 * Area-proportional (`sqrt`) so a 4× total looks ~2× heavier, matching
 * the bar charts' perceptual intent. Bind the domain max once per render.
 */
export function makeImportWidthScale(maxTonnes: number): {
  width(tonnes: number): number;
  count(tonnes: number): number;
} {
  const s = scaleSqrt()
    .domain([0, Math.max(maxTonnes, 1)])
    .range([MIN_W, MAX_W])
    .clamp(true);

  return {
    width: (tonnes) => s(tonnes),
    count: (tonnes) => {
      const frac = (s(tonnes) - MIN_W) / (MAX_W - MIN_W); // 0..1
      return Math.min(
        MAX_PARTICLES,
        Math.max(1, Math.round(frac * MAX_PARTICLES)),
      );
    },
  };
}
