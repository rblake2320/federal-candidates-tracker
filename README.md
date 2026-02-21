# Federal Candidates Tracker

Real-time database tracking all federal congressional candidates for the **2026 midterm elections** — House and Senate races across all 50 states + DC.

## Features

- **FEC API Integration** — Automated collection of candidate filings, fundraising data
- **Ballotpedia Scraping** — Supplemental candidate discovery and race context
- **Full REST API** — Candidates, elections, states, stats, search, export
- **React Dashboard** — Interactive state grid, party breakdowns, race cards
- **JWT Authentication** — Protected admin/export endpoints
- **Scheduled Collection** — GitHub Actions cron for automated data refresh

## Tech Stack

| Layer      | Technology                              |
|------------|----------------------------------------|
| Frontend   | React 18, TypeScript, Tailwind CSS, TanStack Query |
| Backend    | Node.js 20, Express, TypeScript        |
| Database   | PostgreSQL 16                          |
| Testing    | Vitest (unit/integration), Playwright (E2E) |
| DevOps     | Docker, GitHub Actions CI/CD           |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/rblake2320/federal-candidates-tracker.git
cd federal-candidates-tracker
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials and FEC API key

# 3. Start database (Docker)
docker compose up db -d

# 4. Run migrations and seed data
npm run db:migrate
npm run db:seed

# 5. Start development servers
npm run dev
# Frontend: http://localhost:5173
# API:      http://localhost:3001
```

## Testing

```bash
# Unit tests
npx vitest run

# Unit tests with coverage
npx vitest run --coverage

# Integration tests (requires running API + database)
npm run test:integration

# End-to-end tests (requires full stack running)
npm run test:e2e
```

### CI Pipeline

The GitHub Actions CI runs on every push/PR to `main`:

1. **Lint & Typecheck** — ESLint + TypeScript compiler
2. **Unit Tests** — Vitest with coverage report
3. **Integration Tests** — API tests against PostgreSQL service container
4. **E2E Tests** — Playwright browser tests against full stack
5. **Build** — Vite client + TypeScript server compilation
6. **Docker Build** — Verify container builds and starts

## Data Collection

```bash
# Collect from FEC API
npm run collect:fec

# Collect from Ballotpedia
npm run collect:ballotpedia

# Run all collectors
npm run collect:all

# Verify data integrity
npm run verify:data
```

Automated collection runs every 6 hours via GitHub Actions (`data-collection.yml`).

## API Endpoints

| Method | Path                          | Description               |
|--------|-------------------------------|---------------------------|
| GET    | `/health`                     | Health check              |
| GET    | `/api/stats`                  | Aggregate statistics      |
| GET    | `/api/states`                 | All state summaries       |
| GET    | `/api/states/:code`           | State detail + elections  |
| GET    | `/api/candidates`             | Paginated candidates      |
| GET    | `/api/candidates/search`      | Full-text search          |
| GET    | `/api/candidates/state/:state`| Filter by state           |
| GET    | `/api/candidates/:id`         | Candidate detail          |
| GET    | `/api/elections`              | All elections             |
| GET    | `/api/elections/special`      | Special elections only    |
| GET    | `/api/elections/:id`          | Election detail           |
| GET    | `/api/export`                 | Bulk export (auth required)|

## Project Structure

```
├── server/
│   ├── index.ts              # Express entry point
│   ├── routes/               # API route handlers
│   ├── middleware/            # Auth, rate limiting
│   └── services/             # Database, logger
├── src/
│   ├── App.tsx               # React root + routing
│   ├── pages/                # Dashboard, State, Candidate, Search
│   ├── lib/api.ts            # API client
│   └── types/models.ts       # TypeScript types
├── scripts/                  # Data collectors, migration, seed
├── database/
│   ├── migrations/           # SQL schema
│   └── seeds/                # Reference data
├── tests/
│   ├── unit/                 # Vitest unit tests
│   ├── integration/          # API integration tests
│   └── e2e/                  # Playwright browser tests
└── .github/workflows/        # CI/CD pipelines
```

## License

MIT
