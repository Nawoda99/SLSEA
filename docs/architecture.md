# Architecture and ER diagram

## Components

The API is a single stateless Express process. `src/app.js` owns HTTP middleware and Swagger; `src/routes/api.js` owns resource handlers; Sequelize models and explicit Umzug migrations own persistence; the seed script creates synthetic demonstration data. JWTs identify either a user or a device. Every protected request rechecks the active subject in MySQL.

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
