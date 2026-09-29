# Resource taxonomy and endpoint inventory

## Resource taxonomy

| Resource | Collection | Individual/derived resources | Write capability |
|---|---|---|---|
| Province | `/api/v1/provinces` | `/api/v1/provinces/{provinceId}` | Maintenance only, disabled by default |
| District | `/api/v1/districts`, `/api/v1/provinces/{provinceId}/districts` | `/api/v1/districts/{districtId}` | Maintenance only, disabled by default |
| Grid substation | `/api/v1/grid-substations`, `/api/v1/districts/{districtId}/grid-substations` | `/api/v1/grid-substations/{substationId}` | Maintenance only, disabled by default |
| Solar installation | `/api/v1/installations`, `/api/v1/grid-substations/{substationId}/installations` | installation, overview, last-known-reading | Maintenance only, disabled by default |
| Generation reading | `/api/v1/readings`, installation-scoped collection | individual reading | Device POST only; no update/delete |
| District summary | — | `/api/v1/districts/{districtId}/generation-summary` | Read-only |

## Shared behaviour

Protected resources require `Authorization: Bearer <JWT>`. JSON is the only representation. Successful metadata creation returns 201 and `Location`; conditional reads return 304 with no body; metadata mutations require `If-Match`; pagination links preserve the supplied filters and order. Errors use `{ error: { code, message, details? }, requestId }`.

Reading pagination is a request-time snapshot: the total and page query are evaluated separately, so a new reading can arrive between them. Clients should follow the returned links and use a stable time window when exporting a complete interval. The deterministic `(measured_at, id)` order prevents ties from moving unpredictably.

## Authentication endpoints

- `POST /api/v1/auth/users/login`
- `POST /api/v1/auth/installations/token`
- `GET /health`
- `GET /ready`
- `GET /docs`
- `GET /openapi.json`
