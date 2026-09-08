function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Country combobox filter: case- and diacritic-insensitive substring match
 * against the country name or its code. An empty query returns everything.
 */
export function filterCountries(
  partners: { code: string; name: string }[],
  query: string,
): { code: string; name: string }[] {
  const q = normalize(query);
  if (!q) return partners;
  return partners.filter(
    (p) => normalize(p.name).includes(q) || normalize(p.code).includes(q),
  );
}
