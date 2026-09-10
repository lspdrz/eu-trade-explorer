/**
 * The first `n` items of an already-ordered array. A named `topN(list, 10)`
 * over a bare `list.slice(0, Math.max(0, 10))` — and it guards `n <= 0`.
 * Generic; the caller pulls whatever field it needs off the result.
 */
export function topN<T>(items: T[], n: number): T[] {
  return n <= 0 ? [] : items.slice(0, n);
}
