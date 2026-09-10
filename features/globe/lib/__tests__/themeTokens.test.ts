import { describe, expect, it } from "vitest";
import { readGlobeTokens } from "@/features/globe/lib/themeTokens";

const fakeRead = (map: Record<string, string>) =>
  (() => ({ getPropertyValue: (k: string) => map[k] ?? "" })) as unknown as (
    el: Element,
  ) => CSSStyleDeclaration;

describe("readGlobeTokens", () => {
  it("maps each --color-* var to its resolved value", () => {
    const tokens = readGlobeTokens(
      fakeRead({
        "--color-surface": "#fff",
        "--color-background": "#eee",
        "--color-border": "#ccc",
        "--color-baseline": "#bbb",
        "--color-series-1": "#2a78d6",
        "--color-muted": "#555",
        "--color-foreground": "#000",
      }),
      {} as Element,
    );
    expect(tokens.surface).toBe("#fff");
    expect(tokens.series1).toBe("#2a78d6");
    expect(tokens.foreground).toBe("#000");
  });

  it("does not throw when a var is missing (returns '')", () => {
    const tokens = readGlobeTokens(fakeRead({}), {} as Element);
    expect(tokens.surface).toBe("");
  });
});
