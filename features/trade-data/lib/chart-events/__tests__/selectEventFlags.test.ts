import { describe, expect, it } from "vitest";
import type { ChartEvent } from "../../../types";
import { selectEventFlags } from "../selectEventFlags";

const ev = (o: Partial<ChartEvent>): ChartEvent => ({
  id: o.id ?? "a",
  year: o.year ?? 2022,
  month: o.month ?? 6,
  label: o.label ?? "E",
});

// years 2020..2024 across [0, 500], bandwidth 80
const x0 = (year: number) =>
  (
    { 2020: 0, 2021: 105, 2022: 210, 2023: 315, 2024: 420 } as Record<
      number,
      number
    >
  )[year];

const base = {
  years: [2020, 2021, 2022, 2023, 2024],
  x0,
  bandwidth: 80,
  marginLeft: 64,
  width: 600,
};

describe("selectEventFlags", () => {
  it("returns an empty layer when disabled", () => {
    expect(
      selectEventFlags({ ...base, enabled: false, events: [ev({})] }),
    ).toEqual({ placements: [], flagBandHeight: 0 });
  });

  it("returns an empty layer when nothing falls in the visible years", () => {
    expect(
      selectEventFlags({
        ...base,
        enabled: true,
        events: [ev({ year: 1999 }), ev({ year: 2030 })],
      }),
    ).toEqual({ placements: [], flagBandHeight: 0 });
  });

  it("lays out in-range events and sizes the band by row count", () => {
    const { placements, flagBandHeight } = selectEventFlags({
      ...base,
      enabled: true,
      events: [
        ev({ id: "a", year: 2021, month: 6 }),
        ev({ id: "b", year: 2023, month: 6 }),
      ],
    });
    expect(placements.map((p) => p.event.id)).toEqual(["a", "b"]);
    expect(placements.every((p) => p.row === 0)).toBe(true);
    expect(flagBandHeight).toBe(24); // 1 row * FLAG_ROW_H
  });

  it("drops out-of-range events but keeps the in-range ones", () => {
    const { placements } = selectEventFlags({
      ...base,
      enabled: true,
      events: [ev({ id: "old", year: 2010 }), ev({ id: "ok", year: 2022 })],
    });
    expect(placements.map((p) => p.event.id)).toEqual(["ok"]);
  });

  it("grows the band when flags stack", () => {
    const { flagBandHeight } = selectEventFlags({
      ...base,
      width: 600,
      enabled: true,
      events: [
        ev({ id: "a", year: 2021, month: 1, label: "A crowded label here" }),
        ev({ id: "b", year: 2021, month: 2, label: "Another crowded label" }),
      ],
    });
    expect(flagBandHeight).toBe(48); // 2 rows
  });
});
