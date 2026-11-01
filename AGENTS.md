# AGENTS.md

## Run

```bash
docker compose -f docker-compose.base44.yml up -d
```

Preview: <http://localhost:3000>. `ps` should show `db`, `api` and `web` healthy; `migrate` exits 0
by design.

## App

NetSim — a mobile-first network simulator (Packet-Tracer-like). Single page, no router.

- `web/src/App.jsx` owns UI state (mode: `select` | `place` | `connect` | `ping`).
- `web/src/components/` — `NetworkCanvas` (nodes + SVG cables, percentage coordinates),
  `DevicePanel` (config sheet), `PingPanel` (simulation log), `Toolbar`.
- `api/src/lab.js` — CRUD for devices/links + `POST /api/simulate/ping`.
- `api/src/simulate.js` — pure simulation: BFS path, subnet math, routing rules.

## Non-obvious things

- **Devices are positioned in percent (0–100)** so one layout works on phone and desktop. Placement
  is a tap on the canvas (`x`/`y` computed from the click), not drag — keep it that way on touch.
- **Switches are transparent to routing**: the simulation filters them out of the path before
  checking subnets/gateways. A router therefore needs an IP on each segment it bridges (`ip`/`mask`
  and `ip2`/`mask2` — only two interfaces exist).
- **Schema is re-applied on every boot** by the `migrate` service (`psql -f api/db/schema.sql`).
  It must stay idempotent. The seed lab only inserts when `devices` is **empty**, so it comes back
  if every device is deleted and the stack restarts.
- **Install happens at container start**: `npm ci && exec npm run dev` from `node:22-bookworm-slim`
  with the source bind-mounted. Changing a `package.json` requires regenerating its lockfile:
  `docker run --rm -v "$PWD/web":/app -w /app node:22-bookworm-slim npm install --package-lock-only`.
- **Single origin**: only port 3000 is published; Vite proxies `/api` to `http://api:8000`
  (`API_URL`). No CORS.
- **Sandbox host allowlist**: `web/vite.config.js` adds `.${BASE44_SANDBOX_HOST_DOMAIN}` to Vite's
  `allowedHosts` only when `BASE44_PREVIEW_MODE === '1'`.
- No external services and no credentials.

## Verify

```bash
curl -s http://localhost:3000/api/health                 # {"ok":true,"database":"up"}
curl -s http://localhost:3000/api/lab                    # 5 seeded devices, 4 links
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"from":1,"to":5}' http://localhost:3000/api/simulate/ping   # PC1 -> PC3, routed, ok
```

In the UI the three gestures are: tap a device (config sheet), **Cabo** then two devices, **Ping**
then two PCs. Creating a device and deleting it again is the cheapest end-to-end check.
