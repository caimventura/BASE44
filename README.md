# Starter App

A small fullstack starting point: React + Vite frontend, Express API and Postgres.

- `web/` — Vite dev server on port 3000 (the public preview).
- `api/` — Express API on port 8000, reached from the browser through the Vite `/api` proxy (single origin).
- `api/db/schema.sql` — idempotent schema + seed, applied on every boot by the `migrate` service.

## Run it

```bash
docker compose -f docker-compose.base44.yml up -d
```

Open <http://localhost:3000>.

## How it is wired

- Everything runs from the cloned source: `node:22` base image, source bind-mounted, `npm ci` on
  startup and the framework dev commands (`vite`, `node --watch`) for live reload.
- Only port 3000 is exposed publicly; `/api/*` is proxied to the `api` service, so there is no CORS
  and session cookies stay same-origin.
- Postgres data lives in the `db-data` volume. The `migrate` service re-applies the schema on each
  boot, so editing `api/db/schema.sql` takes effect after `docker compose ... up -d`.

## Sandbox override

`web/vite.config.js` adds the sandbox hostname to Vite's `allowedHosts` **only** when
`BASE44_PREVIEW_MODE=1` (and `BASE44_SANDBOX_HOST_DOMAIN` is set), so the preview proxy is accepted.
Unset, Vite keeps its default host allowlist. Nothing else changes with the flag.

## No external credentials

The app uses only the local Postgres from the compose file — no third-party services.
