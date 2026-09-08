/**
 * Groups items from an async source into arrays of up to `size` items,
 * consuming the source incrementally — never holds more than one batch in
 * memory at a time, regardless of how many items the source produces.
 */
export async function* batchesOf<T>(
  source: AsyncIterable<T>,
  size: number,
): AsyncGenerator<T[]> {
  let batch: T[] = [];

  for await (const item of source) {
    batch.push(item);
    if (batch.length >= size) {
      yield batch;
      batch = [];
    }
  }

  if (batch.length > 0) {
    yield batch;
  }
}
