import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Nav } from "@/app/_components/Nav";
import { NAV_LINKS } from "@/app/_constants/navLinks";

describe("Nav", () => {
  it("renders exactly one link per NAV_LINKS entry", () => {
    const html = renderToStaticMarkup(<Nav />);
    expect((html.match(/<a /g) ?? []).length).toBe(NAV_LINKS.length);
  });

  it("renders each link's href and label", () => {
    const html = renderToStaticMarkup(<Nav />);
    for (const { href, label } of NAV_LINKS) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(label);
    }
  });
});
