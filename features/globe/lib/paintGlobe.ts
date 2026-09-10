import { geoGraticule10, type GeoPath, geoInterpolate } from "d3-geo";
import { EU_ANCHOR } from "@/features/globe/constants/euAnchor";
import type { Land } from "@/features/globe/types";
import { edgeFade, sampleArc } from "@/features/globe/lib/flowArc";
import { isOnFrontHemisphere } from "@/features/globe/lib/hemisphere";
import type { Particle } from "@/features/globe/lib/particles";
import type { GlobeTokens } from "@/features/globe/lib/themeTokens";

const TAU = 2 * Math.PI;

/**
 * Everything a frame needs, gathered once per `draw()`. The projection is
 * already rotated and scaled for this frame; `path` is `geoPath(projection,
 * ctx)` and `project` is the bare `projection(point)`.
 */
export interface Scene {
  ctx: CanvasRenderingContext2D;
  path: GeoPath;
  project: (point: [number, number]) => [number, number] | null;
  tokens: GlobeTokens;
  land: Land[];
  activeCodes: string[];
  active: Set<string>;
  hoverCode: string | undefined;
  /** Lon/lat the camera looks straight at — the hemisphere-cull reference. */
  viewCenter: [number, number];
  centroidByCode: Map<string, [number, number]>;
  tonnesByCode: Map<string, number>;
  arcWidth: (tonnes: number) => number;
  particles: Map<string, Particle[]>;
}

/** The ocean disc, filled, with a hairline limb so the sphere edge reads. */
export function paintOcean({ ctx, path, tokens }: Scene): void {
  ctx.beginPath();
  path({ type: "Sphere" });
  ctx.fillStyle = tokens.surface;
  ctx.fill();
  ctx.strokeStyle = tokens.baseline;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function paintGraticule({ ctx, path, tokens }: Scene): void {
  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = tokens.border;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Country fills — `border` tone normally, `series1` wash for active/hovered. */
export function paintLand({
  ctx,
  path,
  tokens,
  land,
  active,
  hoverCode,
}: Scene): void {
  for (const l of land) {
    const lit = l.code != null && (active.has(l.code) || hoverCode === l.code);
    ctx.beginPath();
    path(l.feature);
    ctx.fillStyle = lit ? tokens.series1 : tokens.border;
    ctx.globalAlpha = lit ? 0.22 : 1;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = tokens.baseline;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

/** One great-circle arc + its stream of particles per active origin. */
export function paintFlows(scene: Scene): void {
  for (const code of scene.activeCodes) paintFlow(scene, code);
}

function paintFlow(scene: Scene, code: string): void {
  const { ctx, path, tokens, centroidByCode, tonnesByCode, arcWidth } = scene;
  const from = centroidByCode.get(code);
  if (!from) return; // a partner with no polygon in the topology

  const interp = geoInterpolate(from, EU_ANCHOR);

  ctx.beginPath();
  path({ type: "LineString", coordinates: sampleArc(interp) });
  ctx.strokeStyle = tokens.series1;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = arcWidth(tonnesByCode.get(code) ?? 0);
  ctx.stroke();
  ctx.globalAlpha = 1;

  paintParticles(scene, interp, scene.particles.get(code) ?? []);
}

function paintParticles(
  { ctx, project, tokens, viewCenter }: Scene,
  interp: (t: number) => [number, number],
  particles: Particle[],
): void {
  ctx.fillStyle = tokens.series1;
  for (const p of particles) {
    const at = interp(p.t);
    if (!isOnFrontHemisphere(at, viewCenter)) continue; // behind the limb
    const xy = project(at);
    if (!xy) continue;
    ctx.globalAlpha = edgeFade(p.t);
    ctx.beginPath();
    ctx.arc(xy[0], xy[1], 1.5, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The dot every arc converges on (Brussels). Skipped when it's round the back. */
export function paintAnchor({ ctx, project, tokens, viewCenter }: Scene): void {
  if (!isOnFrontHemisphere(EU_ANCHOR, viewCenter)) return;
  const xy = project(EU_ANCHOR);
  if (!xy) return;
  ctx.beginPath();
  ctx.arc(xy[0], xy[1], 3, 0, TAU);
  ctx.fillStyle = tokens.foreground;
  ctx.fill();
}
