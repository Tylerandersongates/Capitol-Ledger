# Capitol Ledger

Capitol Ledger is a nonpartisan civic intelligence MVP for inspecting federal lawmakers, bills, votes, sponsorships, and saved legislative updates.

This scaffold is demo-first: the app runs against local seed data immediately, while the Prisma schema and Congress.gov client provide the path to real ingestion.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

If macOS blocks the downloaded Next.js SWC binary, use the WASM fallback scripts:

```bash
npm run dev:wasm
npm run build:wasm
```

## Useful Commands

```bash
npm run dev              # Start the web app
npm run dev:wasm         # Start with the SWC WASM fallback
npm run build            # Verify a production build
npm run build:wasm       # Build with the SWC WASM fallback
npm run start            # Serve a production build
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Create/update local database tables
npm run db:seed          # Seed demo data into Postgres
npm run sync:congress    # Test server-side Congress.gov access
```

## Environment

`CONGRESS_API_KEY` is used only in server-side routes and scripts. Do not expose it through `NEXT_PUBLIC_` variables.

## MVP Notes

- Federal data only.
- Demo records are clearly labeled until the Congress.gov sync is configured.
- All public records include a source link where the seed data has one.
- Follow/save behavior currently uses browser storage for investor-demo usability; the database schema is ready for authenticated follows.
