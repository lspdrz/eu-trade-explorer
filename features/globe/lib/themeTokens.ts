export interface GlobeTokens {
  surface: string;
  background: string;
  border: string;
  baseline: string;
  series1: string;
  muted: string;
  foreground: string;
}

const VARS: Record<keyof GlobeTokens, string> = {
  surface: "--color-surface",
  background: "--color-background",
  border: "--color-border",
  baseline: "--color-baseline",
  series1: "--color-series-1",
  muted: "--color-muted",
  foreground: "--color-foreground",
};

/**
 * Resolve the palette CSS custom properties to concrete colour strings so
 * canvas drawing (which can't use `var(--x)`) tracks the active theme.
 * `read` / `el` are injectable for tests; in the browser they default to
 * `getComputedStyle(document.documentElement)`. Call only from an effect.
 */
export function readGlobeTokens(
  read: (el: Element) => CSSStyleDeclaration = (el) => getComputedStyle(el),
  el: Element = document.documentElement,
): GlobeTokens {
  const style = read(el);
  const out = {} as GlobeTokens;
  for (const key of Object.keys(VARS) as (keyof GlobeTokens)[]) {
    out[key] = style.getPropertyValue(VARS[key]).trim();
  }
  return out;
}
