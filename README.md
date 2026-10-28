# FleetCore API

API REST para gestionar el mantenimiento de la flota de vehículos de FleetCore.
**Stack:** NestJS · TypeScript · TypeORM · PostgreSQL · JWT · argon2 · Swagger.

## Datos del coder

- **Nombre:** Jhon Michael Lopera Velasquez
- **Clan:** Centurión

## Requisitos

- Node.js 20+ y npm
- PostgreSQL 14+ (o Docker)

## Instalación y ejecución

```bash
npm install
cp .env.example .env        # ajusta DB_PASSWORD y demás si hace falta
createdb fleetcore          # o: CREATE DATABASE fleetcore;
npm run start:dev           # crea las tablas automáticamente (DB_SYNCHRONIZE=true)
npm run seed                # en otra terminal: puebla la base de datos
```

El seeder es **idempotente**: ejecutarlo varias veces no duplica registros.

### Con Docker (opcional)

```bash
docker compose up --build -d
docker compose exec api node dist/database/seed.js
```

### Variables de entorno (`.env.example`)

| Variable | Descripción |
|---|---|
| `PORT` | Puerto de la API (3000) |
| `DB_HOST` `DB_PORT` `DB_USERNAME` `DB_PASSWORD` `DB_NAME` | Conexión a PostgreSQL |
| `DB_SYNCHRONIZE` | `true` crea/ajusta las tablas al arrancar |
| `JWT_SECRET` `JWT_EXPIRES_IN` | Firma y vigencia del JWT |
| `API_KEYS` | Claves válidas para `x-api-key`, separadas por coma |

## Swagger

**http://localhost:3000/docs** — botón *Authorize*: pega el `accessToken` del login (Bearer) o la clave en `api-key`.

## Credenciales de prueba (las crea el seeder)

| Rol | Correo | Contraseña |
|---|---|---|
| ADMIN | admin@fleetcore.com | Admin123* |
| TECHNICIAN (Carlos Pérez) | tecnico1@fleetcore.com | Tech123* |
| TECHNICIAN (Laura Gómez) | tecnico2@fleetcore.com | Tech123* |

API Keys: `demo-key-partner-1`, `demo-key-partner-2`.

**Datos sembrados:** 3 mecánicos (2 activos vinculados a los técnicos, 1 inactivo) · 2 talleres (Centro activo, Norte inactivo) ·
4 vehículos (`ABC123` y `DEF456` AVAILABLE, `GHI789` IN_MAINTENANCE con mantenimiento IN_PROGRESS, `JKL012` INACTIVE) ·
1 mantenimiento COMPLETED en `ABC123`.

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/auth/register` · `/auth/login` | Público |
| GET | `/auth/me` | Autenticado |
| POST / PATCH / DELETE | `/vehicles`, `/vehicles/:id` (DELETE = inactivar) | ADMIN |
| GET | `/vehicles`, `/vehicles/:id`, `/vehicles/plate/:plate` | ADMIN, TECHNICIAN |
| POST / GET / PATCH | `/mechanics`, `/mechanics/:id` · `PATCH /mechanics/:id/activate\|deactivate` | ADMIN |
| POST / PATCH | `/workshops`, `/workshops/:id` · `PATCH /workshops/:id/activate\|deactivate` | ADMIN |
| GET | `/workshops` (activos), `/workshops/:id` | ADMIN, TECHNICIAN |
| POST | `/maintenances` | ADMIN |
| GET | `/maintenances`, `/maintenances/active`, `/maintenances/vehicle/:id`, `/maintenances/vehicle/:id/history`, `/maintenances/mechanic/:id`, `/maintenances/:id/audit` | ADMIN |
| GET | `/maintenances/my` | TECHNICIAN |
| GET | `/maintenances/:id` | ADMIN, TECHNICIAN (solo los suyos) |
| PATCH | `/maintenances/:id/status` | ADMIN, TECHNICIAN (solo los suyos) |
| GET | `/integrations/vehicles/:plate/maintenance-history` | Header `x-api-key` |

### Cambio de estado

`SCHEDULED → IN_PROGRESS | CANCELLED` · `IN_PROGRESS → COMPLETED | CANCELLED` · `COMPLETED` y `CANCELLED` son finales.
Para `COMPLETED` el body debe incluir `workDone`, `finalCost`, `finishedAt` y `finalMileage`:

```json
{ "status": "COMPLETED", "workDone": "Cambio de pastillas", "finalCost": 480000,
  "finishedAt": "2026-10-27T16:00:00Z", "finalMileage": 120150 }
```

### Reglas clave implementadas

- Un vehículo solo puede tener **un** mantenimiento activo (SCHEDULED/IN_PROGRESS).
- Un mecánico no puede tener horarios **cruzados** (en cualquier taller). Se usa `scheduledAt` + `estimatedMinutes` (60 por defecto): terminar a las 9:00 y empezar a las 9:00 **no** es cruce.
- Vehículo INACTIVE, mecánico inactivo o taller inactivo/inexistente → 409 / 404.
- Kilometraje del mantenimiento ≥ kilometraje actual del vehículo.
- `IN_PROGRESS` → vehículo `IN_MAINTENANCE`; `COMPLETED` → `AVAILABLE` (y se actualiza su kilometraje); cancelar uno en proceso también libera el vehículo.
- Creación y cambio de estado corren en **transacción** con bloqueo de filas (evita condiciones de carrera).
- Auditoría de cada cambio de estado en `maintenance_status_logs`.

## Formato de respuestas

```json
{ "success": true, "statusCode": 200, "data": {}, "timestamp": "..." }
{ "success": false, "statusCode": 409, "message": "...", "path": "/maintenances", "timestamp": "..." }
```

Los errores de PostgreSQL (unicidad, FK) se convierten a 409/400 en el filtro; nunca salen como 500.

## Pruebas unitarias

```bash
npm run test:cov
```

Cubren la máquina de estados de mantenimientos, `RolesGuard` y `ApiKeyGuard`.

## Base de datos (dump)

`database/fleetcore_dump.sql` contiene estructura y datos del seed. Restaurar:

```bash
psql -U postgres -c "CREATE DATABASE fleetcore;"
psql -U postgres -d fleetcore -f database/fleetcore_dump.sql
```

## Estructura

```
src/
  common/      decorators (@Roles @CurrentUser @Public), guards (JWT, Roles, ApiKey), filter, interceptor
  config/      validación de variables de entorno
  database/    seed.ts
  modules/     auth · users · vehicles · mechanics · workshops · maintenances
```
