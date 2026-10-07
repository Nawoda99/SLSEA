# Architecture and ER diagram

## Layered modular monolith

The API is one stateless Express deployable organised by business feature. `src/app.js` owns cross-cutting HTTP middleware and Swagger, while `src/server.js` owns process startup and graceful shutdown. `src/modules/api.routes.js` is the composition root for feature route modules. Each feature follows the same dependency direction:

```text
routes -> controllers -> services -> repositories -> database/models
              |             |
              +-> serializers/schemas
shared cross-cutting concerns (HTTP, security, validation, time, logging)
```

Routes only declare URLs and middleware. Controllers translate HTTP requests into use-case calls and responses. Services contain business rules and orchestration. Repositories are the only feature layer that queries Sequelize models. Serializers keep public representations separate from persistence models.

The implemented layout is:

```text
src/
├── app.js, server.js
├── config/
├── middleware/
├── database/
│   ├── models/
│   ├── migrations/
│   └── seeders/
├── modules/
│   ├── auth/
│   ├── provinces/
│   ├── districts/
│   ├── substations/
│   ├── installations/
│   ├── readings/
│   └── summaries/
└── shared/
    ├── http/
    ├── security/
    ├── validation/
    └── utils/
```

Every business feature contains its own `*.routes.js`, `*.controller.js`, `*.service.js`, and `*.repository.js`; response-heavy features also contain a `*.serializer.js`.

The feature modules are:

- `src/modules/auth/` — user and installation authentication
- `src/modules/provinces/` — province read and maintenance endpoints
- `src/modules/districts/` — district read, maintenance, and nested resources
- `src/modules/substations/` — grid-substation read and maintenance endpoints
- `src/modules/installations/` — installation metadata and overview endpoints
- `src/modules/readings/` — append-only generation reading queries and device ingestion
- `src/modules/summaries/` — district generation summaries

Each feature is independently understandable without creating a second deployable. Database concerns are under `src/database/` (models, migrations, and seeders). Request/error middleware is under `src/middleware/`; shared security, validation, time, logging, and representation helpers are under `src/shared/`.

## Runtime flow

```mermaid
flowchart LR
    Client --> App[src/app.js]
    App --> Middleware[src/middleware + shared security]
    Middleware --> Composition[modules/api.routes.js]
    Composition --> Features[feature modules]
    Features --> Shared[src/shared]
    Features --> DB[src/database/models]
    DB --> MySQL[(MySQL)]
    Server[src/server.js] --> App
```

## ER diagram

```mermaid
erDiagram
    PROVINCES ||--o{ DISTRICTS : contains
    DISTRICTS ||--o{ GRID_SUBSTATIONS : contains
    GRID_SUBSTATIONS ||--o{ SOLAR_INSTALLATIONS : serves
    SOLAR_INSTALLATIONS ||--o{ GENERATION_READINGS : records
    PROVINCES ||--o{ USERS : scopes
    DISTRICTS ||--o{ USERS : scopes
    PROVINCES { string id PK string code UK string name UK datetime deleted_at }
    DISTRICTS { string id PK string province_id FK string code UK string name }
    GRID_SUBSTATIONS { string id PK string district_id FK string code UK decimal latitude decimal longitude }
    SOLAR_INSTALLATIONS { string id PK string grid_substation_id FK string meter_id UK string inverter_id UK string device_username UK decimal capacity_kw int version }
    GENERATION_READINGS { bigint id PK string installation_id FK datetime measured_at datetime received_at decimal power_kw decimal cumulative_energy_kwh decimal voltage_v }
    USERS { string id PK string email UK string role string province_id FK string district_id FK }
```

Foreign keys do not cascade deletes. Metadata deletion is a soft delete, while readings are append-only and protected by both application policy and database triggers.
