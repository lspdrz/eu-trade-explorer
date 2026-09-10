# public/geo

`countries-110m.json` — Natural Earth 1:110m world country polygons as
TopoJSON, from **world-atlas 2.0.2**
(https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json).

- `objects.countries` is a GeometryCollection; each geometry has a
  numeric-string ISO 3166-1 `id` and `properties.name`.
- Natural Earth data is public domain.
- Served as a static asset and fetched by
  `features/globe/ui/ImportFlowGlobe.tsx` — not bundled into JS.
