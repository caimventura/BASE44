import crypto from 'node:crypto'
import { pool } from './db.js'
import { DEVICE_CATALOG, portsOf, prefixOf } from './catalog.js'
import { starterConfig } from './engine/evaluate.js'

export const DEVICE_COLUMNS = 'id, project_id, name, type, x, y, powered, config'

export async function loadTopology(projectId) {
  const [devices, links, annotations] = await Promise.all([
    pool.query(`SELECT ${DEVICE_COLUMNS} FROM project_devices WHERE project_id = $1 ORDER BY id`, [projectId]),
    pool.query('SELECT id, a_id, b_id, a_port, b_port, cable FROM project_links WHERE project_id = $1 ORDER BY id', [projectId]),
    pool.query('SELECT id, text, x, y FROM project_annotations WHERE project_id = $1 ORDER BY id', [projectId]),
  ])
  return { devices: devices.rows, links: links.rows, annotations: annotations.rows }
}

export const freePort = (type, links, deviceId) => {
  const used = new Set(
    links.flatMap((link) => {
      if (link.a_id === deviceId && link.a_port) return [link.a_port]
      if (link.b_id === deviceId && link.b_port) return [link.b_port]
      return []
    })
  )
  return portsOf(type).find((port) => !used.has(port.name))?.name ?? null
}

export async function nextDeviceName(projectId, type) {
  const { rows } = await pool.query('SELECT name FROM project_devices WHERE project_id = $1', [projectId])
  const taken = new Set(rows.map((row) => row.name))
  const prefix = prefixOf(type)
  let index = 0
  while (taken.has(`${prefix}${index}`)) index += 1
  return `${prefix}${index}`
}

export async function applyStarter(projectId, starter) {
  if (!starter?.devices?.length) return
  const ids = new Map()
  const createdLinks = []

  for (const spec of starter.devices) {
    if (!DEVICE_CATALOG[spec.type]) continue
    const name = spec.name ?? (await nextDeviceName(projectId, spec.type))
    const config = starterConfig(spec)
    const { rows } = await pool.query(
      `INSERT INTO project_devices (project_id, name, type, x, y, config)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [projectId, name, spec.type, spec.x ?? 50, spec.y ?? 50, JSON.stringify(config)]
    )
    ids.set(name, { id: rows[0].id, type: spec.type })
  }

  for (const link of starter.links ?? []) {
    const a = ids.get(link.a)
    const b = ids.get(link.b)
    if (!a || !b || a.id === b.id) continue
    const aPort = freePort(a.type, createdLinks, a.id)
    const bPort = freePort(b.type, createdLinks, b.id)
    if (!aPort || !bPort) continue
    const { rows } = await pool.query(
      `INSERT INTO project_links (project_id, a_id, b_id, a_port, b_port, cable)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, a_id, b_id, a_port, b_port, cable`,
      [projectId, a.id, b.id, aPort, bPort, link.cable ?? 'straight']
    )
    createdLinks.push(rows[0])
  }
}

export async function createProject({ userId, name, description = '', starter = null }) {
  const { rows } = await pool.query(
    `INSERT INTO projects (user_id, name, description) VALUES ($1, $2, $3)
     RETURNING id, user_id, name, description, share_slug, share_enabled, created_at, updated_at`,
    [userId, name, description]
  )
  const project = rows[0]
  if (starter) await applyStarter(project.id, starter)
  return project
}

export async function copyProject(projectId, userId, name) {
  const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId])
  const source = rows[0]
  if (!source) return null
  const copy = await createProject({
    userId,
    name: name ?? `${source.name} (cópia)`,
    description: source.description,
  })
  const topology = await loadTopology(projectId)
  const idMap = new Map()
  for (const device of topology.devices) {
    const { rows: inserted } = await pool.query(
      `INSERT INTO project_devices (project_id, name, type, x, y, powered, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [copy.id, device.name, device.type, device.x, device.y, device.powered, JSON.stringify(device.config)]
    )
    idMap.set(device.id, inserted[0].id)
  }
  for (const link of topology.links) {
    await pool.query(
      `INSERT INTO project_links (project_id, a_id, b_id, a_port, b_port, cable)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [copy.id, idMap.get(link.a_id), idMap.get(link.b_id), link.a_port, link.b_port, link.cable]
    )
  }
  for (const annotation of topology.annotations) {
    await pool.query(
      'INSERT INTO project_annotations (project_id, text, x, y) VALUES ($1, $2, $3, $4)',
      [copy.id, annotation.text, annotation.x, annotation.y]
    )
  }
  return copy
}

export const shareSlug = () => crypto.randomBytes(6).toString('hex')

export async function touchProject(projectId) {
  await pool.query('UPDATE projects SET updated_at = now() WHERE id = $1', [projectId])
}

export async function logEvent({ projectId, userId, kind, message }) {
  await pool.query(
    'INSERT INTO network_events (project_id, user_id, kind, message) VALUES ($1, $2, $3, $4)',
    [projectId ?? null, userId ?? null, kind, message]
  )
}

export async function projectForUser(projectId, user) {
  const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId])
  const project = rows[0]
  if (!project) return null
  if (project.user_id !== user?.id && user?.role !== 'teacher') return null
  return project
}
