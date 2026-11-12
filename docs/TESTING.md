# Testing

| Layer | Tool | Location | Command |
|---|---|---|---|
| Backend unit | Jest | `backend/tests/unit` | `pnpm --filter backend test` |
| Backend integration | Jest + Supertest + mongodb-memory-server | `backend/tests/integration` | `pnpm --filter backend test` |
| Frontend unit/component | Jest + Testing Library (jsdom) | `frontend/src/**/*.test.{js,jsx}` | `pnpm --filter frontend test` |
| End to end | Playwright (Chromium) | `e2e/tests` | `pnpm test:e2e` |

Coverage: `pnpm --filter <backend|frontend> test:coverage` (backend enforces thresholds in `jest.config.js`).

## Backend

- `tests/helpers/globalSetup.js` starts one in-memory MongoDB; each Jest
  worker uses its own database (`starter-kit-test-<worker>`).
- `useTestDatabase()` connects, clears collections after each test, and drops
  the test database at the end. It refuses to run unless `NODE_ENV=test`.
- Emails go to the in-memory `outbox` (`EMAIL_TRANSPORT=memory`), so tests can
  read reset links.
- Cover for each endpoint: success, invalid input, unauthenticated,
  unauthorized (other user's resource), conflict, and expired/invalid tokens.

## Frontend

- `src/test/mock-api.js` replaces `fetch` with a route table
  (`'POST /api/auth/login': {...}`), so tests exercise the real API client,
  services, and auth provider.
- `src/test/render.jsx` renders the full app at a URL with `MemoryRouter`.
- Query by role and label (`getByRole`, `getByLabelText`), as a user would.
- `import.meta.env` is Vite-only, so `@/config/env` maps to `src/test/env.mock.js`.

## E2E

`pnpm test:e2e` starts:

- API on `:5191` with an in-memory MongoDB (`pnpm --filter backend start:e2e`)
- Vite dev server on `:5190` proxying `/api` to the API

Each test creates a unique user, so tests run in parallel safely.
First run: `pnpm --filter e2e exec playwright install chromium`.

Useful commands:

```bash
pnpm --filter e2e exec playwright test --ui      # interactive mode
pnpm --filter e2e exec playwright test --headed  # watch the browser
pnpm --filter e2e exec playwright show-report    # open the last HTML report
```

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:

1. Backend: `pnpm install --frozen-lockfile`, lint, tests with coverage
2. Frontend: `pnpm install --frozen-lockfile`, lint, tests with coverage, build
3. E2E: after both pass, installs Chromium and runs Playwright (report uploaded on failure)
4. Audit: `pnpm audit --prod --audit-level high` for the whole workspace

## Rules

- A bug fix includes a test that fails without the fix.
- No real network, email, or production database in tests.
- Avoid fixed sleeps; wait for UI state (`findBy...`, Playwright auto-waiting).
