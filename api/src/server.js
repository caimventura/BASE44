import express from 'express'
import { pool } from './db.js'
import { attachUser, authRouter } from './auth.js'
import { projectsRouter } from './projects.js'
import { learningRouter } from './learning.js'
import { seedDatabase } from './seed.js'

const app = express()
const port = Number(process.env.PORT || 8000)

app.use(express.json({ limit: '1mb' }))
app.use(attachUser)

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true, database: 'up' })
  } catch (error) {
    res.status(503).json({ ok: false, database: 'down', error: error.message })
  }
})

app.use('/api/auth', authRouter)
app.use('/api', projectsRouter)
app.use('/api', learningRouter)

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Recurso não encontrado.' })
})

app.use((error, _req, res, _next) => {
  console.error(error)
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corpo do pedido inválido.' })
  }
  res.status(500).json({ error: 'Erro interno no servidor.' })
})

app.listen(port, '0.0.0.0', async () => {
  console.log(`api listening on ${port}`)
  try {
    await seedDatabase()
    console.log('seed: conteúdo educativo e contas de demonstração prontos')
  } catch (error) {
    console.error('seed failed', error)
  }
})
