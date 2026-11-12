# MERN Starter Kit

A production-minded MERN starter with secure, session-based authentication.

Created by **Muhammad Ahmad**. Released under the [MIT License](LICENSE).

| Area | Stack |
|---|---|
| Backend | Node.js, Express 5, MongoDB (Mongoose 8), Zod, Pino, Helmet |
| Frontend | React 19, Vite 7, React Router 7, Tailwind CSS 4, shadcn/ui components, Lucide icons |
| Tests | Jest + Supertest (API), Jest + Testing Library (UI), Playwright (E2E) |
| CI | GitHub Actions: lint, unit/integration tests, build, E2E, dependency audit |

## Features

- Register, login, logout, and "sign out everywhere"
- Short-lived JWT access token (memory only) + rotating refresh token (httpOnly cookie)
- Refresh token reuse detection and per-device session list with remote sign out
- Forgot password / reset password (single-use, hashed, expiring tokens)
- Rate limiting, CSRF origin checks, security headers, validated env config
- Light and dark theme, accessible forms, reusable UI components

## Project structure

```text
backend/    Express API (routes -> controllers -> services -> models)
frontend/   React app (pages, features, components/ui, services, lib)
e2e/        Playwright end-to-end tests
docs/       Architecture, auth flow, design system, safety, testing
rules/      AI agent rules (source for AGENTS.md)
```

## Requirements

- Node.js 22 or newer (CI uses the version in `.nvmrc`)
- pnpm 10 or newer (do not use npm, yarn, or bun). Install: `npm install -g pnpm`
- MongoDB: nothing to install. `pnpm dev` starts a local MongoDB 7 using the
  binary downloaded by `mongodb-memory-server` (or use your own / `docker compose up -d`)

Tests do not need a local MongoDB. They use `mongodb-memory-server`
(the first run downloads a MongoDB binary, about 600 MB).

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit backend/.env: set MONGODB_URI and a long random JWT_ACCESS_SECRET

# 3. Start MongoDB + API + web app together
pnpm dev
#   MongoDB  127.0.0.1:27017 (data in .mongo-data/, skipped if already running)
#   API      http://localhost:5050
#   Web app  http://localhost:5173
```

Seed users (run while MongoDB is up, for example in a second terminal):

```bash
pnpm seed
# admin@example.com / Admin12345  (role: admin)
# user@example.com  / User12345   (role: user)
```

These defaults work only outside production. Override them with the
`SEED_*` variables in `backend/.env`.

### Google sign-in (optional)

The "Continue with Google" button appears only when Google is configured in
`backend/.env`:

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth client ID** of type **Web application**.
2. Add the authorized redirect URI
   `http://localhost:5173/api/auth/google/callback` (in production:
   `https://<your-app>/api/auth/google/callback`).
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env` and
   restart the backend.

Leave both empty to turn Google sign-in off. Details: [docs/AUTH.md](docs/AUTH.md#google-sign-in-optional).

### Logs

The backend terminal prints one line per API call:

```text
12:30:05 INFO  POST /api/auth/login 200 45ms
12:30:09 WARN  GET /api/admin/stats 403 3ms userId=665f...
```

In development the same entries are also written as JSON to
`backend/logs/app.log`, and errors (with stack traces) to
`backend/logs/error.log`. Request bodies, headers, passwords, and tokens are
never logged. Configure with `LOG_LEVEL`, `LOG_FORMAT`, and `LOG_DIR`
(see `backend/.env.example`).

Every user has a **Profile** page (click your name or picture in the header,
`/profile`): profile picture, name, email, password, and light, dark, or
system theme.

Sign in as the admin and open **Admin** in the header (`/admin`) for the
admin dashboard: user and session stats, user search, role changes, and
signing a user out everywhere. See [docs/AUTH.md](docs/AUTH.md#admin-endpoints).

In development, password reset emails are printed to the API log
(`EMAIL_TRANSPORT=console`). Configure SMTP for real delivery.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start MongoDB, API, and web app (Ctrl+C stops all) |
| `pnpm dev:backend` / `pnpm dev:frontend` | Start only one part |
| `pnpm seed` | Create an admin and a normal user (skips existing users; MongoDB must be running) |
| `pnpm lint` | ESLint for backend and frontend |
| `pnpm test` | Backend and frontend Jest suites |
| `pnpm test:e2e` | Playwright E2E (starts API + web app automatically) |
| `pnpm build` | Production build of the frontend |

This is a pnpm workspace (`pnpm-workspace.yaml`) with one lockfile. Run a
package script with `pnpm --filter <backend|frontend|e2e> <script>`.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): layers, folders, conventions
- [docs/AUTH.md](docs/AUTH.md): token, session, and password reset flows
- [docs/DESIGN.md](docs/DESIGN.md): design tokens, components, icons, images
- [docs/TESTING.md](docs/TESTING.md): test strategy and how to run tests
- [docs/SAFETY.md](docs/SAFETY.md): data, environment, and operational safety
- [SECURITY.md](SECURITY.md): security model and vulnerability reporting
- [CONTRIBUTING.md](CONTRIBUTING.md): workflow and quality checklist

## Deployment notes

- Serve the frontend and API from the same site (for example `app.example.com`
  and `/api` behind a reverse proxy) so the `SameSite=Strict` refresh cookie works.
- Set `NODE_ENV=production`, `EMAIL_TRANSPORT=smtp`, `TRUST_PROXY`, and HTTPS.
  The API refuses to start with an unsafe production configuration.
- The rate limiter uses in-memory storage. Use a shared store (for example Redis)
  when running more than one API instance.

## License

[MIT](LICENSE) © 2026 Muhammad Ahmad

You are free to use this starter kit for personal and commercial projects.
Keep the copyright notice and the [LICENSE](LICENSE) file in your copy, as the
MIT License requires.
