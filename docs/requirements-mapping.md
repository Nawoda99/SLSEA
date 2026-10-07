# Requirements-to-implementation-to-test mapping

This mapping is intentionally factual. A row is marked as tested only when the corresponding automated test has actually run successfully; database rows remain pending until a usable MySQL test database is supplied.

| Requirement area | Implementation evidence | Test evidence/status |
|---|---|---|
| Six-entity hierarchy | `src/database/models/index.js`, migration `src/database/migrations/001-create-schema.js` | Contract tests; MySQL seed-count test pending database access |
| Append-only readings | unique installation/timestamp index, two MySQL triggers, route method rejection | Unit contract covered; MySQL trigger/integration test pending |
| Device/user separation | `src/modules/auth/auth.service.js`, `src/shared/security/authorization.js`, feature route middleware | Unit route contracts; scoped integration pending |
| JWT validation | HS256 allow-list, issuer, audience, expiry, subject lookup | Integration pending database access |
| Scope before totals/pagination | location includes and role-derived route predicates | Integration pending database access |
| REST resources and nested ownership | `src/modules/*/*.routes.js`, controllers/services/repositories, `src/openapi.js` | OpenAPI/contract tests; integration pending |
| ETag/Last-Modified/304 | `src/shared/http/representation.js` | Representation unit tests; live validator test pending |
| If-Match/412 metadata concurrency | `requireIfMatch`, maintenance handlers | Live DB test pending |
| UTC and Asia/Colombo summary | `src/shared/utils/time.js`, `src/modules/summaries/summary.routes.js` | Fixture summary test pending |
| Seed cardinalities and plausible series | `src/database/seeders/seed.js` | Seed command available; MySQL integration remains environment-dependent |
| Swagger UI | `/docs`, `src/openapi.js` | Syntax validation completed; live endpoint check pending |
| Operational setup | Dockerfile, Compose, `.env.example`, graceful shutdown | Container run blocked by unavailable Docker daemon |

## Explicit interpretation limitation

The Coursework Brief, Marking Rubric, and Report Template were reviewed. The referenced REST API Design Guidelines white paper was not present, so its contents remain an explicit limitation. The CRUD conflict is handled conservatively: maintenance metadata CRUD exists but is disabled by default; ordinary SLSEA users remain read-only; devices remain ingestion-only; historical readings remain append-only.
