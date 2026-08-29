# Auth API — Phase 1

Base path: `/api/v1/auth`

All responses use the standard envelope:
`{ "success": true, "data": {...} }` or
`{ "success": false, "error": { "code", "message", "details" } }`.

## POST /register

Body: `{ "email": string, "password": string (min 8 chars) }`

- `201` — `{ user: { id, email, role }, accessToken }`. Also sets the
  `fitverse_refresh_token` httpOnly cookie, scoped to `/api/v1/auth`.
- `409 EMAIL_TAKEN` — email already registered.
- `400 VALIDATION_ERROR` — bad payload.

## POST /login

Body: `{ "email": string, "password": string }`

- `200` — same shape as register.
- `401 INVALID_CREDENTIALS` — wrong password **or** unknown email (identical
  error deliberately, to avoid leaking which accounts exist).

## POST /refresh

No body — reads the refresh cookie automatically.

- `200` — new `accessToken` + refreshed user, and rotates the refresh
  cookie (the old one is revoked server-side and can't be reused).
- `401 UNAUTHORIZED` — missing, expired, revoked, or unknown refresh token.

## POST /logout

No body — reads the refresh cookie automatically.

- `200` — `{ loggedOut: true }`. Revokes the refresh token server-side and
  clears the cookie. Idempotent — calling it with no/invalid cookie still
  returns `200`.

## GET /api/v1/users/me (protected)

Requires `Authorization: Bearer <accessToken>`.

- `200` — `{ id, email, role, createdAt }` for the authenticated user.
- `401 UNAUTHORIZED` — missing/invalid/expired access token.
- `403 FORBIDDEN` — authenticated but role not permitted (not reachable by
  a normal user on this particular route, since both roles are allowed —
  this is the shape future admin-only routes will reuse).

## Token model

- **Access token**: JWT, 15 min default (`JWT_ACCESS_EXPIRES_IN`), sent in
  the response body, meant to be held in memory on the client and attached
  as a Bearer token.
- **Refresh token**: opaque random value, 7 days default
  (`JWT_REFRESH_EXPIRES_IN_DAYS`), stored **hashed** in the `RefreshToken`
  table, delivered only via an `httpOnly`, `SameSite=Lax` cookie. Rotates
  on every `/refresh` call — the previous token is revoked and cannot be
  reused (replay protection).
