# Safety

Operational rules to protect data, environments, and users. Security
controls are in [../SECURITY.md](../SECURITY.md).

## Environments

| Environment | Database | Email | Notes |
|---|---|---|---|
| test | In-memory MongoDB, dropped after tests | memory outbox | `NODE_ENV=test` required by test helpers |
| E2E | In-memory MongoDB, discarded on exit | memory outbox | Started by `backend/scripts/start-e2e.js` |
| development | Local MongoDB | console log | Never point at production data |
| production | Managed MongoDB with backups | SMTP | Validated config, secure cookies required |

## Environment variables and secrets

- Real values live only in `.env` files (git-ignored) or the hosting
  platform's secret store. Document every variable in `.env.example` with a
  placeholder, never a real value.
- `backend/src/config/env.js` validates all variables at startup and prints
  only variable names, never values, on error.
- Frontend `VITE_*` variables are public (bundled into JavaScript). Never put
  secrets there.
- Rotate `JWT_ACCESS_SECRET` if it may have leaked. Rotation signs out all
  access tokens; refresh tokens keep working and issue new access tokens.

## Database

- Do not run destructive operations (`deleteMany({})`, `drop`, mass updates)
  against shared or production databases without explicit approval and a
  verified backup.
- `clearTestDatabase()` exists only in test helpers and refuses to run outside
  `NODE_ENV=test`.
- Schema changes must be backward compatible with the running version
  (add fields first, migrate data, remove old fields in a later release).
- TTL indexes delete expired sessions and reset tokens automatically. Changing
  them affects live data; review carefully.
- Take regular backups and test restoring them.

## Logging and personal data

- Logs are structured JSON (Pino) with a request id (`X-Request-Id`).
- Authorization headers, cookies, passwords, and tokens are redacted.
- Do not log full request bodies on auth routes.
- The console email transport prints reset links. It is for development only
  and is rejected in production.
- The sessions list stores user agent and IP for the user's own view. Treat it
  as personal data (retention, export, deletion on account removal).

## Releases

- All CI jobs must pass before merging to `main`.
- Deploy with health checks: `/api/health/live` (process up) and
  `/api/health/ready` (database connected).
- The server shuts down gracefully on `SIGTERM` (stops accepting requests,
  closes the database, forced exit after 10 seconds).
- Prefer rollbacks over hot fixes in production.

## Git

- Never commit `.env` files, credentials, or database dumps.
- Do not force-push shared branches.
- If a secret is committed, rotate it first, then remove it from history.
