import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SourceToggle } from "../SourceToggle";

describe("SourceToggle", () => {
  it("renders both source options", () => {
    const html = renderToStaticMarkup(
      <SourceToggle value="comext" onChange={() => {}} pending={false} />,
    );
    expect(html).toContain("COMEXT");
    expect(html).toContain("Surveillance");
  });

  it("shows the caption for the selected source", () => {
    const comext = renderToStaticMarkup(
      <SourceToggle value="comext" onChange={() => {}} pending={false} />,
    );
    expect(comext).toContain("Validated Eurostat trade statistics, updated monthly");

    const surv = renderToStaticMarkup(
      <SourceToggle value="surveillance" onChange={() => {}} pending={false} />,
    );
    expect(surv).toContain("Provisional customs records, updated weekly");
  });

  it("marks itself busy while pending", () => {
    const html = renderToStaticMarkup(
      <SourceToggle value="comext" onChange={() => {}} pending={true} />,
    );
    expect(html).toContain('aria-busy="true"');
  });
});
