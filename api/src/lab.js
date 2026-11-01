import express from 'express'
import { pool } from './db.js'
import { isValidIpv4, simulatePing } from './simulate.js'

export const labRouter = express.Router()

const DEVICE_TYPES = new Set(['pc', 'switch', 'router'])
const NAME_PREFIX = { pc: 'PC', switch: 'SW', router: 'R' }
const IP_FIELDS = ['ip', 'mask', 'gateway', 'ip2', 'mask2']
const FIELD_LABELS = {
  ip: 'IP',
  mask: 'Máscara',
  gateway: 'Gateway',
  ip2: 'IP da segunda interface',
  mask2: 'Máscara da segunda interface',
}
const DEVICE_COLUMNS =
  'id, name, type, x, y, ip, mask, gateway, ip2, mask2'

const clampPosition = (value, fallback) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(Math.max(number, 6), 94)
}

async function loadLab() {
  const [devices, links] = await Promise.all([
    pool.query(`SELECT ${DEVICE_COLUMNS} FROM devices ORDER BY id`),
    pool.query('SELECT id, a_id, b_id FROM links ORDER BY id'),
  ])
  return { devices: devices.rows, links: links.rows }
}

labRouter.get('/lab', async (_req, res, next) => {
  try {
    res.json(await loadLab())
  } catch (error) {
    next(error)
  }
})

labRouter.post('/devices', async (req, res, next) => {
  const body = req.body ?? {}
  if (!DEVICE_TYPES.has(body.type)) {
    return res.status(400).json({ error: 'Tipo de dispositivo inválido.' })
  }

  try {
    const { rows: existing } = await pool.query('SELECT name FROM devices')
    const taken = new Set(existing.map((row) => row.name))
    const prefix = NAME_PREFIX[body.type]
    let index = 1
    while (taken.has(`${prefix}${index}`)) index += 1

    const { rows } = await pool.query(
      `INSERT INTO devices (name, type, x, y) VALUES ($1, $2, $3, $4)
       RETURNING ${DEVICE_COLUMNS}`,
      [`${prefix}${index}`, body.type, clampPosition(body.x, 50), clampPosition(body.y, 50)]
    )
    res.status(201).json(rows[0])
  } catch (error) {
    next(error)
  }
})

labRouter.patch('/devices/:id', async (req, res, next) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Dispositivo inválido.' })
  }

  const body = req.body ?? {}
  const updates = []
  const values = []

  if ('name' in body) {
    const name = String(body.name ?? '').trim()
    if (!name) return res.status(400).json({ error: 'O nome não pode ficar vazio.' })
    values.push(name)
    updates.push(`name = $${values.length}`)
  }

  for (const field of IP_FIELDS) {
    if (!(field in body)) continue
    const raw = String(body[field] ?? '').trim()
    if (raw && !isValidIpv4(raw)) {
      return res.status(400).json({ error: `${FIELD_LABELS[field]} inválido.` })
    }
    values.push(raw || null)
    updates.push(`${field} = $${values.length}`)
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nada para atualizar.' })
  }

  values.push(id)
  try {
    const { rows } = await pool.query(
      `UPDATE devices SET ${updates.join(', ')} WHERE id = $${values.length}
       RETURNING ${DEVICE_COLUMNS}`,
      values
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dispositivo não encontrado.' })
    }
    res.json(rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Já existe um dispositivo com esse nome.' })
    }
    next(error)
  }
})

labRouter.delete('/devices/:id', async (req, res, next) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Dispositivo inválido.' })
  }

  try {
    const { rowCount } = await pool.query('DELETE FROM devices WHERE id = $1', [id])
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Dispositivo não encontrado.' })
    }
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

labRouter.post('/links', async (req, res, next) => {
  const a = Number(req.body?.a)
  const b = Number(req.body?.b)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) {
    return res.status(400).json({ error: 'Escolha dois dispositivos diferentes.' })
  }

  try {
    const { rows: found } = await pool.query(
      'SELECT id FROM devices WHERE id = ANY($1::int[])',
      [[a, b]]
    )
    if (found.length !== 2) {
      return res.status(404).json({ error: 'Dispositivo não encontrado.' })
    }

    const { rows: duplicate } = await pool.query(
      'SELECT id FROM links WHERE (a_id = $1 AND b_id = $2) OR (a_id = $2 AND b_id = $1)',
      [a, b]
    )
    if (duplicate.length > 0) {
      return res.status(409).json({ error: 'Esses dispositivos já estão conectados.' })
    }

    const { rows } = await pool.query(
      'INSERT INTO links (a_id, b_id) VALUES ($1, $2) RETURNING id, a_id, b_id',
      [a, b]
    )
    res.status(201).json(rows[0])
  } catch (error) {
    next(error)
  }
})

labRouter.delete('/links/:id', async (req, res, next) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Cabo inválido.' })
  }

  try {
    const { rowCount } = await pool.query('DELETE FROM links WHERE id = $1', [id])
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Cabo não encontrado.' })
    }
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

labRouter.post('/simulate/ping', async (req, res, next) => {
  const from = Number(req.body?.from)
  const to = Number(req.body?.to)
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return res.status(400).json({ error: 'Escolha dois computadores.' })
  }

  try {
    const { devices, links } = await loadLab()
    res.json(simulatePing(devices, links, from, to))
  } catch (error) {
    next(error)
  }
})
