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

  it("carries each source's explanation as a hover tooltip on its option", () => {
    const html = renderToStaticMarkup(
      <SourceToggle value="comext" onChange={() => {}} pending={false} />,
    );
    expect(html).toContain('title="Validated Eurostat trade statistics, updated monthly"');
    expect(html).toContain('title="Provisional customs records, updated weekly"');
  });

  it("marks itself busy while pending", () => {
    const html = renderToStaticMarkup(
      <SourceToggle value="comext" onChange={() => {}} pending={true} />,
    );
    expect(html).toContain('aria-busy="true"');
  });
});
