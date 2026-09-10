import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FlagPlacement } from "../../../lib/chart-events/layoutEventFlags";
import { EventOverlay } from "../EventOverlay";

const placement = (
  o: Partial<FlagPlacement> & { label: string },
): FlagPlacement => ({
  event: {
    id: o.event?.id ?? "a",
    year: o.event?.year ?? 2022,
    month: o.event?.month ?? 3,
    label: o.label,
  },
  x: o.x ?? 100,
  left: o.left ?? 100,
  row: o.row ?? 0,
});

describe("EventOverlay", () => {
  it("renders nothing when there are no placements", () => {
    expect(
      renderToStaticMarkup(
        <EventOverlay placements={[]} plotTop={36} plotHeight={300} />,
      ),
    ).toBe("");
  });

  it("renders one rule and one flag per placement", () => {
    const html = renderToStaticMarkup(
      <EventOverlay
        placements={[
          placement({ label: "Russia invades Ukraine" }),
          placement({
            label: "Gas cap",
            event: { id: "b", year: 2022, month: 12, label: "Gas cap" },
          }),
        ]}
        plotTop={56}
        plotHeight={300}
      />,
    );
    expect((html.match(/data-event-rule/g) ?? []).length).toBe(2);
    expect((html.match(/data-event-flag/g) ?? []).length).toBe(2);
  });

  it("shows the dated label and carries the full label in title", () => {
    const html = renderToStaticMarkup(
      <EventOverlay
        placements={[
          placement({
            label: "Russia invades Ukraine",
            event: { id: "a", year: 2022, month: 3, label: "Russia invades Ukraine" },
          }),
        ]}
        plotTop={56}
        plotHeight={300}
      />,
    );
    expect(html).toContain("Mar 2022");
    expect(html).toContain('title="Russia invades Ukraine"');
    expect(html).toContain("truncate");
  });
});
