"use client";

import {
  geoCentroid,
  geoContains,
  geoGraticule10,
  geoInterpolate,
  geoOrthographic,
  geoPath,
} from "d3-geo";
import { format } from "d3-format";
import type { Feature, FeatureCollection } from "geojson";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import {
  ARC_SAMPLES,
  GLOBE_MAX,
  GLOBE_MIN,
  INITIAL_ROTATION,
  PARTICLE_SPEED,
} from "@/features/globe/constants/globeConfig";
import { EU_ANCHOR } from "@/features/globe/constants/euAnchor";
import { ISO3166_NUMERIC_TO_ALPHA2 } from "@/features/globe/constants/iso3166";
import type { PartnerImportTotal } from "@/features/globe/types";
import { buildGlobeSummary } from "@/features/globe/lib/globeSummary";
import { isOnFrontHemisphere } from "@/features/globe/lib/hemisphere";
import { makeImportWidthScale } from "@/features/globe/lib/importWidthScale";
import {
  type Particle,
  randomPhases,
  spacedPhases,
  stepParticles,
} from "@/features/globe/lib/particles";
import { type Rotation, rotationDelta, zoomBy } from "@/features/globe/lib/projectionMath";
import { readGlobeTokens } from "@/features/globe/lib/themeTokens";

const GEO_URL = "/geo/countries-110m.json";

/** Compact tonnes at 3 significant figures — "69.7M", "400k". */
const compact = (n: number) => format(".3s")(n).replace("G", "B");

type Land = { code: string | null; feature: Feature; centroid: [number, number] };
type Hover = { code: string; x: number; y: number };

const PLACEHOLDER_TOKENS = {
  surface: "#fcfcfb",
  background: "#f9f9f7",
  border: "#e1e0d9",
  baseline: "#c3c2b7",
  series1: "#2a78d6",
  muted: "#52514e",
  foreground: "#0b0b0b",
};

export function ImportFlowGlobe({
  totals,
  activeCodes,
  onToggle,
}: {
  totals: PartnerImportTotal[];
  activeCodes: string[];
  onToggle: (code: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(GLOBE_MIN);
  const [land, setLand] = useState<Land[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [hovered, setHovered] = useState<Hover | undefined>();

  // Mirror of `hovered` the draw loop reads without being a hook dep —
  // otherwise every mousemove would tear down and rebuild the canvas effect.
  const hoveredRef = useRef<Hover | undefined>(undefined);
  const setHover = (h: Hover | undefined) => {
    hoveredRef.current = h;
    setHovered(h);
  };

  const summary = buildGlobeSummary(totals, activeCodes);
  const tonnesByCode = useMemo(
    () => new Map(totals.map((t) => [t.partnerCode, t.tonnes])),
    [totals],
  );
  const rankByCode = useMemo(
    () => new Map(totals.map((t, i) => [t.partnerCode, i + 1])),
    [totals],
  );
  const nameByCode = useMemo(
    () => new Map(totals.map((t) => [t.partnerCode, t.partner])),
    [totals],
  );

  const rotationRef = useRef<Rotation>({ ...INITIAL_ROTATION });
  const zoomRef = useRef(1);
  const particlesRef = useRef<Map<string, Particle[]>>(new Map());
  const tokensRef = useRef(PLACEHOLDER_TOKENS);
  const reducedRef = useRef(false);
  // Set inside the draw effect to point at its `draw()`; lets the reset
  // button trigger a repaint without re-running the whole effect.
  const drawRef = useRef<() => void>(() => {});

  const resetView = useCallback(() => {
    rotationRef.current = { ...INITIAL_ROTATION };
    zoomRef.current = 1;
    drawRef.current();
  }, []);

  // --- 1. load the topology once ---
  useEffect(() => {
    let cancelled = false;
    fetch(GEO_URL)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((topo) => {
        if (cancelled) return;
        const fc = feature(
          topo,
          topo.objects.countries,
        ) as unknown as FeatureCollection;
        setLand(
          fc.features.map((f) => ({
            code: ISO3166_NUMERIC_TO_ALPHA2[String(f.id)] ?? null,
            feature: f,
            centroid: geoCentroid(f) as [number, number],
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- 2. size to the wrapper ---
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w) setSize(Math.max(GLOBE_MIN, Math.min(GLOBE_MAX, Math.round(w))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- 3. theme tokens: read now, and on data-theme change ---
  useEffect(() => {
    const read = () => {
      tokensRef.current = readGlobeTokens();
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    reducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return () => mo.disconnect();
  }, []);

  // --- 4. reconcile particle phases when the active set / data changes ---
  const activeKey = activeCodes.join(",");
  useEffect(() => {
    const scale = makeImportWidthScale(totals[0]?.tonnes ?? 0);
    const next = new Map<string, Particle[]>();
    for (const code of activeCodes) {
      const count = scale.count(tonnesByCode.get(code) ?? 0);
      const prev = particlesRef.current.get(code);
      next.set(
        code,
        prev && prev.length === count
          ? prev
          : reducedRef.current
            ? spacedPhases(count)
            : randomPhases(count),
      );
    }
    particlesRef.current = next;
    // activeKey covers activeCodes; tonnesByCode covers totals.
  }, [activeKey, activeCodes, totals, tonnesByCode]);

  // --- 5. the draw + animation loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !land) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const projection = geoOrthographic().fitExtent(
      [
        [8, 8],
        [size - 8, size - 8],
      ],
      { type: "Sphere" },
    );
    const baseScale = projection.scale();
    const path = geoPath(projection, ctx);
    const widthScale = makeImportWidthScale(totals[0]?.tonnes ?? 0);
    const active = new Set(activeCodes);
    const centroidByCode = new Map(
      land.filter((l) => l.code).map((l) => [l.code as string, l.centroid]),
    );

    const draw = () => {
      const t = tokensRef.current;
      const r = rotationRef.current;
      projection.rotate([r.lambda, r.phi, 0]);
      projection.scale(baseScale * zoomRef.current);
      const viewCenter: [number, number] = [-r.lambda, -r.phi];
      const hoverCode = hoveredRef.current?.code;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      // ocean sphere — filled, with a visible limb
      ctx.beginPath();
      path({ type: "Sphere" });
      ctx.fillStyle = t.surface;
      ctx.fill();
      ctx.strokeStyle = t.baseline;
      ctx.lineWidth = 1;
      ctx.stroke();

      // graticule
      ctx.beginPath();
      path(geoGraticule10());
      ctx.strokeStyle = t.border;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // land — a clearly distinct tone from the ocean
      for (const l of land) {
        ctx.beginPath();
        path(l.feature);
        const lit = l.code && (active.has(l.code) || hoverCode === l.code);
        if (lit) {
          ctx.fillStyle = t.series1;
          ctx.globalAlpha = 0.22;
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = t.border;
          ctx.fill();
        }
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = t.baseline;
        ctx.stroke();
      }

      // arcs + particles
      for (const code of activeCodes) {
        const from = centroidByCode.get(code);
        if (!from) continue;
        const interp = geoInterpolate(from, EU_ANCHOR);
        const coords = Array.from({ length: ARC_SAMPLES + 1 }, (_, i) =>
          interp(i / ARC_SAMPLES),
        );
        ctx.beginPath();
        path({ type: "LineString", coordinates: coords });
        ctx.strokeStyle = t.series1;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = widthScale.width(tonnesByCode.get(code) ?? 0);
        ctx.stroke();
        ctx.globalAlpha = 1;

        for (const p of particlesRef.current.get(code) ?? []) {
          const pt = interp(p.t) as [number, number];
          if (!isOnFrontHemisphere(pt, viewCenter)) continue;
          const xy = projection(pt);
          if (!xy) continue;
          const fade =
            p.t < 0.08 ? p.t / 0.08 : p.t > 0.92 ? (1 - p.t) / 0.08 : 1;
          ctx.beginPath();
          ctx.arc(xy[0], xy[1], 1.5, 0, 2 * Math.PI);
          ctx.fillStyle = t.series1;
          ctx.globalAlpha = fade;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // EU anchor
      const anchor = projection(EU_ANCHOR);
      if (anchor && isOnFrontHemisphere(EU_ANCHOR, viewCenter)) {
        ctx.beginPath();
        ctx.arc(anchor[0], anchor[1], 3, 0, 2 * Math.PI);
        ctx.fillStyle = t.foreground;
        ctx.fill();
      }
      ctx.restore();
    };
    drawRef.current = draw;

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      stepParticles(particlesRef.current, dt, PARTICLE_SPEED);
      draw();
      raf = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (reducedRef.current || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    draw();
    startLoop();

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      startLoop();
      if (reducedRef.current) draw();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // --- interaction ---
    let dragStart: { x: number; y: number; rot: Rotation } | null = null;
    let moved = false;

    const toLocal = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      moved = false;
      dragStart = { ...toLocal(e), rot: { ...rotationRef.current } };
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = toLocal(e);
      if (dragStart) {
        if (Math.hypot(x - dragStart.x, y - dragStart.y) > 3) moved = true;
        rotationRef.current = rotationDelta(
          dragStart.rot,
          x - dragStart.x,
          y - dragStart.y,
          projection.scale(),
        );
        if (reducedRef.current) draw();
        return;
      }
      const lonlat = projection.invert?.([x, y]);
      let code: string | null = null;
      if (lonlat && Number.isFinite(lonlat[0])) {
        for (const l of land) {
          if (l.code && geoContains(l.feature, lonlat)) {
            code = l.code;
            break;
          }
        }
      }
      setHover(code ? { code, x, y } : undefined);
    };
    const onUp = (e: PointerEvent) => {
      canvas.releasePointerCapture(e.pointerId);
      const wasClick = dragStart && !moved;
      dragStart = null;
      const code = hoveredRef.current?.code;
      if (wasClick && code) onToggle(code);
    };
    const onLeave = () => setHover(undefined);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = zoomBy(zoomRef.current, e.deltaY);
      if (reducedRef.current) draw();
    };
    const onKey = (e: KeyboardEvent) => {
      const step = 8;
      const r = rotationRef.current;
      if (e.key === "ArrowLeft")
        rotationRef.current = { ...r, lambda: r.lambda - step };
      else if (e.key === "ArrowRight")
        rotationRef.current = { ...r, lambda: r.lambda + step };
      else if (e.key === "ArrowUp")
        rotationRef.current = rotationDelta(r, 0, -step * 4, projection.scale());
      else if (e.key === "ArrowDown")
        rotationRef.current = rotationDelta(r, 0, step * 4, projection.scale());
      else return;
      e.preventDefault();
      if (reducedRef.current) draw();
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKey);
    };
    // hovered is intentionally NOT a dep — the loop reads hoveredRef.
  }, [land, size, activeKey, activeCodes, totals, tonnesByCode, onToggle]);

  const hoveredTonnes =
    hovered && tonnesByCode.has(hovered.code)
      ? tonnesByCode.get(hovered.code)!
      : undefined;

  return (
    <div ref={wrapRef} className="relative min-w-0">
      {loadError ? (
        <div
          className="flex items-center justify-center rounded-lg border border-border text-sm text-muted"
          style={{ height: size }}
        >
          Couldn&rsquo;t load the map.
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={summary}
            tabIndex={0}
            className="touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-series-1)]"
            style={{ width: size, height: size, cursor: "grab" }}
          />
          <div className="mt-3" style={{ width: size }}>
            <button
              type="button"
              onClick={resetView}
              className="text-sm text-muted underline hover:text-foreground"
            >
              Reset view
            </button>
          </div>
        </>
      )}

      {hovered && hoveredTonnes !== undefined && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-2 py-1 text-xs whitespace-nowrap shadow-sm"
          style={{ left: hovered.x, top: hovered.y - 8 }}
        >
          {nameByCode.get(hovered.code)} — {compact(hoveredTonnes)} t · #
          {rankByCode.get(hovered.code)} of {totals.length}
        </div>
      )}
    </div>
  );
}
