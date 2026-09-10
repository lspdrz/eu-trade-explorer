import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeToggle } from "@/app/ThemeToggle";

describe("ThemeToggle", () => {
  it("renders a labelled button (icon fills in after mount)", () => {
    const html = renderToStaticMarkup(<ThemeToggle />);
    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
    // Server render is the light default, so the label offers dark.
    expect(html).toContain('aria-label="Switch to dark mode"');
  });
});
