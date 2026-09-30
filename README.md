# SLSEA Solar Generation Data API

This repository contains a Node.js/Express REST API for the Sri Lanka Sustainable Energy Authority (SLSEA) solar-generation coursework scenario. It targets Richardson Maturity Model Level 2: noun-based plural resources, HTTP methods, status codes, nested resources, representations, and hyperlinks for pagination.

The repository was empty when implementation started. The supplied Coursework Brief, Marking Rubric, and Report Template have now been reviewed. The referenced REST API Design Guidelines white paper was not present in the supplied files or repository, so its contents have not been invented.

## Runtime and prerequisites

- Node.js 24.15.0 was used for local development; Node.js 20 or newer is supported.
- MySQL 8.0+ is required. The application stores all timestamps in UTC.
- Docker Compose is provided, but the local Docker daemon must be running.

Install dependencies:

```powershell
npm.cmd install
Copy-Item .env.example .env
```

Set a real `DATABASE_URL` and a strong `JWT_SECRET` in `.env`. The checked-in `.env.example` contains placeholders only. The local `.env` used during development is ignored by Git.

## Database lifecycle

Migrations are explicit and never use `sequelize.sync()`:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
```

The seed is idempotent when the database already contains provinces. It creates 9 provinces, 25 districts, 25 synthetic substations, 200 synthetic installations, and 134,400 readings (672 readings per installation over seven days). `SEED_REFERENCE_TIME` controls the end of the generated time range; set it near the demonstration date to make freshness checks meaningful.

For a non-production database only, the explicit destructive reset is:

```powershell
npm.cmd run db:seed:reset
```

The script refuses this operation when `NODE_ENV=production`. It does not run automatically during application startup.

The Docker Compose setup provides `mysql` on port 3306 and an isolated `mysql-test` database on port 3307. The supplied environment currently has a MySQL service on port 3306 with credentials that are not available to this project, and Docker Desktop is not running; those are local verification blockers, not application defaults.

## Running

```powershell
npm.cmd start
```

The API listens on `http://localhost:8080` by default. Swagger UI is at `/docs`; the raw OpenAPI document is at `/openapi.json`; liveness and readiness are `/health` and `/ready`.

## Authentication

Users authenticate at `POST /api/v1/auth/users/login`. Seeded local accounts are:

- `national@slsea.local` — nationwide reader
- `western@slsea.local` — Western provincial reader
- `colombo@slsea.local` — Colombo district reader
- `maintenance@slsea.local` — maintenance identity, still blocked while `ENABLE_MAINTENANCE=false`

The password comes from `SEED_USER_PASSWORD`; it is never stored in source. Installation devices authenticate at `POST /api/v1/auth/installations/token` using the device username and the `SEED_DEVICE_SECRET` value. Device tokens are short-lived JWTs bound to one installation and may only submit readings for that installation.

The token revocation strategy is active-subject lookup on every request: disabling or soft-deleting a user/installation invalidates its otherwise unexpired token. This costs a database read but gives immediate revocation. A token that was already copied remains usable until its expiry if the subject remains active; use a short `JWT_EXPIRES_IN` and rotate the JWT secret for emergency global invalidation.

## API design decisions

- `GenerationReading` is an independent append-only table. A unique `(installation_id, measured_at)` index provides database-level duplicate protection, and database triggers reject update/delete attempts.
- `received_at` records ingestion time separately from `measured_at`, which supports freshness checks and auditability when devices deliver delayed or out-of-order readings.
- Out-of-order readings are accepted; sorting is always timestamp-first with reading ID as the deterministic secondary key. Future measurements beyond five minutes of clock skew are rejected.
- A falling cumulative meter value is rejected unless the ingestion request declares `meterReset=true`. Summary calculations detect a negative difference, start a new energy segment, and report the reset count rather than silently adding a negative value.
- District daily energy uses the Asia/Colombo local-day boundary. The last reading strictly before local midnight is the required baseline. Missing baselines make the daily total incomplete and return `todays_energy_kwh: null` with coverage information.
- Current power uses one latest reading per installation. Stale and missing readings are counted separately; a complete current total is `null` when coverage is incomplete, while the fresh partial sum is reported separately.
- Metadata DELETE is a soft delete. Foreign keys use `RESTRICT`; no operation cascades over historical readings.
- All protected queries apply token-derived jurisdiction filters before `count`, `limit`, or `offset`. Query parameters cannot widen a token scope.
- ETags are generated from the selected representation, conditional GET checks authorisation before returning 304, and responses use private caching with `Vary: Authorization, Accept`.
- Metadata PUT/PATCH/DELETE require `If-Match` and return 412 on a missing or stale validator. Maintenance is disabled by default because the coursework brief's CRUD requirement conflicts with device ingestion-only and SLSEA reader read-only roles.

## Tests

Fast contract/validation tests do not require MySQL:

```powershell
npm.cmd test
```

MySQL integration tests are enabled explicitly so development/production databases are not touched accidentally:

```powershell
$env:DATABASE_URL = $env:TEST_DATABASE_URL
$env:RUN_MYSQL_INTEGRATION = 'true'
npm.cmd run db:migrate
npm.cmd run db:seed:reset
npm.cmd test
```

The integration suite checks seed cardinalities and relationships, authentication boundaries, device ownership, protected reads, scoped totals/pagination, filtering and ordering, conditional GET, append-only reading behaviour, and district summary response quality. Do not point `DATABASE_URL` at a development or production database while running it.

## Deployment

Build the image with `docker build -t slsea-solar-api .` and run it behind an HTTPS reverse proxy or managed TLS load balancer. Provide a production MySQL 8 database, a strong secret through a secret manager, a restrictive `CORS_ORIGINS` list, `ENABLE_MAINTENANCE=false`, and a migration job before starting new application instances. Expose `/health` for liveness and `/ready` for readiness. Do not publish the demo credentials or the local Compose passwords.

## Documentation

- [Architecture and ER diagram](docs/architecture.md)
- [Endpoint inventory and resource taxonomy](docs/endpoint-inventory.md)
- [Requirements-to-implementation-to-test mapping](docs/requirements-mapping.md)
- [Viva preparation notes](docs/viva-notes.md)
- [AI assistance log](docs/ai-assistance-log.md)
