# Backend Wallet Checklist

Backend entrypoint:
- [server/index.mjs](/home/nickciaff/rift-raiders/server/index.mjs)

Persistence:
- [server/db.mjs](/home/nickciaff/rift-raiders/server/db.mjs)
- [server/sql/schema.sql](/home/nickciaff/rift-raiders/server/sql/schema.sql)

Shared monetization catalog:
- [shared/monetization-catalog.js](/home/nickciaff/rift-raiders/shared/monetization-catalog.js)

## Local setup

- Run `npm run server`
- Provision a Postgres database and set `DATABASE_URL`
- Set `RIFT_RAIDERS_SERVER_TOKEN` to a non-default secret
- Set `REVENUECAT_SECRET_API_KEY` to a RevenueCat secret key with customer read access
- Set `REVENUECAT_WEBHOOK_AUTH` to the secret you configure on the RevenueCat webhook integration
- If needed, set `PORT`, `HOST`, and `DATABASE_SSL`
- Update [src/iap-config.js](/home/nickciaff/rift-raiders/src/iap-config.js) so `backend.baseUrl` points at the running server
- Keep `backend.apiToken` in sync with `RIFT_RAIDERS_SERVER_TOKEN`

## API endpoints

- `GET /health`
- `GET /api/wallet/:appUserId`
- `POST /api/wallet/grant`
- `POST /api/wallet/spend`
- `POST /api/iap/reconcile`
- `POST /api/revenuecat/webhook`

## QA checklist

- New wallet initializes with 150 gems for a fresh `appUserId`
- Successful purchase grants gems once even if the same transaction is retried
- RevenueCat webhook with the same `event.id` is ignored on replay
- Purchase retries return duplicate status instead of double-granting
- `/api/iap/reconcile` returns `purchase_not_yet_verified` until RevenueCat webhook or API verification finds the transaction
- Summon spend reduces backend gem balance and blocks when funds are insufficient
- Quest, idle, and boss gem grants update backend balance
- Changing devices with the same RevenueCat `appUserId` restores gem balance from backend

## Production hardening

- Restrict `/api/wallet/grant` so only server-authoritative gameplay events can mint gems
- Verify purchases server-side via RevenueCat webhooks or API, not client-submitted transaction data
- Add authenticated user identity binding so `appUserId` cannot be spoofed by arbitrary clients
- Rotate the API token and move it out of client source before release
