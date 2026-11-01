# AGENTS.md

## Run

```bash
docker compose -f docker-compose.base44.yml up -d
```

Web preview: http://localhost:3000. `docker compose -f docker-compose.base44.yml ps` should show
`db`, `api` and `web` healthy; `migrate` exits 0 by design.

## Non-obvious things

- **Install happens at container start**, not in a built image: both app services run
  `npm ci && exec npm run dev` from `node:22-bookworm-slim` with the source bind-mounted. Any
  change to `web/package.json` / `api/package.json` must be accompanied by a regenerated
  `package-lock.json`, or `npm ci` fails and the service crash-loops. Regenerate with:
  `docker run --rm -v "$PWD/web":/app -w /app node:22-bookworm-slim npm install --package-lock-only`
  (same for `api`).
- **Schema lives in `api/db/schema.sql` and is re-applied on every boot** by the one-shot `migrate`
  service via `psql`. It must stay idempotent (`CREATE TABLE IF NOT EXISTS`, guarded seed insert).
  After editing it: `docker compose -f docker-compose.base44.yml up -d` (recreated `migrate` runs
  again; `api`/`web` are untouched).
- **Single origin**: only port 3000 is published. The browser calls `/api/*`, which the Vite dev
  server proxies to `http://api:8000` (`API_URL`). Do not add a published API port or CORS unless
  external webhooks need one.
- **Sandbox host allowlist**: `web/vite.config.js` adds `.${BASE44_SANDBOX_HOST_DOMAIN}` to Vite's
  `allowedHosts` only when `BASE44_PREVIEW_MODE === '1'`; with the flag unset (or any other value)
  Vite's default host list applies. `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` is also passed through
  from compose.
- No external services and no credentials — Postgres runs as a compose service with local
  credentials in `docker-compose.base44.yml`.

## Verify

```bash
curl -s http://localhost:3000/ | head -5                 # dev HTML
curl -s http://localhost:3000/api/health                 # {"ok":true,"database":"up"}
curl -s http://localhost:3000/api/items                  # seeded rows
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/src/App.jsx   # 200 = unhashed dev source
```

Because the app has no hash-routed pages, checking `/` exercises the whole UI; the add and delete
buttons are the only mutations.
