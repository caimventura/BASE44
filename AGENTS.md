# AGENTS.md

## Run

```bash
docker compose -f docker-compose.base44.yml up -d
```

Preview: <http://localhost:3000>. `ps` should show `db`, `api` and `web` healthy; `migrate` exits 0
by design.

## App

NetSim — a mobile-first network simulator (Packet-Tracer-like). Single page, no router.

- `web/src/App.jsx` owns UI state (mode: `select` | `place` | `connect` | `simulate`, plus the
  device picker sheet and the packet animation loop).
- `web/src/components/` — `NetworkCanvas` (nodes, SVG cables, pointer drag, packet), `DevicePicker`
  (device catalogue), `DevicePanel` (config sheet), `SimulationPanel` (log), `Toolbar`.
- `web/src/lib/deviceTypes.js` + `api/src/deviceTypes.js` — the same type table duplicated (no shared
  package between the two containers). Adding a type means editing both, plus the CHECK constraint
  in `api/db/schema.sql`.
- `api/src/lab.js` — CRUD for devices/links (including `x`/`y` moves) + `POST /api/simulate/ping`.
- `api/src/simulate.js` — pure simulation: BFS path, subnet math, routing rules; returns `path`
  (device ids, switches included) so the UI can animate the packet.

## Non-obvious things

- **Devices are positioned in percent (0–100)** so one layout works on phone and desktop. Placement
  is a tap on the canvas (`x`/`y` computed from the click), not drag — keep it that way on touch.
- **Switches are transparent to routing**: the simulation filters them out of the path before
  checking subnets/gateways. A router therefore needs an IP on each segment it bridges (`ip`/`mask`
  and `ip2`/`mask2` — only two interfaces exist).
- **Device behaviour follows the *category* (`end` / `switch` / `router`)**, not the type: the fancy
  types (notebook, server, phone, printer, hub, router_wifi) reuse the same three behaviours.
- **Dragging is pointer-based** (`pointerdown/move/up` on the node, `touch-action: none`), with a
  6px threshold separating tap from drag and `movedRef` swallowing the click a drag emits. Drag
  updates local state and persists through `PATCH /api/devices/:id` on release.
- **The packet animation is a `requestAnimationFrame` loop in `App.jsx`** (650ms per hop, ease-in-out)
  driving a percent-positioned `.packet` over `result.path`; positions are percentages so it lines up
  with nodes at any viewport.
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
