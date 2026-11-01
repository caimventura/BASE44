import express from 'express'
import { pool } from './db.js'

const app = express()
const port = Number(process.env.PORT || 8000)

app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true, database: 'up' })
  } catch (error) {
    res.status(503).json({ ok: false, database: 'down', error: error.message })
  }
})

app.get('/api/items', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, title, created_at FROM items ORDER BY id ASC'
    )
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

app.post('/api/items', async (req, res, next) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  if (!title) {
    return res.status(400).json({ error: 'title is required' })
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO items (title) VALUES ($1) RETURNING id, title, created_at',
      [title]
    )
    res.status(201).json(rows[0])
  } catch (error) {
    next(error)
  }
})

app.delete('/api/items/:id', async (req, res, next) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'invalid id' })
  }

  try {
    const { rowCount } = await pool.query('DELETE FROM items WHERE id = $1', [id])
    if (rowCount === 0) {
      return res.status(404).json({ error: 'not found' })
    }
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'internal error' })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`api listening on ${port}`)
})
