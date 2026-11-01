import express from 'express'
import { pool } from './db.js'
import { labRouter } from './lab.js'

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

app.use('/api', labRouter)

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Erro interno no servidor.' })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`api listening on ${port}`)
})
