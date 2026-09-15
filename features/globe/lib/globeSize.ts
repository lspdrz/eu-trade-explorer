import { GLOBE_MAX, GLOBE_MIN } from "@/features/globe/constants/globeConfig";

/**
 * The globe canvas is square, so its container's width alone isn't a safe
 * size — a wide-but-short viewport (a 13" laptop) can fit the width fine
 * while the resulting height pushes the page past the fold. Clamping by
 * the vertical room below the canvas's top offset as well keeps the whole
 * globe on screen without a scroll.
 */
export function computeGlobeSize({
  width,
  top,
  viewportHeight,
  reservedBelow,
}: {
  width: number;
  top: number;
  viewportHeight: number;
  reservedBelow: number;
}): number {
  const heightBudget = viewportHeight - top - reservedBelow;
  return Math.max(GLOBE_MIN, Math.min(GLOBE_MAX, width, heightBudget));
}
