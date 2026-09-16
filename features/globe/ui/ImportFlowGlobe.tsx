"use client";

import {
  geoCentroid,
  geoContains,
  geoOrthographic,
  geoPath,
} from "d3-geo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import {
  GLOBE_MIN,
  INITIAL_ROTATION,
  PARTICLE_SPEED,
} from "@/features/globe/constants/globeConfig";
import { ISO3166_NUMERIC_TO_ALPHA2 } from "@/features/globe/constants/iso3166";
import type { Land, PartnerImportTotal } from "@/features/globe/types";
import { HoverTooltip } from "@/features/globe/ui/HoverTooltip";
import { computeGlobeSize } from "@/features/globe/lib/globeSize";
import { buildGlobeSummary } from "@/features/globe/lib/globeSummary";
import { makeImportWidthScale } from "@/features/globe/lib/importWidthScale";
import {
  type Particle,
  randomPhases,
  spacedPhases,
  stepParticles,
} from "@/features/globe/lib/particles";
import {
  paintAnchor,
  paintFlows,
  paintGraticule,
  paintLand,
  paintOcean,
  type Scene,
} from "@/features/globe/lib/paintGlobe";
import { type Rotation, rotationDelta, zoomBy, zoomByFactor } from "@/features/globe/lib/projectionMath";
import { readGlobeTokens } from "@/features/globe/lib/themeTokens";

const GEO_URL = "/geo/countries-110m.json";

/** Space below the canvas: the gap + "Reset view" link (`mt-3` + line
 *  height) plus the page's bottom padding (`py-10`). */
const RESERVED_BELOW_GLOBE = 80;

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
  // Covers every country on the globe, not just ones with import data —
  // nameByCode is COMEXT_PARTNER_NAMES-derived and only has entries for
  // partners with at least one recorded row. Falls back to the 110m
  // topology's own Natural Earth name for the "no data" tooltip case.
  const landNameByCode = useMemo(
    () =>
      new Map(
        (land ?? [])
          .filter((l): l is Land & { code: string } => l.code !== null)
          .map((l) => [l.code, l.feature.properties?.name as string | undefined]),
      ),
    [land],
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
      .then((topo: Topology<{ countries: GeometryCollection }>) => {
        if (cancelled) return;
        const fc = feature(topo, topo.objects.countries);
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

  // --- 2. size to the wrapper's width and the viewport's remaining height ---
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    let width = 0;
    const recompute = () => {
      if (!width) return;
      setSize(
        Math.round(
          computeGlobeSize({
            width,
            top: el.getBoundingClientRect().top,
            viewportHeight: window.innerHeight,
            reservedBelow: RESERVED_BELOW_GLOBE,
          }),
        ),
      );
    };

    // A window resize can shrink the viewport's height without changing the
    // wrapper's width, which wouldn't otherwise trigger the ResizeObserver.
    const ro = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      recompute();
    });
    ro.observe(el);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
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
      const r = rotationRef.current;
      projection.rotate([r.lambda, r.phi, 0]).scale(baseScale * zoomRef.current);

      const scene: Scene = {
        ctx,
        path,
        project: (p) => projection(p) ?? null,
        tokens: tokensRef.current,
        land,
        activeCodes,
        active,
        hoverCode: hoveredRef.current?.code,
        viewCenter: [-r.lambda, -r.phi],
        centroidByCode,
        tonnesByCode,
        arcWidth: widthScale.width,
        particles: particlesRef.current,
      };

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);
      paintOcean(scene);
      paintGraticule(scene);
      paintLand(scene);
      paintFlows(scene);
      paintAnchor(scene);
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
    // One active pointer rotates (drag); a second turns the gesture into a
    // pinch-zoom instead — tracked by pointerId (not just "the last pointer
    // that moved") since two touches fire independent, interleaved
    // pointermove events. A mouse never has a second concurrent pointer, so
    // this is a pure addition for touch: it doesn't change single-pointer
    // (mouse or one-finger touch) behavior at all.
    const pointers = new Map<number, { x: number; y: number }>();
    let dragStart: { x: number; y: number; rot: Rotation } | null = null;
    let moved = false;
    let pinchStart: { distance: number; zoom: number } | null = null;
    let wasPinching = false;

    const toLocal = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    // Shared by the hover lookup below (mouse only — see onUp) and onUp's
    // own tap-position lookup (the only source of the code for a touch tap,
    // which never populates hoveredRef in the first place).
    const codeAt = (x: number, y: number): string | null => {
      const lonlat = projection.invert?.([x, y]);
      if (!lonlat || !Number.isFinite(lonlat[0])) return null;
      for (const l of land) {
        if (l.code && geoContains(l.feature, lonlat)) return l.code;
      }
      return null;
    };
    const pinchDistance = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const p = toLocal(e);
      pointers.set(e.pointerId, p);

      if (pointers.size === 2) {
        dragStart = null; // a second touch always cancels any single-finger drag
        wasPinching = true;
        pinchStart = { distance: pinchDistance(), zoom: zoomRef.current };
      } else if (pointers.size === 1) {
        moved = false;
        dragStart = { ...p, rot: { ...rotationRef.current } };
      }
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = toLocal(e);
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x, y });

      if (pointers.size === 2 && pinchStart) {
        zoomRef.current = zoomByFactor(pinchStart.zoom, pinchDistance() / pinchStart.distance);
        if (reducedRef.current) draw();
        return;
      }
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
      const code = codeAt(x, y);
      setHover(code ? { code, x, y } : undefined);
    };
    const onUp = (e: PointerEvent) => {
      canvas.releasePointerCapture(e.pointerId);
      pointers.delete(e.pointerId);
      pinchStart = null;

      if (pointers.size === 1) {
        // One finger lifted out of a pinch — resume rotating from the
        // remaining finger's current position rather than jumping to
        // wherever it started (that finger's own drag never had a start).
        const [[, p]] = pointers;
        dragStart = { ...p, rot: { ...rotationRef.current } };
        moved = false;
        return;
      }
      if (pointers.size > 0) return;

      const wasClick = dragStart && !moved && !wasPinching;
      dragStart = null;
      wasPinching = false;
      // hoveredRef is mouse-only (see onMove) — a touch tap never hovers
      // first, so it has to resolve its own country from where it lifted.
      const { x, y } = toLocal(e);
      const code = hoveredRef.current?.code ?? codeAt(x, y);
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

  return (
    // relative: the button below anchors to this full column, not the
    // narrower centered globe box, so it sits in the open margin beside
    // the globe (right of the circle) rather than overlapping the canvas.
    <div ref={wrapRef} className="relative min-w-0">
      {loadError ? (
        <div
          className="flex items-center justify-center rounded-lg border border-border text-sm text-muted"
          style={{ height: size }}
        >
          Couldn&rsquo;t load the map.
        </div>
      ) : (
        <div className="relative mx-auto" style={{ width: size }}>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={summary}
            tabIndex={0}
            className="touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-series-1)]"
            style={{ width: size, height: size, cursor: "grab" }}
          />

          {hovered && (
            <HoverTooltip
              hovered={hovered}
              landName={landNameByCode.get(hovered.code)}
              tonnesByCode={tonnesByCode}
              nameByCode={nameByCode}
              rankByCode={rankByCode}
              totalCount={totals.length}
            />
          )}
        </div>
      )}

      {!loadError && (
        <button
          type="button"
          onClick={resetView}
          className="absolute top-0 right-0 z-10 cursor-pointer text-sm text-muted underline hover:text-foreground"
        >
          Reset view
        </button>
      )}
    </div>
  );
}
