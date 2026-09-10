import { scalePow } from "d3-scale";

const MIN_W = 0.6;
const MAX_W = 9;
const MAX_PARTICLES = 12;

/**
 * Exponent on the tonnage→width curve. `> 1` pushes the mapping the
 * opposite way from an area-proportional `sqrt`: the biggest flows get
 * dramatically heavier arcs and denser particle streams, the small ones
 * stay thin. Tune here.
 */
const WIDTH_EXPONENT = 1.6;

/**
 * Maps a country's tonnage to its arc's stroke width and particle count.
 * Super-linear (`WIDTH_EXPONENT > 1`) so the dominant origins read as
 * dominant. Bind the domain max once per render.
 */
export function makeImportWidthScale(maxTonnes: number): {
  width(tonnes: number): number;
  count(tonnes: number): number;
} {
  const s = scalePow()
    .exponent(WIDTH_EXPONENT)
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
