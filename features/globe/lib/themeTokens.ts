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
 * The current values of the palette CSS custom properties, resolved to
 * concrete colour strings. Canvas can't use `var(--x)`, and the tokens
 * differ per theme (`globals.css` redefines them under
 * `[data-theme="dark"]`), so the globe reads them live and re-reads when
 * the theme flips rather than carrying its own copy of both palettes.
 * Touches the DOM — call only from an effect.
 */
export function readGlobeTokens(): GlobeTokens {
  const style = getComputedStyle(document.documentElement);
  const out = {} as GlobeTokens;
  for (const key of Object.keys(VARS) as (keyof GlobeTokens)[]) {
    out[key] = style.getPropertyValue(VARS[key]).trim();
  }
  return out;
}
