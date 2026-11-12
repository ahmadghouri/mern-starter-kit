# Architecture

## Backend (`backend/`)

CommonJS, Express 5. Async errors thrown in handlers reach the error
middleware automatically.

```text
src/
  server.js        Process entry: connect DB, listen, graceful shutdown
  app.js           createApp(): middleware, routes, error handling (used by tests)
  config/          env.js (Zod-validated config), db.js (Mongoose connection)
  routes/          HTTP method + path + middleware + controller
  controllers/     Read validated input, call services, choose status codes
  services/        Business rules and database work (no req/res)
  models/          Mongoose schemas and public serializers
  validators/      Zod request schemas
  middleware/      authenticate, validate, rate limiters, origin check, errors
  lib/             errors, tokens, cookies, logger
  emails/          Email templates (HTML-escaped)
```

Request flow:

```text
route -> rate limit -> validate (Zod) -> authenticate -> controller -> service -> model
                                                                  \-> AppError -> errorHandler
```

Conventions:

- Throw `AppError` (see `lib/errors.js`) for expected failures. Unknown
  errors become a generic 500 and are logged with the request id.
- Validated input is on `req.validated.{body,params,query}`. Schemas are
  `.strict()`, so unknown fields (for example `role`) are rejected.
- Never return Mongoose documents directly. Use serializers such as
  `toPublicUser` and `toPublicSession`.
- Configuration comes only from `config/env.js`. Do not read `process.env`
  elsewhere.

## Frontend (`frontend/`)

ES modules, React 19, Vite. Path alias `@/` -> `src/`.

```text
src/
  main.jsx            Providers (Router, AuthProvider)
  App.jsx             Route table
  pages/              One component per route
  features/auth/      AuthProvider, useAuth, route guards, sessions hook and list
  components/ui/      shadcn/ui primitives (Button, Input, Card, Alert, ...)
  components/form/    FormField, PasswordInput, SubmitButton, FormAlert
  components/layout/  AuthLayout, AppLayout, Logo, ThemeToggle
  services/           API calls per domain (auth.service.js)
  lib/                api-client (fetch + refresh), validation, utils (cn)
  hooks/              Generic hooks (useFormState)
  test/               Jest setup, fetch mock, render helpers
```

Data fetching: native `fetch` through `lib/api-client.js`, called only from
`services/`. Components use services through hooks or the auth context.
TanStack Query and Axios are not installed. If the app grows enough server
state to need caching, add TanStack Query on top of the existing services
(see `rules/scoped/tanstack-query.md`).

Forms: controlled inputs with `useFormState`, client validation in
`lib/validation.js` that mirrors the backend rules, and server field errors
mapped back with `fieldErrorsFromApi`.

## E2E (`e2e/`)

Playwright starts the API with an in-memory MongoDB
(`backend/scripts/start-e2e.js`) on port 5191 and the Vite dev server on
port 5190, then runs browser tests against them.
