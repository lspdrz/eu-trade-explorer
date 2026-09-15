import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Nav } from "@/app/_components/Nav";
import { NAV_LINKS } from "@/app/_constants/navLinks";

vi.mock("next/navigation", () => ({
  usePathname: () => "/globe",
}));

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

  it("marks only the link matching the current path as the active page", () => {
    const html = renderToStaticMarkup(<Nav />);
    const links = html.match(/<a [^>]*>/g) ?? [];
    const activeLinks = links.filter((tag) => tag.includes('aria-current="page"'));

    expect(activeLinks).toHaveLength(1);
    expect(activeLinks[0]).toContain('href="/globe"');
  });
});
