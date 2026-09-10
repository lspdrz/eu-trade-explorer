import { describe, expect, it } from "vitest";
import type { ChartEvent } from "../../../types";
import { layoutEventFlags } from "../layoutEventFlags";

const ev = (id: string, year: number, month: number, label = "E"): ChartEvent => ({
  id,
  year,
  month,
  label,
});

describe("layoutEventFlags", () => {
  it("puts a lone event on row 0", () => {
    const r = layoutEventFlags([ev("a", 2022, 6)], () => 100, 800);
    expect(r.rowCount).toBe(1);
    expect(r.placements[0]).toMatchObject({ x: 100, left: 100, row: 0 });
  });

  it("keeps well-separated events on the same row", () => {
    const xs: Record<string, number> = { a: 50, b: 700 };
    const r = layoutEventFlags(
      [ev("a", 2020, 1), ev("b", 2024, 1)],
      (e) => xs[e.id],
      800,
    );
    expect(r.placements.map((p) => p.row)).toEqual([0, 0]);
    expect(r.rowCount).toBe(1);
  });

  it("drops an overlapping event to the next row", () => {
    const xs: Record<string, number> = { a: 100, b: 120 };
    const r = layoutEventFlags(
      [ev("a", 2022, 1, "Russia invades Ukraine"), ev("b", 2022, 2, "Gas cap")],
      (e) => xs[e.id],
      800,
    );
    expect(r.placements.find((p) => p.event.id === "b")!.row).toBe(1);
    expect(r.rowCount).toBe(2);
  });

  it("stacks three tight events on rows 0/1/2", () => {
    const xs: Record<string, number> = { a: 100, b: 115, c: 130 };
    const r = layoutEventFlags(
      [
        ev("a", 2022, 1, "Long label one"),
        ev("b", 2022, 2, "Long label two"),
        ev("c", 2022, 3, "Long label three"),
      ],
      (e) => xs[e.id],
      800,
    );
    expect(r.placements.map((p) => p.row).sort()).toEqual([0, 1, 2]);
  });

  it("clamps a right-edge flag's left so it stays on canvas, keeping x", () => {
    const r = layoutEventFlags([ev("a", 2024, 12, "US election result")], () => 790, 800);
    const p = r.placements[0];
    expect(p.x).toBe(790);
    expect(p.left).toBeLessThan(790);
    expect(p.left).toBeGreaterThanOrEqual(0);
  });

  it("sorts unsorted input by date", () => {
    const xs: Record<string, number> = { a: 50, b: 700 };
    const r = layoutEventFlags(
      [ev("b", 2024, 1), ev("a", 2020, 1)],
      (e) => xs[e.id],
      800,
    );
    expect(r.placements.map((p) => p.event.id)).toEqual(["a", "b"]);
  });
});
