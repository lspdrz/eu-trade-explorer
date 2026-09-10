import { describe, expect, it } from "vitest";
import type { StoredEvents } from "../../../types";
import {
  EMPTY_EVENTS,
  MAX_EVENTS,
  eventX,
  parseStoredEvents,
  serializeStoredEvents,
  sortEvents,
} from "../chartEvents";

const ev = (
  o: Partial<{ id: string; year: number; month: number; label: string }> = {},
) => ({
  id: o.id ?? "a",
  year: o.year ?? 2022,
  month: o.month ?? 3,
  label: o.label ?? "War",
});

describe("parseStoredEvents", () => {
  it("returns the empty default for null / non-JSON / non-object / wrong version", () => {
    expect(parseStoredEvents(null)).toEqual(EMPTY_EVENTS);
    expect(parseStoredEvents("{not json")).toEqual(EMPTY_EVENTS);
    expect(parseStoredEvents("42")).toEqual(EMPTY_EVENTS);
    expect(
      parseStoredEvents(JSON.stringify({ v: 2, enabled: true, events: [] })),
    ).toEqual(EMPTY_EVENTS);
  });

  it("coerces enabled and keeps valid events, sorted by (year, month)", () => {
    const raw = JSON.stringify({
      v: 1,
      enabled: 1,
      events: [
        ev({ id: "b", year: 2023, month: 1 }),
        ev({ id: "a", year: 2022, month: 6 }),
      ],
    });
    const out = parseStoredEvents(raw);
    expect(out.enabled).toBe(true);
    expect(out.events.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("drops events with a bad year, month, or empty label; clips the label", () => {
    const raw = JSON.stringify({
      v: 1,
      enabled: false,
      events: [
        ev({ id: "ok", month: 1 }),
        ev({ id: "badyear", year: 1500, month: 2 }),
        ev({ id: "badmonth", month: 13 }),
        ev({ id: "nolabel", label: "   ", month: 3 }),
        ev({ id: "long", label: "x".repeat(200), month: 4 }),
      ],
    });
    const out = parseStoredEvents(raw);
    expect(out.events.map((e) => e.id)).toEqual(["ok", "long"]);
    expect(out.events.find((e) => e.id === "long")!.label.length).toBe(80);
  });

  it("truncates to MAX_EVENTS", () => {
    const events = Array.from({ length: 30 }, (_, i) =>
      ev({ id: `e${i}`, month: (i % 12) + 1 }),
    );
    const out = parseStoredEvents(
      JSON.stringify({ v: 1, enabled: false, events }),
    );
    expect(out.events).toHaveLength(MAX_EVENTS);
  });
});

describe("serializeStoredEvents", () => {
  it("round-trips through parseStoredEvents", () => {
    const value: StoredEvents = {
      v: 1,
      enabled: true,
      events: [
        ev({ id: "a", year: 2021, month: 2 }),
        ev({ id: "b", year: 2024, month: 11 }),
      ],
    };
    expect(parseStoredEvents(serializeStoredEvents(value))).toEqual(value);
  });
});

describe("sortEvents", () => {
  it("orders by year then month", () => {
    const out = sortEvents([
      ev({ id: "c", year: 2022, month: 12 }),
      ev({ id: "a", year: 2021, month: 5 }),
      ev({ id: "b", year: 2022, month: 3 }),
    ]);
    expect(out.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
});

describe("eventX", () => {
  const x0 = (year: number) =>
    (
      { 2020: 0, 2021: 105, 2022: 210, 2023: 315, 2024: 420 } as Record<
        number,
        number
      >
    )[year];

  it("places January near the band start and December near the band end", () => {
    const jan = eventX(2022, 1, x0, 80, 64)!;
    const dec = eventX(2022, 12, x0, 80, 64)!;
    expect(jan).toBeLessThan(dec);
    expect(jan).toBeGreaterThanOrEqual(64 + 210);
    expect(dec).toBeLessThanOrEqual(64 + 210 + 80);
  });

  it("puts mid-year near the band centre", () => {
    expect(eventX(2022, 6, x0, 80, 64)!).toBeCloseTo(
      64 + 210 + 80 * (5.5 / 12),
      1,
    );
  });

  it("returns null when the year is out of range", () => {
    expect(eventX(2019, 6, x0, 80, 64)).toBeNull();
  });
});
