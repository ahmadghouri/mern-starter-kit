# Authentication

## Tokens

| Token | Format | Lifetime | Where it lives |
|---|---|---|---|
| Access token | JWT (HS256), claims `sub`, `role`, `sid` | 15 min (`ACCESS_TOKEN_TTL_SECONDS`) | Frontend memory only |
| Refresh token | 48 random bytes, base64url | 7 days sliding, 30 days max | `refresh_token` cookie: `HttpOnly`, `Secure` (prod), `SameSite=Strict`, `Path=/api/auth` |
| Reset token | 32 random bytes, base64url | 30 min (`PASSWORD_RESET_TTL_MINUTES`) | Email link only |

The database stores only SHA-256 hashes of refresh and reset tokens.
Passwords are hashed with bcrypt (cost 12 by default).

## Endpoints

All responses use `{ "data": ... }` on success and
`{ "error": { "code", "message", "details?" } }` on failure.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | none | `{ name, email, password }` -> 201, signs in |
| POST | `/api/auth/login` | none | `{ email, password }` -> 200 |
| POST | `/api/auth/refresh` | cookie | Rotates the refresh token, returns a new access token |
| POST | `/api/auth/logout` | cookie | Revokes the current session -> 204 |
| POST | `/api/auth/logout-all` | bearer | Revokes every session of the user -> 204 |
| GET | `/api/auth/me` | bearer | Current user |
| GET | `/api/auth/sessions` | bearer | Active sessions, `current: true` for this device |
| DELETE | `/api/auth/sessions/:id` | bearer | Revokes one of the user's own sessions -> 204 |
| POST | `/api/auth/forgot-password` | none | Always 200 with the same message |
| POST | `/api/auth/reset-password` | none | `{ token, password }`, signs out all devices |
| GET | `/api/health/live`, `/api/health/ready` | none | Liveness and readiness |

Login, register, forgot, and reset are rate limited (`RATE_LIMIT_AUTH_MAX`
per 15 minutes per IP).

## Google sign-in (optional)

Enabled only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
in `backend/.env`. The web app asks `GET /api/auth/providers`
(`{ providers: { google: true | false } }`) and shows "Continue with Google"
only when it is enabled. With Google off, every `/api/auth/google/*` route
returns 404.

Flow (OAuth 2.0 authorization code flow with PKCE, all server side):

1. The browser navigates to `GET /api/auth/google`. The API stores a random
   `state` (SHA-256 hash only) and a PKCE verifier in the `oauthstates`
   collection for 10 minutes, sets the raw state in an httpOnly
   `oauth_state` cookie (`SameSite=Lax`, path `/api/auth/google`), and
   redirects to Google.
2. Google redirects to `GET /api/auth/google/callback?code&state`. The state
   must match the cookie and an unused, unexpired record (single use).
3. The API exchanges the code (with the client secret and PKCE verifier) at
   Google's token endpoint and checks the ID token's `iss`, `aud`, `exp`,
   `sub`, and `email_verified`. The token comes straight from Google over
   TLS, so no extra signature check is needed (OpenID Connect Core 3.1.3.7).
4. It signs the user in (same session and refresh cookie as a password
   login) and redirects to `APP_URL`. Failures redirect to
   `/login?error=google_*` with a code the web app turns into a message.

Accounts:

- A Google account is matched by its id (`googleId`), never by email alone.
- New Google users get an account without a password. They can set one with
  "Forgot password". Until then, password login, email change, and password
  change return 400 `NO_PASSWORD_SET` or fail like a wrong password.
- If a password account already uses the Google email, sign-in is refused
  (`google_account_exists`). This blocks "pre-account takeover": someone who
  registered that email earlier could otherwise share the account. The owner
  signs in with the password and uses **Profile → Connected accounts →
  Connect Google** (`GET /api/auth/google?intent=link`, identified by the
  refresh cookie).
- `DELETE /api/profile/google` disconnects Google. It requires a password so
  users cannot lock themselves out.

## Profile endpoints

All `/api/profile/*` routes require a bearer token and act on the signed-in
user only. Users include `avatarVersion` (a timestamp, or `null` without a
picture).

| Method | Path | Notes |
|---|---|---|
| PATCH | `/api/profile` | `{ name }` -> `{ user }` |
| PATCH | `/api/profile/email` | `{ email, currentPassword }` -> `{ user }`. 409 `EMAIL_TAKEN` if used. Deletes pending reset links |
| PUT | `/api/profile/password` | `{ currentPassword, newPassword }`. Signs out every other device, keeps this one |
| PUT | `/api/profile/avatar` | Raw image body (`Content-Type: image/webp`, `image/avif`, `image/png`, or `image/jpeg`), max 512 KB -> `{ user }` |
| DELETE | `/api/profile/avatar` | Removes the picture -> `{ user }` |
| GET | `/api/avatars/:userId?v=<avatarVersion>` | Public image, so `<img>` tags work without a token |

Email and password changes need the current password (wrong password: 400
`INVALID_CURRENT_PASSWORD` with a `currentPassword` field error) and share
the login rate limit.

Avatar safety: the browser crops the image to 256x256 and re-encodes it as
WebP (PNG if the browser cannot encode WebP), which also strips EXIF data.
The server never trusts the `Content-Type` header; it detects the format
from the file's magic bytes, rejects everything else (including SVG), and
serves images with `nosniff` and `Content-Security-Policy: default-src 'none'`.
Avatars are stored in a separate `avatars` collection. Avatar URLs are public
by design, like most apps; do not use them for private images.

The theme (light, dark, system) is a per-browser preference stored in
`localStorage`, not on the server.

## Admin endpoints

Every `/api/admin/*` route requires a bearer token with `role: "admin"`
(401 without a valid session, 403 for other roles).

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/stats` | `{ totalUsers, admins, newUsersLast7Days, activeSessions }` |
| GET | `/api/admin/users` | Query: `page` (default 1), `limit` (1 to 100, default 20), `search` (name or email, plain text), `role`. Returns `users` (with `activeSessions`) and `pagination` |
| PATCH | `/api/admin/users/:userId/role` | `{ role: "user" \| "admin" }`. Revokes that user's sessions |
| DELETE | `/api/admin/users/:userId/sessions` | Signs the user out on every device -> 204 |

The role is part of the access token, so a role change revokes the user's
sessions (`revokedReason: "role_changed"`). The new role applies the next
time they sign in, and a demoted admin loses access immediately. Admins
cannot change their own role or revoke their own sessions through these
endpoints, which also prevents locking out the last admin.

The web app shows the admin dashboard at `/admin` only to admins. That check
is for UX; the API enforces the role on every request.

## Sessions

A `Session` document represents one signed-in device. It stores the current
refresh token hash, the previous hash, user agent, IP, and expiry dates.
MongoDB deletes expired sessions with a TTL index.

Every authenticated request checks that the session in the access token
(`sid`) is still active. Because of this, logout and "sign out everywhere"
take effect immediately, not after the access token expires.

## Refresh flow and rotation

```text
Browser                         API
  | POST /auth/refresh (cookie)  |
  |----------------------------->|  find session by token hash
  |                              |  swap hash atomically (old -> previousTokenHash)
  |  200 { accessToken, user }   |
  |<-----------------------------|  Set-Cookie: new refresh token
```

Reuse detection: if a request presents a token that matches `previousTokenHash`:

- within `REFRESH_REUSE_GRACE_SECONDS` (default 10s): treated as a parallel
  request from the same browser, rejected with `REFRESH_CONFLICT`, session kept
- after the grace window: treated as a stolen token, the whole session is
  revoked (`reuse_detected`) and a warning is logged

## Frontend behaviour

- `src/lib/api-client.js` keeps the access token in a module variable.
- On app start, `AuthProvider` calls `/auth/refresh` to restore the session.
- Any authenticated request that returns 401 triggers one refresh and one retry.
- Concurrent refresh calls share a single request (needed because tokens rotate).
- When the refresh fails, the app switches to signed-out state.

## Password reset

1. `forgot-password` creates a token (only the newest one is valid) and emails
   `APP_URL/reset-password?token=...`. The response is identical whether or not
   the email exists, and email sending does not block the response.
2. `reset-password` consumes the token atomically (`findOneAndDelete`), so it
   works only once, updates the password hash, and revokes all sessions.

## Not included yet

- Email verification on sign up
- Change password while signed in
- Multi-factor authentication
- Account lockout per account (rate limiting is per IP)
