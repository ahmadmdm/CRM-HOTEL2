# CRM Hotel Platform

![CI](https://github.com/ahmadmdm/CRM-HOTEL2/actions/workflows/ci.yml/badge.svg)

Production-oriented hotel and residential unit management platform built with FastAPI, Next.js, PostgreSQL, Redis, Celery, and Docker Compose.

## Highlights

- Bilingual admin experience with Arabic RTL and English LTR support.
- Role-based workspaces for admin, finance, operations, housekeeping, and maintenance.
- Automated unit lifecycle support across booking, occupancy, cleaning, and maintenance states.
- Professional App Router frontend with shared loading and error boundaries.
- Background task infrastructure with Celery and Redis.
- Smoke coverage for critical login, localization, and role-routing flows.

## Tech Stack

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, TanStack Query, Radix UI, Playwright.
- Backend: FastAPI, SQLAlchemy, Alembic, Celery, Redis, Pytest.
- Data: PostgreSQL, local file storage mounted through Docker volumes.
- Delivery: Docker Compose for local orchestration and GitHub Actions for CI.

## Repository Layout

```text
.
|-- backend/
|   |-- app/
|   |-- alembic/
|   `-- tests/
|-- frontend/
|   |-- app/
|   |-- components/
|   |-- lib/
|   `-- tests/smoke/
|-- docker-compose.yml
`-- .env.example
```

## Quick Start

1. Copy the environment template.

```bash
cp .env.example .env
```

2. Update the secrets and local passwords inside `.env`.

Recommended values for local validation:

```env
ADMIN_PASSWORD=Admin@1234
DEMO_USER_PASSWORD=Demo@1234
NEXTAUTH_SECRET=replace-with-a-long-random-value
SECRET_KEY=replace-with-a-long-random-value
```

3. Build and start the full stack.

```bash
docker compose up -d --build
```

4. Seed demo users and sample operational data.

```bash
docker compose exec backend python -m app.scripts.seed_demo_data
```

5. Open the application.

- Frontend: http://localhost:3000
- API docs: http://localhost:8888/api/docs
- Backend health: http://localhost:8888/health

## Production Deployment

Production runs behind an external host-managed Caddy reverse proxy and uses the Compose override file to bind frontend/backend to loopback only.

- Deployment reference: [DEPLOYMENT.md](DEPLOYMENT.md)
- Caddy reference: [Caddyfile.example](Caddyfile.example)
- Production start command:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Important: for `crm.clo0.net`, Caddy must route `/api/backend/*` to the frontend before routing `/api/*` to the backend. This is required for the Next.js rewrite model used by the browser login flow.

## Demo Accounts

After seeding demo data, the following accounts are available:

- `admin@crm.local` with `ADMIN_PASSWORD`
- `subadmin@crm.local` with `DEMO_USER_PASSWORD`
- `financial@crm.local` with `DEMO_USER_PASSWORD`
- `operations@crm.local` with `DEMO_USER_PASSWORD`
- `maintenance@crm.local` with `DEMO_USER_PASSWORD`
- `housekeeping@crm.local` with `DEMO_USER_PASSWORD`

## Validation Commands

Backend tests:

```bash
docker compose exec backend pytest
```

Frontend smoke tests:

```bash
cd frontend
npm install
npx playwright install --with-deps chromium
npm run test:smoke
```

The smoke suite expects the Docker stack to already be running on `http://127.0.0.1:3000` and the demo data to be seeded.

## CI Pipeline

GitHub Actions runs two jobs on pushes and pull requests targeting `main`:

- `backend-tests`: boots PostgreSQL and Redis, provisions `crm_test_db`, starts the backend container, and runs `pytest`.
- `smoke-tests`: builds the app stack with Docker Compose, seeds demo data, installs Playwright Chromium, and runs the smoke suite.

Playwright artifacts are uploaded automatically when smoke tests fail.

## Operational Notes

- Uploaded files are stored in `/app/uploads` and persisted via Docker volumes.
- Docker is the authoritative local validation path for the frontend in this workspace.
- The frontend uses a hydration-safe language preference model while still generating localized metadata from the `crm-language` cookie.
