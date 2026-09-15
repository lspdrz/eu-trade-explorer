# EU Trade Explorer

Interactive dashboards for EU customs trade data, focused on fertilizer imports.

Live site: <https://eu-trade-explorer-iota.vercel.app/>

## Stack

Next.js 16 · TypeScript · Drizzle ORM + Postgres (Neon in production) · Tailwind CSS · D3 · Vitest.

## Local development

1. Copy `.env.local.example` to `.env.local` and fill in `DATABASE_URL` / `CRON_SECRET`.
2. Start local Postgres: `docker compose up -d`
3. Install dependencies: `npm install`
4. Run migrations: `npm run db:migrate`
5. Start the dev server: `npm run dev`, then open <http://localhost:3000>

The database isn't seeded automatically. In order to seed it, run the following script to pull data from the EU Comext API. Please note that this does contact the EU Comext API directly. At some point in the future, I may add an endpoint to pull the data from the EU Trade Explorer server.

```bash
npx tsx --conditions=react-server --env-file=.env.local scripts/sync-comext.ts --backfill
```

Data comes from the [EU Comext API](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started/comext-database). See the [methodology doc](docs/methodology.md) for more information.

## Testing

```bash
npm test          # integration and unit
npm run test:unit
npm run lint
```

## Project structure & conventions

See [.claude/PROJECT.md](.claude/PROJECT.md) for how the codebase is organized and how to make contributions (branches, CI, commit messages).