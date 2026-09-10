import { DRAG_K, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "@/features/globe/constants/globeConfig";

export type Rotation = { lambda: number; phi: number };

/** Keep the pole from flipping through the top/bottom of the view. */
export function clampPhi(phi: number): number {
  return Math.min(89, Math.max(-89, phi));
}

/**
 * A pointer drag (`dx`, `dy` in CSS px) applied to the current rotation.
 * `scale` is `projection.scale()` — dividing by it means a given pixel
 * drag sweeps the same visual angle at any globe size. `dy` inverts:
 * dragging the surface down tips the north pole toward the viewer (phi
 * decreases).
 */
export function rotationDelta(
  start: Rotation,
  dx: number,
  dy: number,
  scale: number,
): Rotation {
  const perPx = DRAG_K / Math.max(scale, 1);
  return {
    lambda: start.lambda + dx * perPx,
    phi: clampPhi(start.phi - dy * perPx),
  };
}

/**
 * A wheel notch applied to the current zoom multiplier. `deltaY < 0`
 * (scroll up) zooms in; result is clamped to `[ZOOM_MIN, ZOOM_MAX]`. One
 * notch in then one notch out returns to where you started.
 */
export function zoomBy(current: number, deltaY: number): number {
  const next = deltaY < 0 ? current * ZOOM_STEP : current / ZOOM_STEP;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
}
