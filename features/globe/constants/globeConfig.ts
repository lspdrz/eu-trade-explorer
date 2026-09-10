/** Tunables for the globe view. */

/** Origin countries shown before the user touches the selection. */
export const DEFAULT_TOP_N = 10;
/** Hard cap on simultaneously-shown origins (URL guard + picker limit). */
export const MAX_GLOBE_COUNTRIES = 12;

/** Canvas edge length is clamped to this range (CSS px). */
export const GLOBE_MIN = 320;
export const GLOBE_MAX = 720;

/** Particle travel, as a fraction of arc length per second. */
export const PARTICLE_SPEED = 0.12;
/** Great-circle samples per arc. */
export const ARC_SAMPLES = 48;
/**
 * Drag-to-rotate sensitivity: degrees swept ≈ `dx * DRAG_K / projection.scale()`.
 * ~75 is the usual value for an orthographic globe (one radius of drag ≈ a
 * quarter turn), so it feels the same at any canvas size.
 */
export const DRAG_K = 75;

/** Rotation the globe opens at (and returns to on "Reset view"). d3 `.rotate()`
 *  negates, so this centres the view on ~[15°E, 50°N]. */
export const INITIAL_ROTATION = { lambda: -15, phi: -50 };

/** Wheel-zoom multiplier range and per-notch factor. 1 = the fitted default. */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 8;
export const ZOOM_STEP = 1.15;
