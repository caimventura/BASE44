import express from 'express'
import { pool } from './db.js'
import {
  DEVICE_CATALOG,
  CABLE_TYPES,
  categoryOf,
  isDeviceType,
  portsOf,
} from './catalog.js'
import {
  DEVICE_COLUMNS,
  copyProject,
  createProject,
  freePort,
  loadTopology,
  logEvent,
  nextDeviceName,
  shareSlug,
  touchProject,
} from './projectStore.js'
import { defaultConfig, normalizeConfig } from './engine/config.js'
import { evaluateLab, starterConfig } from './engine/evaluate.js'
import { isValidIpv4, isValidMask, maskError } from './engine/ip.js'
import { simulatePing, simulateTraceroute } from './engine/ping.js'
import { requestDhcp, resolveDns, resolveService } from './engine/services.js'
import { runCli } from './engine/cli.js'
import { answerNetbot } from './engine/netbot.js'
import { requireAuth } from './auth.js'

export const projectsRouter = express.Router()

const asId = (value) => {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

const clampPosition = (value, fallback = 50) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(Math.max(number, 5), 95)
}

function validateConfig(type, config) {
  const normalized = normalizeConfig(type, config)
  for (const iface of normalized.interfaces) {
    if (iface.ip && !isValidIpv4(iface.ip)) {
      return `Endereço IP inválido em ${iface.name}: "${iface.ip}".`
    }
    if (iface.ip && iface.mask && !isValidMask(iface.mask)) {
      return `${iface.name}: ${maskError(iface.mask)}`
    }
    if (iface.ip && !iface.mask) {
      return `${iface.name}: a máscara é obrigatória para saber qual é a rede. Exemplo: 255.255.255.0 (/24).`
    }
    if (iface.gateway && !isValidIpv4(iface.gateway)) {
      return `Gateway inválido em ${iface.name}: "${iface.gateway}".`
    }
    if (iface.vlan !== undefined && (Number(iface.vlan) < 1 || Number(iface.vlan) > 4094)) {
      return `VLAN inválida em ${iface.name}.`
    }
  }
  for (const route of normalized.routes) {
    if (!isValidIpv4(route.network) || !isValidMask(route.mask)) {
      return 'Rota estática inválida: indique rede e máscara válidas.'
    }
    if (route.nextHop && !isValidIpv4(route.nextHop)) {
      return 'Rota estática com next-hop inválido.'
    }
  }
  const pool_ = normalized.services?.dhcp?.pool
  for (const [key, value] of Object.entries(pool_ ?? {})) {
    if (value && !isValidIpv4(value)) return `Pool DHCP inválido no campo ${key}.`
  }
  for (const record of normalized.services?.dns?.records ?? []) {
    if (!record.name || !isValidIpv4(record.ip)) {
      return 'Registo DNS inválido: indique o nome e um IP válido.'
    }
  }
  return null
}

function warningsFor(type, config) {
  const warnings = []
  const normalized = normalizeConfig(type, config)
  if (normalized.services?.dhcp?.enabled) {
    const pool_ = normalized.services.dhcp.pool
    if (!pool_.start || !pool_.end || !pool_.mask) {
      warnings.push('O DHCP está ativo mas o pool está incompleto — os clientes não receberão endereços.')
    }
  }
  if (normalized.services?.dns?.enabled && (normalized.services.dns.records ?? []).length === 0) {
    warnings.push('O DNS está ativo mas não tem registos configurados.')
  }
  if (categoryOf(type) === 'router') {
    const withIp = normalized.interfaces.filter((iface) => iface.ip)
    if (withIp.length === 1) {
      warnings.push('O router tem apenas uma interface com IP — para ligar duas redes precisa de IP em cada interface.')
    }
  }
  if (['switch', 'multilayer_switch'].includes(type)) {
    const trunk = normalized.interfaces.filter((iface) => iface.mode === 'trunk')
    if (trunk.length > 0 && trunk.some((iface) => !iface.trunkVlans)) {
      warnings.push('Há portas trunk sem lista de VLANs permitidas: todas as VLANs serão transportadas.')
    }
  }
  return warnings
}

async function loadProjectOr404(req, res) {
  const id = asId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Projeto inválido.' })
    return null
  }
  const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [id])
  const project = rows[0]
  if (!project) {
    res.status(404).json({ error: 'Projeto não encontrado.' })
    return null
  }
  if (project.user_id !== req.user.id && req.user.role !== 'teacher') {
    res.status(403).json({ error: 'Não tem permissão para este projeto.' })
    return null
  }
  return project
}

async function topologyOf(projectId) {
  return loadTopology(projectId)
}

const choosePort = (type, cable, links, deviceId) => {
  const ports = portsOf(type)
  const used = new Set(
    links.flatMap((link) => {
      if (link.a_id === deviceId) return [link.a_port]
      if (link.b_id === deviceId) return [link.b_port]
      return []
    }).filter(Boolean)
  )
  if (cable === 'wireless') {
    return ports.find((port) => port.wireless && !used.has(port.name))?.name ?? null
  }
  const wired = ports.filter((port) => !port.wireless)
  return wired.find((port) => !used.has(port.name))?.name ?? null
}

// ---- projetos --------------------------------------------------------------

projectsRouter.get('/projects', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
              (SELECT count(*) FROM project_devices d WHERE d.project_id = p.id)::int AS device_count,
              (SELECT count(*) FROM project_links l WHERE l.project_id = p.id)::int AS link_count
       FROM projects p WHERE p.user_id = $1 ORDER BY p.updated_at DESC`,
      [req.user.id]
    )
    res.json({ projects: rows })
  } catch (error) {
    next(error)
  }
})

projectsRouter.post('/projects', requireAuth, async (req, res, next) => {
  const name = String(req.body?.name ?? '').trim() || 'Novo laboratório'
  const description = String(req.body?.description ?? '').trim()
  const template = req.body?.template
  try {
    let starter = null
    if (template === 'lan') {
      starter = {
        devices: [
          { name: 'SW0', type: 'switch', x: 50, y: 40 },
          { name: 'PC0', type: 'pc', x: 25, y: 68 },
          { name: 'PC1', type: 'pc', x: 75, y: 68 },
        ],
        links: [
          { a: 'PC0', b: 'SW0' },
          { a: 'PC1', b: 'SW0' },
        ],
      }
    }
    const project = await createProject({ userId: req.user.id, name, description, starter })
    await logEvent({ projectId: project.id, userId: req.user.id, kind: 'project', message: `Projeto "${name}" criado.` })
    res.status(201).json({ project })
  } catch (error) {
    next(error)
  }
})

projectsRouter.post('/projects/from-lab/:labId', requireAuth, async (req, res, next) => {
  const labId = asId(req.params.labId)
  if (!labId) return res.status(400).json({ error: 'Laboratório inválido.' })
  try {
    const { rows } = await pool.query('SELECT * FROM labs WHERE id = $1 AND active = true', [labId])
    const lab = rows[0]
    if (!lab) return res.status(404).json({ error: 'Laboratório não encontrado.' })
    const name = String(req.body?.name ?? lab.title).trim()
    const project = await createProject({
      userId: req.user.id,
      name,
      description: lab.objective,
      starter: lab.starter,
    })
    await logEvent({
      projectId: project.id,
      userId: req.user.id,
      kind: 'lab',
      message: `Laboratório "${lab.title}" iniciado.`,
    })
    res.status(201).json({ project, labId: lab.id })
  } catch (error) {
    next(error)
  }
})

projectsRouter.get('/projects/shared/:slug', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description FROM projects WHERE share_slug = $1 AND share_enabled = true',
      [req.params.slug]
    )
    const project = rows[0]
    if (!project) return res.status(404).json({ error: 'Projeto partilhado não encontrado.' })
    const topology = await topologyOf(project.id)
    res.json({ project, ...topology, readOnly: true })
  } catch (error) {
    next(error)
  }
})

projectsRouter.get('/projects/:id', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  try {
    const topology = await topologyOf(project.id)
    res.json({ project, ...topology })
  } catch (error) {
    next(error)
  }
})

projectsRouter.patch('/projects/:id', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const name = req.body?.name === undefined ? null : String(req.body.name).trim()
  if (name !== null && name.length === 0) {
    return res.status(400).json({ error: 'O nome do projeto não pode ficar vazio.' })
  }
  const description = req.body?.description === undefined ? null : String(req.body.description)
  try {
    const { rows } = await pool.query(
      `UPDATE projects SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         updated_at = now()
       WHERE id = $3 RETURNING *`,
      [name, description, project.id]
    )
    res.json({ project: rows[0] })
  } catch (error) {
    next(error)
  }
})

projectsRouter.delete('/projects/:id', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [project.id])
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

projectsRouter.post('/projects/:id/duplicate', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  try {
    const copy = await copyProject(project.id, req.user.id)
    res.status(201).json({ project: copy })
  } catch (error) {
    next(error)
  }
})

projectsRouter.post('/projects/:id/share', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  try {
    const enabled = req.body?.enabled !== false
    const slug = project.share_slug ?? shareSlug()
    const { rows } = await pool.query(
      'UPDATE projects SET share_slug = $1, share_enabled = $2 WHERE id = $3 RETURNING *',
      [slug, enabled, project.id]
    )
    res.json({ project: rows[0] })
  } catch (error) {
    next(error)
  }
})

// ---- dispositivos ----------------------------------------------------------

projectsRouter.post('/projects/:id/devices', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const type = String(req.body?.type ?? '')
  if (!isDeviceType(type)) return res.status(400).json({ error: 'Tipo de equipamento inválido.' })
  try {
    let name = String(req.body?.name ?? '').trim()
    if (name) {
      const { rows } = await pool.query(
        'SELECT id FROM project_devices WHERE project_id = $1 AND name = $2',
        [project.id, name]
      )
      if (rows.length > 0) return res.status(409).json({ error: 'Já existe um equipamento com esse nome.' })
    } else {
      name = await nextDeviceName(project.id, type)
    }
    const config = defaultConfig(type)
    const { rows } = await pool.query(
      `INSERT INTO project_devices (project_id, name, type, x, y, config)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${DEVICE_COLUMNS}`,
      [
        project.id,
        name,
        type,
        clampPosition(req.body?.x),
        clampPosition(req.body?.y),
        JSON.stringify(config),
      ]
    )
    await touchProject(project.id)
    res.status(201).json({ device: rows[0] })
  } catch (error) {
    next(error)
  }
})

projectsRouter.post('/projects/:id/devices/:deviceId/duplicate', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const deviceId = asId(req.params.deviceId)
  try {
    const { rows } = await pool.query(
      `SELECT ${DEVICE_COLUMNS} FROM project_devices WHERE id = $1 AND project_id = $2`,
      [deviceId, project.id]
    )
    const device = rows[0]
    if (!device) return res.status(404).json({ error: 'Equipamento não encontrado.' })
    const name = await nextDeviceName(project.id, device.type)
    const { rows: created } = await pool.query(
      `INSERT INTO project_devices (project_id, name, type, x, y, config)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${DEVICE_COLUMNS}`,
      [
        project.id,
        name,
        device.type,
        clampPosition(device.x + 6),
        clampPosition(device.y + 6),
        JSON.stringify(device.config),
      ]
    )
    await touchProject(project.id)
    res.status(201).json({ device: created[0] })
  } catch (error) {
    next(error)
  }
})

projectsRouter.patch('/projects/:id/devices/:deviceId', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const deviceId = asId(req.params.deviceId)
  const body = req.body ?? {}
  try {
    const { rows } = await pool.query(
      `SELECT ${DEVICE_COLUMNS} FROM project_devices WHERE id = $1 AND project_id = $2`,
      [deviceId, project.id]
    )
    const device = rows[0]
    if (!device) return res.status(404).json({ error: 'Equipamento não encontrado.' })

    const updates = []
    const values = []
    const push = (column, value) => {
      values.push(value)
      updates.push(`${column} = $${values.length}`)
    }

    if ('name' in body) {
      const name = String(body.name ?? '').trim()
      if (!name) return res.status(400).json({ error: 'O nome não pode ficar vazio.' })
      push('name', name)
    }
    if ('x' in body) push('x', clampPosition(body.x, device.x))
    if ('y' in body) push('y', clampPosition(body.y, device.y))
    if ('powered' in body) push('powered', Boolean(body.powered))

    let warnings = []
    if ('config' in body) {
      const error = validateConfig(device.type, body.config)
      if (error) return res.status(400).json({ error })
      warnings = warningsFor(device.type, body.config)
      push('config', JSON.stringify(normalizeConfig(device.type, body.config)))
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar.' })
    values.push(deviceId)
    const { rows: updated } = await pool.query(
      `UPDATE project_devices SET ${updates.join(', ')} WHERE id = $${values.length}
       RETURNING ${DEVICE_COLUMNS}`,
      values
    )
    await touchProject(project.id)
    res.json({ device: updated[0], warnings })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Já existe um equipamento com esse nome.' })
    }
    next(error)
  }
})

projectsRouter.delete('/projects/:id/devices/:deviceId', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const deviceId = asId(req.params.deviceId)
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM project_devices WHERE id = $1 AND project_id = $2',
      [deviceId, project.id]
    )
    if (rowCount === 0) return res.status(404).json({ error: 'Equipamento não encontrado.' })
    await touchProject(project.id)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

// ---- cabos -----------------------------------------------------------------

projectsRouter.post('/projects/:id/links', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const aId = asId(req.body?.a)
  const bId = asId(req.body?.b)
  const cable = String(req.body?.cable ?? 'straight')
  if (!aId || !bId || aId === bId) {
    return res.status(400).json({ error: 'Escolha dois equipamentos diferentes.' })
  }
  if (!CABLE_TYPES[cable]) return res.status(400).json({ error: 'Tipo de cabo inválido.' })

  try {
    const topology = await topologyOf(project.id)
    const deviceA = topology.devices.find((device) => device.id === aId)
    const deviceB = topology.devices.find((device) => device.id === bId)
    if (!deviceA || !deviceB) return res.status(404).json({ error: 'Equipamento não encontrado.' })

    const duplicate = topology.links.some(
      (link) => (link.a_id === aId && link.b_id === bId) || (link.a_id === bId && link.b_id === aId)
    )
    if (duplicate) return res.status(409).json({ error: 'Estes equipamentos já estão ligados.' })

    const wirelessA = portsOf(deviceA.type).some((port) => port.wireless)
    const wirelessB = portsOf(deviceB.type).some((port) => port.wireless)
    if (cable === 'wireless' && (!wirelessA || !wirelessB)) {
      return res.status(400).json({ error: 'Os dois equipamentos precisam de interface wireless.' })
    }
    if (cable !== 'wireless' && (!portsOf(deviceA.type).some((port) => !port.wireless) || !portsOf(deviceB.type).some((port) => !port.wireless))) {
      return res.status(400).json({
        error: 'Um dos equipamentos só tem interface wireless — use uma ligação wireless.',
      })
    }
    if (cable === 'serial' && (categoryOf(deviceA.type) !== 'router' || categoryOf(deviceB.type) !== 'router')) {
      return res.status(400).json({ error: 'O cabo serial liga apenas routers entre si.' })
    }

    const aPort = req.body?.aPort || choosePort(deviceA.type, cable, topology.links, aId)
    const bPort = req.body?.bPort || choosePort(deviceB.type, cable, topology.links, bId)
    if (!aPort) return res.status(409).json({ error: `O ${deviceA.name} não tem portas livres.` })
    if (!bPort) return res.status(409).json({ error: `O ${deviceB.name} não tem portas livres.` })

    const portUsed = (deviceId, port) =>
      topology.links.some(
        (link) =>
          (link.a_id === deviceId && link.a_port === port) ||
          (link.b_id === deviceId && link.b_port === port)
      )
    if (portUsed(aId, aPort)) return res.status(409).json({ error: `A porta ${aPort} já está ocupada.` })
    if (portUsed(bId, bPort)) return res.status(409).json({ error: `A porta ${bPort} já está ocupada.` })

    const { rows } = await pool.query(
      `INSERT INTO project_links (project_id, a_id, b_id, a_port, b_port, cable)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, a_id, b_id, a_port, b_port, cable`,
      [project.id, aId, bId, aPort, bPort, cable]
    )
    await touchProject(project.id)
    res.status(201).json({ link: rows[0] })
  } catch (error) {
    next(error)
  }
})

projectsRouter.patch('/projects/:id/links/:linkId', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const linkId = asId(req.params.linkId)
  const cable = String(req.body?.cable ?? '')
  if (!CABLE_TYPES[cable]) return res.status(400).json({ error: 'Tipo de cabo inválido.' })
  try {
    const { rows } = await pool.query(
      'UPDATE project_links SET cable = $1 WHERE id = $2 AND project_id = $3 RETURNING id, a_id, b_id, a_port, b_port, cable',
      [cable, linkId, project.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Cabo não encontrado.' })
    await touchProject(project.id)
    res.json({ link: rows[0] })
  } catch (error) {
    next(error)
  }
})

projectsRouter.delete('/projects/:id/links/:linkId', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const linkId = asId(req.params.linkId)
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM project_links WHERE id = $1 AND project_id = $2',
      [linkId, project.id]
    )
    if (rowCount === 0) return res.status(404).json({ error: 'Cabo não encontrado.' })
    await touchProject(project.id)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

// ---- anotações -------------------------------------------------------------

projectsRouter.post('/projects/:id/annotations', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const text = String(req.body?.text ?? '').trim()
  if (!text) return res.status(400).json({ error: 'Escreva o texto da anotação.' })
  try {
    const { rows } = await pool.query(
      'INSERT INTO project_annotations (project_id, text, x, y) VALUES ($1, $2, $3, $4) RETURNING id, text, x, y',
      [project.id, text.slice(0, 160), clampPosition(req.body?.x), clampPosition(req.body?.y)]
    )
    await touchProject(project.id)
    res.status(201).json({ annotation: rows[0] })
  } catch (error) {
    next(error)
  }
})

projectsRouter.patch('/projects/:id/annotations/:annotationId', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const annotationId = asId(req.params.annotationId)
  const text = String(req.body?.text ?? '').trim()
  try {
    const { rows } = await pool.query(
      `UPDATE project_annotations SET
         text = COALESCE(NULLIF($1, ''), text),
         x = COALESCE($2, x),
         y = COALESCE($3, y)
       WHERE id = $4 AND project_id = $5 RETURNING id, text, x, y`,
      [text, req.body?.x === undefined ? null : clampPosition(req.body.x), req.body?.y === undefined ? null : clampPosition(req.body.y), annotationId, project.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Anotação não encontrada.' })
    res.json({ annotation: rows[0] })
  } catch (error) {
    next(error)
  }
})

projectsRouter.delete('/projects/:id/annotations/:annotationId', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  try {
    await pool.query('DELETE FROM project_annotations WHERE id = $1 AND project_id = $2', [
      asId(req.params.annotationId),
      project.id,
    ])
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

// ---- gravação integral da topologia (usada pelo editor e pelo undo/redo) ----

projectsRouter.put('/projects/:id/topology', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const incomingDevices = Array.isArray(req.body?.devices) ? req.body.devices : null
  const incomingLinks = Array.isArray(req.body?.links) ? req.body.links : []
  const incomingAnnotations = Array.isArray(req.body?.annotations) ? req.body.annotations : []
  if (!incomingDevices) return res.status(400).json({ error: 'Topologia inválida.' })

  const names = new Set()
  const prepared = []
  for (const [index, device] of incomingDevices.entries()) {
    if (!isDeviceType(device?.type)) {
      return res.status(400).json({ error: `Tipo de equipamento inválido (${device?.type ?? '?'}).` })
    }
    const name = String(device.name ?? '').trim()
    if (!name) return res.status(400).json({ error: 'Todos os equipamentos precisam de nome.' })
    if (names.has(name)) return res.status(409).json({ error: `Nome duplicado: ${name}.` })
    names.add(name)
    const configError = validateConfig(device.type, device.config)
    if (configError) return res.status(400).json({ error: `${name}: ${configError}` })
    prepared.push({
      key: device.id ?? `tmp-${index}`,
      id: Number(device.id),
      name,
      type: device.type,
      x: clampPosition(device.x),
      y: clampPosition(device.y),
      powered: device.powered !== false,
      config: normalizeConfig(device.type, device.config),
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Serializa gravações simultâneas do mesmo projeto: sem este bloqueio, dois
    // pedidos leem o mesmo estado e inserem equipamentos com nomes iguais.
    await client.query('SELECT id FROM projects WHERE id = $1 FOR UPDATE', [project.id])
    const { rows: existing } = await client.query(
      'SELECT id FROM project_devices WHERE project_id = $1',
      [project.id]
    )
    const existingIds = new Set(existing.map((row) => row.id))
    const idMap = new Map()
    const keep = new Set()

    // Remove primeiro os equipamentos que saíram da topologia: um nome pode
    // ser reutilizado (renomear, desfazer) sem colidir com o registo antigo.
    const incomingExisting = new Set(
      prepared
        .map((device) => device.id)
        .filter((id) => Number.isInteger(id) && existingIds.has(id))
    )
    const removedFirst = [...existingIds].filter((id) => !incomingExisting.has(id))
    if (removedFirst.length > 0) {
      await client.query('DELETE FROM project_devices WHERE project_id = $1 AND id = ANY($2::int[])', [
        project.id,
        removedFirst,
      ])
    }

    for (const device of prepared) {
      if (Number.isInteger(device.id) && existingIds.has(device.id)) {
        await client.query(
          `UPDATE project_devices SET name = $1, type = $2, x = $3, y = $4, powered = $5, config = $6
           WHERE id = $7 AND project_id = $8`,
          [device.name, device.type, device.x, device.y, device.powered, JSON.stringify(device.config), device.id, project.id]
        )
        idMap.set(device.key, device.id)
        keep.add(device.id)
      } else {
        const { rows } = await client.query(
          `INSERT INTO project_devices (project_id, name, type, x, y, powered, config)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [project.id, device.name, device.type, device.x, device.y, device.powered, JSON.stringify(device.config)]
        )
        idMap.set(device.key, rows[0].id)
        keep.add(rows[0].id)
      }
    }

    const removed = [...existingIds].filter((id) => !keep.has(id))
    if (removed.length > 0) {
      await client.query('DELETE FROM project_devices WHERE project_id = $1 AND id = ANY($2::int[])', [
        project.id,
        removed,
      ])
    }

    await client.query('DELETE FROM project_links WHERE project_id = $1', [project.id])
    const usedPorts = new Map()
    const portUsed = (deviceId, port) => (usedPorts.get(deviceId) ?? new Set()).has(port)
    const markPort = (deviceId, port) => {
      if (!usedPorts.has(deviceId)) usedPorts.set(deviceId, new Set())
      usedPorts.get(deviceId).add(port)
    }
    const pickPort = (type, deviceId, cable, wanted) => {
      if (wanted && portsOf(type).some((port) => port.name === wanted) && !portUsed(deviceId, wanted)) {
        markPort(deviceId, wanted)
        return wanted
      }
      const options = portsOf(type).filter((port) =>
        cable === 'wireless' ? port.wireless : !port.wireless
      )
      const free = options.find((port) => !portUsed(deviceId, port.name))
      if (free) markPort(deviceId, free.name)
      return free?.name ?? null
    }

    for (const link of incomingLinks) {
      const a = idMap.get(link.a_id)
      const b = idMap.get(link.b_id)
      if (!a || !b || a === b) continue
      const cable = CABLE_TYPES[link.cable] ? link.cable : 'straight'
      const deviceA = prepared.find((device) => idMap.get(device.key) === a)
      const deviceB = prepared.find((device) => idMap.get(device.key) === b)
      if (!deviceA || !deviceB) continue
      const aPort = pickPort(deviceA.type, a, cable, link.a_port)
      const bPort = pickPort(deviceB.type, b, cable, link.b_port)
      if (!aPort || !bPort) continue
      await client.query(
        `INSERT INTO project_links (project_id, a_id, b_id, a_port, b_port, cable)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [project.id, a, b, aPort, bPort, cable]
      )
    }

    await client.query('DELETE FROM project_annotations WHERE project_id = $1', [project.id])
    for (const annotation of incomingAnnotations) {
      const text = String(annotation?.text ?? '').trim().slice(0, 160)
      if (!text) continue
      await client.query(
        'INSERT INTO project_annotations (project_id, text, x, y) VALUES ($1, $2, $3, $4)',
        [project.id, text, clampPosition(annotation.x), clampPosition(annotation.y)]
      )
    }

    await client.query('UPDATE projects SET updated_at = now() WHERE id = $1', [project.id])
    await client.query('COMMIT')
    res.json(await topologyOf(project.id))
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Já existe um equipamento com esse nome.' })
    }
    next(error)
  } finally {
    client.release()
  }
})

// ---- simulação -------------------------------------------------------------

projectsRouter.post('/projects/:id/ping', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const from = asId(req.body?.from)
  const to = asId(req.body?.to)
  if (!from || !to) return res.status(400).json({ error: 'Escolha dois equipamentos.' })
  try {
    const { devices, links } = await topologyOf(project.id)
    const mode = req.body?.mode === 'traceroute' ? 'traceroute' : 'ping'
    const result =
      mode === 'traceroute'
        ? simulateTraceroute(devices, links, from, to)
        : simulatePing(devices, links, from, to)
    await logEvent({
      projectId: project.id,
      userId: req.user.id,
      kind: 'simulation',
      message: result.ok ? result.summary : `Falha: ${result.reason}`,
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

projectsRouter.post('/projects/:id/dhcp/:deviceId', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const deviceId = asId(req.params.deviceId)
  try {
    const { devices, links } = await topologyOf(project.id)
    const result = requestDhcp(devices, links, deviceId)
    if (result.ok) {
      await pool.query('UPDATE project_devices SET config = $1 WHERE id = $2 AND project_id = $3', [
        JSON.stringify(result.config),
        deviceId,
        project.id,
      ])
      await logEvent({ projectId: project.id, userId: req.user.id, kind: 'dhcp', message: result.summary })
    }
    res.json(result)
  } catch (error) {
    next(error)
  }
})

projectsRouter.post('/projects/:id/dns', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const deviceId = asId(req.body?.deviceId)
  try {
    const { devices, links } = await topologyOf(project.id)
    const result = resolveDns(devices, links, deviceId, req.body?.name)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

projectsRouter.post('/projects/:id/service', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  try {
    const { devices, links } = await topologyOf(project.id)
    const result = resolveService(
      devices,
      links,
      asId(req.body?.deviceId),
      req.body?.hostname,
      req.body?.service
    )
    res.json(result)
  } catch (error) {
    next(error)
  }
})

projectsRouter.post('/projects/:id/cli', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const deviceId = asId(req.body?.deviceId)
  if (!deviceId) return res.status(400).json({ error: 'Equipamento inválido.' })
  try {
    const { devices, links } = await topologyOf(project.id)
    const result = runCli({
      devices,
      links,
      deviceId,
      command: String(req.body?.command ?? ''),
      mode: req.body?.mode ?? 'user',
    })
    if (result.changed && result.config) {
      await pool.query('UPDATE project_devices SET config = $1 WHERE id = $2 AND project_id = $3', [
        JSON.stringify(result.config),
        deviceId,
        project.id,
      ])
      await touchProject(project.id)
    }
    res.json({
      output: result.output,
      mode: result.mode,
      prompt: result.prompt,
      changed: Boolean(result.changed),
    })
  } catch (error) {
    next(error)
  }
})

projectsRouter.post('/projects/:id/netbot', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  try {
    const { devices, links } = await topologyOf(project.id)
    res.json(
      answerNetbot({
        question: String(req.body?.question ?? ''),
        devices,
        links,
        selectedDeviceId: asId(req.body?.selectedDeviceId),
      })
    )
  } catch (error) {
    next(error)
  }
})

projectsRouter.post('/projects/:id/labs/:labId/verify', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  const labId = asId(req.params.labId)
  try {
    const { rows: labs } = await pool.query('SELECT * FROM labs WHERE id = $1', [labId])
    const lab = labs[0]
    if (!lab) return res.status(404).json({ error: 'Laboratório não encontrado.' })
    const { devices, links } = await topologyOf(project.id)
    const result = evaluateLab(lab, devices, links)

    await pool.query(
      `INSERT INTO lab_submissions (lab_id, user_id, project_id, score, max_score, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [lab.id, req.user.id, project.id, result.score, result.maxScore, JSON.stringify(result)]
    )
    await pool.query(
      `INSERT INTO progress_records (user_id, kind, ref_id, score, status, updated_at)
       VALUES ($1, 'lab', $2, $3, $4, now())
       ON CONFLICT (user_id, kind, ref_id)
       DO UPDATE SET score = GREATEST(progress_records.score, EXCLUDED.score), updated_at = now()`,
      [req.user.id, lab.id, result.score, result.passed ? 'completed' : 'in_progress']
    )
    const xp = Math.round(result.score * 5)
    await pool.query(
      `UPDATE student_profiles SET xp = xp + $1, minutes_learning = minutes_learning + 5,
         level = LEAST(10, 1 + ((xp + $1) / 400)) WHERE user_id = $2`,
      [xp, req.user.id]
    )
    res.json(result)
  } catch (error) {
    next(error)
  }
})

projectsRouter.get('/projects/:id/events', requireAuth, async (req, res, next) => {
  const project = await loadProjectOr404(req, res)
  if (!project) return
  try {
    const { rows } = await pool.query(
      'SELECT id, kind, message, created_at FROM network_events WHERE project_id = $1 ORDER BY id DESC LIMIT 40',
      [project.id]
    )
    res.json({ events: rows })
  } catch (error) {
    next(error)
  }
})

export { starterConfig, DEVICE_CATALOG }
