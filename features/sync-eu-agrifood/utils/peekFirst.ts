/**
 * Consumes exactly one item from an async source to check whether it's
 * empty, without buffering the rest — returns a combined generator that
 * replays every item (peeked one first, then the remainder) in order, so
 * a caller can decide what to do based on emptiness before committing to
 * the stream, while downstream still sees the exact same sequence.
 *
 * Built for a real need: an empty fetch is a meaningfully different
 * situation from one with real data — a product rename once made a
 * previously-good query return nothing, and code that didn't distinguish
 * "empty" from "has data" deleted real existing data with nothing to
 * replace it (see replaceProductData.ts).
 */
export async function peekFirst<T>(
  source: AsyncGenerator<T>,
): Promise<{ empty: true } | { empty: false; combined: AsyncGenerator<T> }> {
  const { value, done } = await source.next();

  if (done) {
    return { empty: true };
  }

  async function* combined(): AsyncGenerator<T> {
    yield value;
    yield* source;
  }

  return { empty: false, combined: combined() };
}
