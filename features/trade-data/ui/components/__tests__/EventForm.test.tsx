import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EventForm, draftValid, emptyDraft } from "@/features/trade-data/ui/components/EventForm";

describe("draftValid", () => {
  it("requires a non-empty trimmed label and an in-range month/year", () => {
    expect(draftValid({ year: 2022, month: 3, label: "War" })).toBe(true);
    expect(draftValid({ year: 2022, month: 3, label: "   " })).toBe(false);
    expect(draftValid({ year: 1500, month: 3, label: "War" })).toBe(false);
    expect(draftValid({ year: 2022, month: 13, label: "War" })).toBe(false);
    expect(draftValid({ year: 2022.5, month: 3, label: "War" })).toBe(false);
  });
});

describe("emptyDraft", () => {
  it("starts on January with a blank label", () => {
    const d = emptyDraft();
    expect(d.month).toBe(1);
    expect(d.label).toBe("");
    expect(Number.isInteger(d.year)).toBe(true);
  });
});

describe("EventForm", () => {
  const noop = vi.fn();

  it("renders a month option for every month and the initial year", () => {
    const html = renderToStaticMarkup(
      <EventForm
        initial={{ year: 2019, month: 1, label: "" }}
        submitLabel="Add"
        onSubmit={noop}
      />,
    );
    expect((html.match(/<option/g) ?? []).length).toBe(12);
    expect(html).toContain('value="2019"');
    expect(html).toContain('maxLength="80"');
  });

  it("labels the submit button and disables it for an invalid initial draft", () => {
    const html = renderToStaticMarkup(
      <EventForm
        initial={emptyDraft()}
        submitLabel="Add event"
        onSubmit={noop}
      />,
    );
    expect(html).toMatch(/Add event<\/button>/);
    expect(html).toMatch(/<button type="submit" disabled/);
  });

  it("enables submit when the initial draft is valid", () => {
    const html = renderToStaticMarkup(
      <EventForm
        initial={{ year: 2022, month: 3, label: "Russia invades Ukraine" }}
        submitLabel="Save"
        onSubmit={noop}
      />,
    );
    expect(html).not.toMatch(/<button type="submit" disabled/);
  });

  it("shows Cancel only when onCancel is given", () => {
    const withCancel = renderToStaticMarkup(
      <EventForm
        initial={emptyDraft()}
        submitLabel="Add"
        onSubmit={noop}
        onCancel={noop}
      />,
    );
    const without = renderToStaticMarkup(
      <EventForm initial={emptyDraft()} submitLabel="Add" onSubmit={noop} />,
    );
    expect(withCancel).toContain("Cancel");
    expect(without).not.toContain("Cancel");
  });
});
