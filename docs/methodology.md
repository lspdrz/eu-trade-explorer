# Methodology

How the data that this project uses is captured and presented.

## Data Sources

- [**Eurostat COMEXT**](ec.europa.eu/eurostat/api/comext)
  - Primary source that is also used on the [EU's data explorer](https://agridata.ec.europa.eu/extensions/DashboardFertiliser/FertiliserTrade.html#)
- [**EU Agri-food Data Portal**](https://agridata.ec.europa.eu/Extensions/API_Documentation/taxud.html)
  - Secondary source
  - Excluded from the UI; might eventually be removed altogether

## Data Pipeline

Two sync jobs keep the database current, both pulling from the EU Comext API.

- **Fertilizer sync** (`scripts/sync-comext.ts`) pulls monthly trade observations for the two fertilizer HS headings, 2814 (ammonia) and 3102 (nitrogenous fertilisers), for every partner country. The default run refreshes the trailing three years; adding the `--backfill` flag pulls every year back to 2010.

- **Russia trade sync** (`features/ru-trade-timeline/scripts/comext-ru-backfill.ts`) pulls monthly trade observations across every HS heading, not just fertilizer, for Russia. The data writes to a separate table from the fertilizer sync. There's no incremental mode. Every run covers the full CN8 codelist back to 2010.

Both syncs write raw, unaggregated rows straight from the source API. The app aggregates into yearly totals at request time rather than pre-computing a summary table, so the raw data stays as the single source of truth.

**Running the sync.** This project's hosting tier on Vercel doesn't support scheduled jobs, so nothing runs automatically. Both scripts are run by hand, pointed at the production database.