# Redis Production Deployment Notes (Property Sewa Backend)

## 1) Redis capability status in current backend

The backend already uses Redis in these areas:
- Property read cache (`listApproved`, `listSuggestions`, `getApprovedById`)
- Recently viewed properties (buyer)
- Rate limiting (Redis-first, in-memory fallback)
- Prometheus cache metrics endpoint (`/metrics`)

Redis connection entrypoint:
- `server/src/config/redis.ts`

Health visibility:
- `GET /health` reports:
  - `redis.enabled`
  - `redis.ready`

## 2) Production REDIS_URL behavior

When `REDIS_URL` is set:
- Backend attempts Redis connection at startup.
- If connection succeeds, Redis-backed cache/rate-limit/recently-viewed are active.

When `REDIS_URL` is missing or Redis is unavailable:
- Backend stays up (fail-safe).
- Property cache and recently viewed become no-op / empty-safe behavior.
- Rate limiting falls back to in-memory store.

## 3) Required Redis-related environment variables

Minimum required for production Redis usage:
- `REDIS_URL` (use `rediss://` for managed TLS providers like Upstash)

Strongly recommended tuning variables:
- `PROPERTY_CACHE_TTL_SECONDS`
- `PROPERTY_CACHE_NAMESPACE`
- `RECENTLY_VIEWED_MAX_ITEMS`
- `RECENTLY_VIEWED_TTL_SECONDS`
- `RATE_LIMIT_LOGIN_WINDOW_SECONDS`
- `RATE_LIMIT_LOGIN_MAX_REQUESTS`
- `RATE_LIMIT_REGISTER_WINDOW_SECONDS`
- `RATE_LIMIT_REGISTER_MAX_REQUESTS`
- `RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS`
- `RATE_LIMIT_FORGOT_PASSWORD_MAX_REQUESTS`
- `RATE_LIMIT_RESET_PASSWORD_WINDOW_SECONDS`
- `RATE_LIMIT_RESET_PASSWORD_MAX_REQUESTS`
- `RATE_LIMIT_CONTACT_WINDOW_SECONDS`
- `RATE_LIMIT_CONTACT_MAX_REQUESTS`
- `RATE_LIMIT_INQUIRY_WINDOW_SECONDS`
- `RATE_LIMIT_INQUIRY_MAX_REQUESTS`

## 4) Render deployment notes

Backend service (Render):
1. Add all backend env vars in Render dashboard.
2. Set `REDIS_URL` from your Redis provider (prefer `rediss://...`).
3. Deploy backend.
4. Verify:
   - `GET /health` => `redis.enabled: true`, `redis.ready: true`
   - `GET /metrics` returns Prometheus text

## 5) Vercel + backend notes

If frontend is on Vercel and backend is hosted separately:
1. Keep Redis env vars on backend host (Render/Railway/Fly/etc.).
2. Configure frontend to call backend base URL.
3. Do not place server-only Redis secrets in client-side env vars.

If backend itself is deployed as serverless functions:
- Ensure provider/runtime supports outbound Redis TLS connections.
- Use `rediss://` URL and verify connection pooling behavior for your platform.

## 6) Upstash Redis notes

1. Create Redis database in Upstash.
2. Copy connection string (`rediss://default:<password>@...`).
3. Set this value as backend `REDIS_URL`.
4. Redeploy backend and verify via `/health`.

## 7) Quick production verification checklist

1. `GET /health` shows Redis ready.
2. Hit property list/detail endpoints repeatedly and confirm behavior is stable.
3. Hit auth/contact/inquiry endpoints to verify 429 rate limit behavior.
4. Hit `GET /properties/recently-viewed` after viewing property details as buyer.
5. Check `GET /metrics` for cache counter series.
