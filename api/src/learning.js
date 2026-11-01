import express from 'express'
import { pool } from './db.js'
import { requireAuth, requireTeacher } from './auth.js'
import { logEvent } from './projectStore.js'

export const learningRouter = express.Router()

const levelFromXp = (xp) => Math.min(10, 1 + Math.floor(xp / 400))

learningRouter.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const [projects, labsDone, lessonsDone, assessmentsDone, totals, profile, recommended, submissions] =
      await Promise.all([
        pool.query('SELECT count(*)::int AS count FROM projects WHERE user_id = $1', [req.user.id]),
        pool.query(
          "SELECT count(*)::int AS count FROM progress_records WHERE user_id = $1 AND kind = 'lab' AND status = 'completed'",
          [req.user.id]
        ),
        pool.query(
          "SELECT count(*)::int AS count FROM progress_records WHERE user_id = $1 AND kind = 'lesson'",
          [req.user.id]
        ),
        pool.query(
          "SELECT count(*)::int AS count, COALESCE(avg(score), 0)::float AS avg FROM progress_records WHERE user_id = $1 AND kind = 'assessment'",
          [req.user.id]
        ),
        Promise.all([
          pool.query('SELECT count(*)::int AS count FROM lessons'),
          pool.query('SELECT count(*)::int AS count FROM labs WHERE active = true'),
          pool.query('SELECT count(*)::int AS count FROM assessments'),
        ]),
        pool.query('SELECT level, xp, minutes_learning FROM student_profiles WHERE user_id = $1', [req.user.id]),
        pool.query(
          `SELECT l.id, l.slug, l.title, l.level, l.objective, l.points,
                  pr.score, pr.status
           FROM labs l
           LEFT JOIN progress_records pr
             ON pr.ref_id = l.id AND pr.kind = 'lab' AND pr.user_id = $1
           WHERE l.active = true ORDER BY l.level, l.id LIMIT 10`,
          [req.user.id]
        ),
        pool.query(
          `SELECT ls.score, ls.max_score, ls.created_at, l.title
           FROM lab_submissions ls JOIN labs l ON l.id = ls.lab_id
           WHERE ls.user_id = $1 ORDER BY ls.id DESC LIMIT 5`,
          [req.user.id]
        ),
      ])

    const totalActivities =
      totals[0].rows[0].count + totals[1].rows[0].count + totals[2].rows[0].count
    const done = lessonsDone.rows[0].count + labsDone.rows[0].count + assessmentsDone.rows[0].count
    const progress = totalActivities > 0 ? Math.round((done / totalActivities) * 100) : 0
    const profileRow = profile.rows[0] ?? { level: 1, xp: 0, minutes_learning: 0 }

    res.json({
      stats: {
        projects: projects.rows[0].count,
        exercisesDone: labsDone.rows[0].count,
        progress,
        minutesLearning: profileRow.minutes_learning,
        level: levelFromXp(profileRow.xp ?? 0),
        xp: profileRow.xp ?? 0,
        lessonsDone: lessonsDone.rows[0].count,
        assessmentsDone: assessmentsDone.rows[0].count,
        averageScore: Math.round((assessmentsDone.rows[0].avg ?? 0) * 10) / 10,
      },
      recommended: recommended.rows,
      submissions: submissions.rows,
    })
  } catch (error) {
    next(error)
  }
})

learningRouter.get('/courses', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              (SELECT count(*)::int FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
              (SELECT count(*)::int FROM lessons l
                 JOIN progress_records pr ON pr.ref_id = l.id AND pr.kind = 'lesson' AND pr.user_id = $1
                WHERE l.course_id = c.id) AS completed_count
       FROM courses c ORDER BY c.level`,
      [req.user.id]
    )
    res.json({ courses: rows })
  } catch (error) {
    next(error)
  }
})

learningRouter.get('/courses/:slug', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM courses WHERE slug = $1', [req.params.slug])
    const course = rows[0]
    if (!course) return res.status(404).json({ error: 'Curso não encontrado.' })
    const lessons = await pool.query(
      `SELECT l.id, l.slug, l.title, l.minutes, l.position, l.summary, l.content, l.quiz,
              (pr.id IS NOT NULL) AS completed
       FROM lessons l
       LEFT JOIN progress_records pr ON pr.ref_id = l.id AND pr.kind = 'lesson' AND pr.user_id = $1
       WHERE l.course_id = $2 ORDER BY l.position`,
      [req.user.id, course.id]
    )
    const assessments = await pool.query(
      'SELECT id, slug, title FROM assessments WHERE course_id = $1 ORDER BY id',
      [course.id]
    )
    res.json({ course, lessons: lessons.rows, assessments: assessments.rows })
  } catch (error) {
    next(error)
  }
})

learningRouter.post('/lessons/:id/complete', requireAuth, async (req, res, next) => {
  const id = Number(req.params.id)
  try {
    const { rows } = await pool.query('SELECT * FROM lessons WHERE id = $1', [id])
    if (rows.length === 0) return res.status(404).json({ error: 'Lição não encontrada.' })
    const existing = await pool.query(
      "SELECT id FROM progress_records WHERE user_id = $1 AND kind = 'lesson' AND ref_id = $2",
      [req.user.id, id]
    )
    await pool.query(
      `INSERT INTO progress_records (user_id, kind, ref_id, status, updated_at)
       VALUES ($1, 'lesson', $2, 'completed', now())
       ON CONFLICT (user_id, kind, ref_id) DO UPDATE SET updated_at = now()`,
      [req.user.id, id]
    )
    if (existing.rows.length === 0) {
      await pool.query(
        `UPDATE student_profiles
         SET xp = xp + $1, minutes_learning = minutes_learning + $2,
             level = LEAST(10, 1 + ((xp + $1) / 400))
         WHERE user_id = $3`,
        [rows[0].minutes * 2, rows[0].minutes, req.user.id]
      )
    }
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

learningRouter.get('/labs', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.id, l.slug, l.title, l.level, l.objective, l.brief, l.instructions, l.points, l.starter,
              pr.score, pr.status,
              (SELECT max(score) FROM lab_submissions s WHERE s.lab_id = l.id AND s.user_id = $1) AS best
       FROM labs l
       LEFT JOIN progress_records pr ON pr.ref_id = l.id AND pr.kind = 'lab' AND pr.user_id = $1
       WHERE l.active = true ORDER BY l.level, l.id`,
      [req.user.id]
    )
    res.json({ labs: rows })
  } catch (error) {
    next(error)
  }
})

learningRouter.get('/labs/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, (SELECT max(score) FROM lab_submissions s WHERE s.lab_id = l.id AND s.user_id = $2) AS best
       FROM labs l WHERE l.id = $1 AND l.active = true`,
      [Number(req.params.id), req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Laboratório não encontrado.' })
    res.json({ lab: rows[0] })
  } catch (error) {
    next(error)
  }
})

learningRouter.get('/assessments', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.slug, a.title, c.title AS course, c.level,
              jsonb_array_length(a.questions) AS question_count,
              (SELECT max(score) FROM assessment_attempts t WHERE t.assessment_id = a.id AND t.user_id = $1) AS best
       FROM assessments a LEFT JOIN courses c ON c.id = a.course_id ORDER BY c.level, a.id`,
      [req.user.id]
    )
    res.json({ assessments: rows })
  } catch (error) {
    next(error)
  }
})

learningRouter.get('/assessments/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, slug, title, questions FROM assessments WHERE id = $1',
      [Number(req.params.id)]
    )
    const assessment = rows[0]
    if (!assessment) return res.status(404).json({ error: 'Avaliação não encontrada.' })
    // As respostas nunca são enviadas ao cliente antes da submissão.
    res.json({
      assessment: {
        id: assessment.id,
        slug: assessment.slug,
        title: assessment.title,
        questions: assessment.questions.map((question) => ({
          question: question.question,
          options: question.options,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
})

learningRouter.post('/assessments/:id/submit', requireAuth, async (req, res, next) => {
  const id = Number(req.params.id)
  try {
    const { rows } = await pool.query('SELECT * FROM assessments WHERE id = $1', [id])
    const assessment = rows[0]
    if (!assessment) return res.status(404).json({ error: 'Avaliação não encontrada.' })
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : []
    if (answers.length !== assessment.questions.length) {
      return res.status(400).json({ error: 'Responda a todas as questões antes de submeter.' })
    }
    const details = assessment.questions.map((question, index) => ({
      question: question.question,
      correct: Number(answers[index]) === question.answer,
      correctAnswer: question.answer,
      chosen: Number(answers[index]),
    }))
    const correct = details.filter((detail) => detail.correct).length
    const score = Math.round((correct / assessment.questions.length) * 20 * 10) / 10
    await pool.query(
      'INSERT INTO assessment_attempts (assessment_id, user_id, score, max_score, answers) VALUES ($1, $2, $3, 20, $4)',
      [id, req.user.id, score, JSON.stringify(details)]
    )
    await pool.query(
      `INSERT INTO progress_records (user_id, kind, ref_id, score, status, updated_at)
       VALUES ($1, 'assessment', $2, $3, 'completed', now())
       ON CONFLICT (user_id, kind, ref_id)
       DO UPDATE SET score = GREATEST(progress_records.score, EXCLUDED.score), updated_at = now()`,
      [req.user.id, id, score]
    )
    const xp = Math.round(score * 10)
    await pool.query(
      `UPDATE student_profiles SET xp = xp + $1, minutes_learning = minutes_learning + 10,
         level = LEAST(10, 1 + ((xp + $1) / 400)) WHERE user_id = $2`,
      [xp, req.user.id]
    )
    res.json({ score, maxScore: 20, correct, total: assessment.questions.length, details })
  } catch (error) {
    next(error)
  }
})

// ---- área do professor -----------------------------------------------------

learningRouter.get('/teacher/students', requireTeacher, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.created_at,
              COALESCE(p.xp, 0) AS xp,
              COALESCE(p.minutes_learning, 0) AS minutes_learning,
              (SELECT count(*)::int FROM projects pr WHERE pr.user_id = u.id) AS projects,
              (SELECT count(*)::int FROM progress_records r WHERE r.user_id = u.id AND r.kind = 'lab') AS labs_done,
              (SELECT COALESCE(avg(score), 0)::float FROM lab_submissions s WHERE s.user_id = u.id) AS avg_score
       FROM users u LEFT JOIN student_profiles p ON p.user_id = u.id
       WHERE u.role = 'student' ORDER BY u.name`
    )
    res.json({
      students: rows.map((row) => ({
        ...row,
        level: levelFromXp(row.xp),
        avgScore: Math.round(row.avg_score * 10) / 10,
      })),
    })
  } catch (error) {
    next(error)
  }
})

learningRouter.get('/teacher/submissions', requireTeacher, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.score, s.max_score, s.created_at, s.details,
              l.title AS lab_title, u.name AS student_name, p.name AS project_name
       FROM lab_submissions s
       JOIN labs l ON l.id = s.lab_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN projects p ON p.id = s.project_id
       ORDER BY s.id DESC LIMIT 50`
    )
    res.json({ submissions: rows })
  } catch (error) {
    next(error)
  }
})

learningRouter.post('/teacher/labs', requireTeacher, async (req, res, next) => {
  const title = String(req.body?.title ?? '').trim()
  const objective = String(req.body?.objective ?? '').trim()
  const brief = String(req.body?.brief ?? '').trim()
  const level = Number(req.body?.level ?? 1)
  const points = Number(req.body?.points ?? 20)
  const instructions = Array.isArray(req.body?.instructions) ? req.body.instructions.filter(Boolean) : []
  const starter = req.body?.starter ?? { devices: [], links: [] }

  if (title.length < 3) return res.status(400).json({ error: 'Indique o título do exercício.' })
  if (objective.length < 5) return res.status(400).json({ error: 'Indique o objetivo do exercício.' })
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    return res.status(400).json({ error: 'Nível inválido (1–5).' })
  }
  if (!Array.isArray(starter.devices)) {
    return res.status(400).json({ error: 'A topologia inicial é inválida.' })
  }

  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  try {
    const { rows } = await pool.query(
      `INSERT INTO labs (slug, title, level, objective, brief, instructions, starter, checks, points, active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title, level = EXCLUDED.level, objective = EXCLUDED.objective,
         brief = EXCLUDED.brief, instructions = EXCLUDED.instructions, starter = EXCLUDED.starter,
         checks = EXCLUDED.checks, points = EXCLUDED.points, active = true
       RETURNING *`,
      [
        `${slug}-${Date.now().toString(36)}`,
        title,
        level,
        objective,
        brief,
        JSON.stringify(instructions),
        JSON.stringify(starter),
        JSON.stringify(
          Array.isArray(req.body?.checks) ? req.body.checks : [{ type: 'allConnected', label: 'Tudo ligado', weight: 1 }]
        ),
        Math.min(Math.max(points, 1), 20),
        req.user.id,
      ]
    )
    await logEvent({
      userId: req.user.id,
      kind: 'teacher',
      message: `Exercício "${title}" publicado.`,
    })
    res.status(201).json({ lab: rows[0] })
  } catch (error) {
    next(error)
  }
})

learningRouter.delete('/teacher/labs/:id', requireTeacher, async (req, res, next) => {
  try {
    await pool.query('UPDATE labs SET active = false WHERE id = $1', [Number(req.params.id)])
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})
