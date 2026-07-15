# CapitolWonk CE

CapitolWonk CE is a nonpartisan civic intelligence MVP for inspecting federal lawmakers, bills, votes, sponsorships, and saved legislative updates.

This scaffold is demo-first: the app runs against local seed data immediately, while the Prisma schema and Congress.gov client provide the path to real ingestion.

## Quick Start

Use Node 20 or 22 for local preview. The project has a runtime check that fails fast on unsupported Node versions because newer runtimes can hang during Next.js route compilation.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

For the beta preview target used during QA, run:

```bash
npm run dev:preview
```

Open `http://127.0.0.1:3023`.

If macOS blocks the downloaded Next.js SWC binary, use the WASM fallback scripts:

```bash
npm run dev:wasm
npm run build:wasm
```

## Useful Commands

```bash
npm run dev              # Start the web app
npm run dev:preview      # Start the QA preview on 127.0.0.1:3023
npm run dev:wasm         # Start with the SWC WASM fallback
npm run local-preview:check # Verify Node, node_modules, and native SWC readiness
npm run build            # Verify a production build
npm run build:wasm       # Build with the SWC WASM fallback
npm run start            # Serve a production build
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Create/update local database tables
npm run db:seed          # Seed demo data into Postgres
npm run sync:congress    # Test server-side Congress.gov access
```

For Vercel deployment inspection, use the repo helper instead of relying on a global CLI install:

```bash
scripts/vercel-cli.sh whoami
scripts/vercel-cli.sh list project-qosv1 --environment production --status READY --format json --yes
scripts/vercel-cli.sh inspect project-qosv1.vercel.app --format json
```

The helper pins `vercel@54.14.1`, uses the local `.tools` Node/pnpm runtime when available, and installs the CLI into `/private/tmp/capitol-ledger-vercel-cli` so app dependencies stay untouched.

## Environment

`CONGRESS_API_KEY` is used only in server-side routes and scripts. Do not expose it through `NEXT_PUBLIC_` variables.

`REGULATIONS_GOV_API_KEY` powers the server-side Regulations.gov public-comment feed on the Civic Petitions page. Keep it server-only and add it in Vercel as a sensitive environment variable for deployed environments.

`DATABASE_URL` powers account, feedback, billing, and persistence paths. Synced Congress content remains demo-first unless `CAPITOL_LEDGER_ENABLE_DATABASE_READS=true`; keep that flag off until the live member/bill sync has been reviewed for current, active records.

## MVP Notes

- Federal data only.
- Demo records are clearly labeled until the Congress.gov sync is configured.
- All public records include a source link where the seed data has one.
- Follow/save behavior currently uses browser storage for investor-demo usability; the database schema is ready for authenticated follows.
