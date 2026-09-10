import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

import { SourceToggle } from "../SourceToggle";

describe("SourceToggle", () => {
  it("renders both source options", () => {
    const html = renderToStaticMarkup(<SourceToggle />);
    expect(html).toContain("COMEXT");
    expect(html).toContain("Surveillance");
  });

  it("carries each source's explanation as a hover tooltip on its option", () => {
    const html = renderToStaticMarkup(<SourceToggle />);
    expect(html).toContain('title="Validated Eurostat trade statistics, updated monthly"');
    expect(html).toContain('title="Provisional customs records, updated weekly"');
  });

  it("checks COMEXT when ?source= is absent", () => {
    const html = renderToStaticMarkup(<SourceToggle />);
    expect(html).toMatch(
      /COMEXT[\s\S]{0,150}(aria-checked="true"|data-checked)|(aria-checked="true"|data-checked)[\s\S]{0,150}COMEXT/,
    );
  });
});
