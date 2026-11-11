import express from 'express'
import crypto from 'node:crypto'
import { pool } from './db.js'
import { createProject } from './projectStore.js'

const SESSION_COOKIE = 'nl_session'
const SESSION_DAYS = 7
const scrypt = crypto.scryptSync

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = scrypt(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored ?? '').split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const candidate = scrypt(String(password), salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected)
}

export function parseCookies(header = '') {
  const cookies = {}
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    const name = part.slice(0, index).trim()
    const raw = part.slice(index + 1).trim()
    try {
      cookies[name] = decodeURIComponent(raw)
    } catch {
      // Cookie malformado (ex.: "%E0%A4%A") não pode derrubar o pedido:
      // fica como texto simples e a sessão é simplesmente ignorada.
      cookies[name] = raw
    }
  }
  return cookies
}

const sessionCookie = (id) =>
  `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`

const clearedCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`

export async function attachUser(req, _res, next) {
  try {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
    if (!token) return next()
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, s.expires_at,
              p.level, p.xp, p.minutes_learning
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN student_profiles p ON p.user_id = u.id
       WHERE s.id = $1`,
      [token]
    )
    const row = rows[0]
    if (!row) return next()
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await pool.query('DELETE FROM sessions WHERE id = $1', [token])
      return next()
    }
    req.user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      level: row.level ?? 1,
      xp: row.xp ?? 0,
      minutesLearning: row.minutes_learning ?? 0,
    }
    next()
  } catch (error) {
    next(error)
  }
}

export const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Precisa de iniciar sessão.' })
  next()
}

export const requireTeacher = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Precisa de iniciar sessão.' })
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Apenas professores podem aceder a esta área.' })
  }
  next()
}

export const authRouter = express.Router()

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  level: user.level ?? 1,
  xp: user.xp ?? 0,
  minutesLearning: user.minutesLearning ?? 0,
})

authRouter.post('/register', async (req, res, next) => {
  const name = String(req.body?.name ?? '').trim()
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  // O registo público cria sempre estudantes. O perfil de professor é
  // atribuído pela instituição; aceitar `role` do corpo permitia que qualquer
  // cliente se tornasse professor e lesse as submissões de todos os alunos.
  const role = 'student'

  if (name.length < 2) return res.status(400).json({ error: 'Indique o seu nome (mínimo 2 caracteres).' })
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Endereço de e-mail inválido.' })
  if (password.length < 8) return res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 8 caracteres.' })

  try {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.length > 0) return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' })

    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashPassword(password), role]
    )
    const user = rows[0]
    await pool.query('INSERT INTO student_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id])
    await createProject({
      userId: user.id,
      name: 'O meu primeiro laboratório',
      description: 'Exemplo inicial: dois computadores ligados por um switch.',
      starter: {
        devices: [
          { name: 'PC0', type: 'pc', x: 30, y: 30, ip: '192.168.0.10', mask: '255.255.255.0' },
          { name: 'PC1', type: 'pc', x: 70, y: 30, ip: '192.168.0.11', mask: '255.255.255.0' },
          { name: 'SW0', type: 'switch', x: 50, y: 55 },
        ],
        links: [
          { a: 'PC0', b: 'SW0' },
          { a: 'PC1', b: 'SW0' },
        ],
      },
    })

    const token = crypto.randomUUID()
    await pool.query(
      `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`,
      [token, user.id]
    )
    res.setHeader('Set-Cookie', sessionCookie(token))
    res.status(201).json({ user: publicUser({ ...user, level: 1, xp: 0, minutesLearning: 0 }) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/login', async (req, res, next) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')

  try {
    const { rows } = await pool.query(
      `SELECT u.*, p.level, p.xp, p.minutes_learning
       FROM users u LEFT JOIN student_profiles p ON p.user_id = u.id
       WHERE u.email = $1`,
      [email]
    )
    const user = rows[0]
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'E-mail ou palavra-passe incorretos.' })
    }
    const token = crypto.randomUUID()
    await pool.query(
      `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`,
      [token, user.id]
    )
    res.setHeader('Set-Cookie', sessionCookie(token))
    res.json({ user: publicUser({ ...user, minutesLearning: user.minutes_learning }) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
    if (token) await pool.query('DELETE FROM sessions WHERE id = $1', [token])
    res.setHeader('Set-Cookie', clearedCookie)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

authRouter.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ user: null })
  res.json({ user: publicUser(req.user) })
})

authRouter.post('/forgot', async (req, res, next) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (rows.length === 0) {
      // Mensagem genérica para não revelar se o e-mail existe.
      return res.json({ ok: true, message: 'Se o e-mail existir, foi criado um pedido de recuperação.' })
    }
    const token = crypto.randomBytes(20).toString('hex')
    await pool.query(
      `INSERT INTO password_resets (token, user_id, expires_at)
       VALUES ($1, $2, now() + interval '1 hour')`,
      [token, rows[0].id]
    )
    // Não há servidor de e-mail neste ambiente: o token é devolvido para o
    // fluxo educativo continuar dentro da própria aplicação.
    res.json({
      ok: true,
      message: 'Pedido criado. Neste ambiente educativo o código é mostrado abaixo — use-o para definir a nova palavra-passe.',
      resetToken: token,
    })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/reset', async (req, res, next) => {
  const token = String(req.body?.token ?? '').trim()
  const password = String(req.body?.password ?? '')
  if (password.length < 8) return res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 8 caracteres.' })

  try {
    const { rows } = await pool.query(
      `SELECT user_id FROM password_resets
       WHERE token = $1 AND used = false AND expires_at > now()`,
      [token]
    )
    if (rows.length === 0) return res.status(400).json({ error: 'Código inválido ou expirado.' })
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      hashPassword(password),
      rows[0].user_id,
    ])
    await pool.query('UPDATE password_resets SET used = true WHERE token = $1', [token])
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [rows[0].user_id])
    res.json({ ok: true, message: 'Palavra-passe atualizada. Já pode iniciar sessão.' })
  } catch (error) {
    next(error)
  }
})

authRouter.patch('/profile', requireAuth, async (req, res, next) => {
  const name = String(req.body?.name ?? '').trim()
  const password = req.body?.password ? String(req.body.password) : null
  try {
    if (name.length >= 2) {
      await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, req.user.id])
    }
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 8 caracteres.' })
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        hashPassword(password),
        req.user.id,
      ])
    }
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, p.level, p.xp, p.minutes_learning
       FROM users u LEFT JOIN student_profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [req.user.id]
    )
    const row = rows[0]
    res.json({ user: publicUser({ ...row, minutesLearning: row.minutes_learning }) })
  } catch (error) {
    next(error)
  }
})
