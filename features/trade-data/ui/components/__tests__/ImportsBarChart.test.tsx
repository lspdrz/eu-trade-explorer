import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupedSeries } from "../../../types";

let eventsState = {
  enabled: false,
  events: [] as { id: string; year: number; month: number; label: string }[],
};
vi.mock("../../hooks/useChartEvents", () => ({
  useChartEvents: () => ({
    ...eventsState,
    setEnabled: vi.fn(),
    addEvent: vi.fn(),
    updateEvent: vi.fn(),
    removeEvent: vi.fn(),
  }),
}));

import { ImportsBarChart } from "../ImportsBarChart";

const seriesMeta = [
  { key: "US", name: "United States", color: "#111" },
  { key: "EG", name: "Egypt", color: "#222" },
];

const grid: GroupedSeries = {
  years: [2020, 2021, 2022],
  points: [
    { seriesKey: "US", year: 2020, tonnes: 100 },
    { seriesKey: "US", year: 2021, tonnes: 200 },
    { seriesKey: "US", year: 2022, tonnes: 50 },
    { seriesKey: "EG", year: 2020, tonnes: 0 },
    { seriesKey: "EG", year: 2021, tonnes: 80 },
    { seriesKey: "EG", year: 2022, tonnes: 40 },
  ],
};

function countBars(html: string): number {
  return (html.match(/class="[^"]*chart-bar/g) ?? []).length;
}

beforeEach(() => {
  eventsState = { enabled: false, events: [] };
});

describe("ImportsBarChart", () => {
  it("renders one bar per (series, year)", () => {
    const html = renderToStaticMarkup(
      <ImportsBarChart series={grid} seriesMeta={seriesMeta} ariaLabel="x" width={800} />,
    );
    expect(countBars(html)).toBe(6);
  });

  it("uses the given aria-label on the svg", () => {
    const html = renderToStaticMarkup(
      <ImportsBarChart
        series={grid}
        seriesMeta={seriesMeta}
        ariaLabel="Russia&#x27;s EU imports in tonnes per year for Ammonia"
        width={800}
      />,
    );
    expect(html).toContain('aria-label="Russia&#x27;s EU imports in tonnes per year for Ammonia"');
  });

  it("marks partial-year bars", () => {
    const html = renderToStaticMarkup(
      <ImportsBarChart
        series={grid}
        seriesMeta={seriesMeta}
        ariaLabel="x"
        partialYear={2022}
        width={800}
      />,
    );
    expect((html.match(/data-partial="true"/g) ?? []).length).toBe(2);
  });

  it("renders a legend entry per series", () => {
    const html = renderToStaticMarkup(
      <ImportsBarChart series={grid} seriesMeta={seriesMeta} ariaLabel="x" width={800} />,
    );
    expect(html).toContain("United States");
    expect(html).toContain("Egypt");
  });

  it("works with product keys", () => {
    const productGrid: GroupedSeries = {
      years: [2021],
      points: [
        { seriesKey: "Ammonia", year: 2021, tonnes: 5 },
        { seriesKey: "Urea", year: 2021, tonnes: 9 },
      ],
    };
    const html = renderToStaticMarkup(
      <ImportsBarChart
        series={productGrid}
        seriesMeta={[
          { key: "Ammonia", name: "Ammonia", color: "#111" },
          { key: "Urea", name: "Urea", color: "#222" },
        ]}
        ariaLabel="x"
        width={800}
      />,
    );
    expect(countBars(html)).toBe(2);
    expect(html).toContain('data-series="Ammonia"');
  });
});

describe("ImportsBarChart event markers", () => {
  it("draws a flag + rule when the layer is on and the event is in range", () => {
    eventsState = {
      enabled: true,
      events: [{ id: "a", year: 2021, month: 6, label: "Test event" }],
    };
    const html = renderToStaticMarkup(
      <ImportsBarChart series={grid} seriesMeta={seriesMeta} ariaLabel="x" width={800} />,
    );
    expect(html).toContain("data-event-flag");
    expect(html).toContain("data-event-rule");
    expect(html).toContain("Jun 2021");
  });

  it("draws nothing when the layer is off", () => {
    eventsState = {
      enabled: false,
      events: [{ id: "a", year: 2021, month: 6, label: "Test event" }],
    };
    const html = renderToStaticMarkup(
      <ImportsBarChart series={grid} seriesMeta={seriesMeta} ariaLabel="x" width={800} />,
    );
    expect(html).not.toContain("data-event-flag");
  });

  it("ignores an event outside the visible years", () => {
    eventsState = {
      enabled: true,
      events: [{ id: "a", year: 1999, month: 6, label: "Old" }],
    };
    const html = renderToStaticMarkup(
      <ImportsBarChart series={grid} seriesMeta={seriesMeta} ariaLabel="x" width={800} />,
    );
    expect(html).not.toContain("data-event-flag");
  });
});
