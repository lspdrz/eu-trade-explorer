import { geoDistance } from "d3-geo";

/**
 * Is `point` on the visible half of the globe, given the view is centred
 * on `center`? Both `[lon, lat]` in degrees. Points at or beyond 90°
 * great-circle distance are behind the limb and must not be drawn.
 */
export function isOnFrontHemisphere(
  point: [number, number],
  center: [number, number],
): boolean {
  return geoDistance(point, center) < Math.PI / 2;
}
