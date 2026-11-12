# Security

## Reporting a vulnerability

Do not open a public issue for security problems. Contact the maintainers
privately (add a security contact email here before publishing the project)
with steps to reproduce and the potential impact. We aim to respond within
3 business days.

## Security model

### Authentication

- Passwords: bcrypt, cost 12 (`BCRYPT_ROUNDS`), 8 to 72 bytes, must include a
  letter and a number. Plain-text passwords are never stored or logged.
- Access token: HS256 JWT, 15 minutes, verified for algorithm, issuer,
  audience, and expiry. Stored in frontend memory only (not localStorage), so
  an XSS bug cannot read it from storage.
- Refresh token: random opaque value in an `HttpOnly`, `Secure`,
  `SameSite=Strict` cookie scoped to `/api/auth`. Rotated on every use,
  stored as a SHA-256 hash, with replay detection. See [docs/AUTH.md](docs/AUTH.md).
- Every authenticated request checks that the session is still active, so
  revocation is immediate.
- Login returns the same error for unknown email and wrong password, and
  compares against a dummy hash to reduce timing differences.
- Forgot password returns the same response whether or not the account exists.
- Reset tokens are single use, expire in 30 minutes, are stored hashed, and a
  reset signs out every device.

### Authorization

- `authenticate` answers "who is this user". `requireRole(...)` and ownership
  checks answer "may this user do this".
- Users can only list and revoke their own sessions (ownership is part of the
  database query; another user's session id returns 404).
- `role` cannot be set through the API (strict request schemas).

### Input and output

- All request bodies and params are validated with Zod `.strict()` schemas.
  Non-string values are rejected, which blocks NoSQL operator injection
  (`{ "$gt": "" }`). Mongoose `strictQuery` is enabled.
- JSON body limit: 10 KB.
- Error responses never include stack traces, database errors, or internals.
- API responses use explicit serializers; password hashes are `select: false`.
- Email templates HTML-escape user data.

### Transport and browser

- Helmet security headers, `X-Powered-By` disabled.
- CORS allows only `CORS_ORIGINS`, with credentials. Outside production, any
  `http://localhost:<port>` origin is also trusted so the Vite dev server can
  fall back to another port (see `backend/src/lib/origins.js`).
- CSRF: `SameSite=Strict` cookie plus an `Origin` allowlist check on the
  cookie-based endpoints (`/refresh`, `/logout`).
- Rate limits: general API, auth endpoints, and refresh endpoint (per IP).
  Set `TRUST_PROXY` correctly behind a proxy so limits use the real client IP.

### Configuration

- Startup fails if required variables are missing or weak (JWT secret under
  32 characters), or if production uses a non-SMTP email transport or
  insecure cookies.
- Sensitive values are redacted from logs.

## Production checklist

- [ ] HTTPS everywhere; frontend and API on the same site
- [ ] `NODE_ENV=production`, strong random `JWT_ACCESS_SECRET` (48+ bytes)
- [ ] `CORS_ORIGINS` and `APP_URL` set to the real frontend origin
- [ ] `TRUST_PROXY` matches the number of proxies
- [ ] SMTP configured; SPF/DKIM set for the sending domain
- [ ] MongoDB with authentication, TLS, network restrictions, and backups
- [ ] Shared rate-limit store (Redis) when running multiple API instances
- [ ] Content Security Policy reviewed for the frontend host
- [ ] `pnpm audit --prod` clean; Dependabot enabled

## Known limitations

- Rate limiting is per IP and per process (memory store).
- No email verification, MFA, or per-account lockout yet.
- Password reset tokens appear in the URL query string; the reset page does
  not load third-party resources, so the token is not leaked via `Referer`.
