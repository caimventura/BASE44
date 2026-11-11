import { pool } from './db.js'
import { hashPassword } from './auth.js'
import { COURSES, LABS, MODULE_ASSESSMENTS } from './content.js'
import { createProject } from './projectStore.js'

/**
 * A API pode (re)arrancar enquanto o serviço `migrate` ainda está a criar as
 * tabelas, por isso espera pelo schema antes de semear.
 */
async function waitForSchema(timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      const { rows } = await pool.query(
        "SELECT to_regclass('public.courses') AS courses, to_regclass('public.progress_records') AS progress"
      )
      if (rows[0].courses && rows[0].progress) return true
    } catch {
      // base de dados ainda a arrancar
    }
    if (Date.now() >= deadline) return false
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
}

/** Semeia/atualiza conteúdo educativo e contas de demonstração. Idempotente. */
export async function seedDatabase() {
  if (!(await waitForSchema())) {
    throw new Error('schema ainda não está criado (serviço migrate)')
  }
  // Cursos que saíram do currículo deixam de aparecer (lições em cascata).
  await pool.query('DELETE FROM courses WHERE NOT (slug = ANY($1::text[]))', [
    COURSES.map((course) => course.slug),
  ])

  for (const course of COURSES) {
    const { rows } = await pool.query(
      `INSERT INTO courses (slug, title, level, description, icon)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title, level = EXCLUDED.level,
         description = EXCLUDED.description, icon = EXCLUDED.icon
       RETURNING id`,
      [course.slug, course.title, course.level, course.description, course.icon]
    )
    const courseId = rows[0].id
    for (const [index, lesson] of course.lessons.entries()) {
      await pool.query(
        `INSERT INTO lessons (course_id, slug, title, minutes, position, summary, content, quiz, practice, level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (course_id, slug) DO UPDATE SET
           title = EXCLUDED.title, minutes = EXCLUDED.minutes, position = EXCLUDED.position,
           summary = EXCLUDED.summary, content = EXCLUDED.content, quiz = EXCLUDED.quiz,
           practice = EXCLUDED.practice, level = EXCLUDED.level`,
        [
          courseId,
          lesson.slug,
          lesson.title,
          lesson.minutes ?? 10,
          index + 1,
          lesson.summary ?? '',
          JSON.stringify(lesson.content ?? []),
          JSON.stringify(lesson.quiz ?? []),
          JSON.stringify(lesson.practice ?? {}),
          course.level ?? 1,
        ]
      )
    }
  }

  for (const lab of LABS) {
    await pool.query(
      `INSERT INTO labs (slug, title, level, objective, brief, instructions, starter, checks, points, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title, level = EXCLUDED.level, objective = EXCLUDED.objective,
         brief = EXCLUDED.brief, instructions = EXCLUDED.instructions,
         starter = EXCLUDED.starter, checks = EXCLUDED.checks, points = EXCLUDED.points`,
      [
        lab.slug,
        lab.title,
        lab.level,
        lab.objective,
        lab.brief,
        JSON.stringify(lab.instructions),
        JSON.stringify(lab.starter),
        JSON.stringify(lab.checks),
        lab.points ?? 20,
      ]
    )
  }

  await pool.query('DELETE FROM assessments WHERE NOT (slug = ANY($1::text[]))', [
    MODULE_ASSESSMENTS.map((assessment) => assessment.slug),
  ])

  for (const assessment of MODULE_ASSESSMENTS) {
    const { rows: courses } = await pool.query('SELECT id FROM courses WHERE slug = $1', [assessment.course])
    await pool.query(
      `INSERT INTO assessments (course_id, slug, title, questions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title, questions = EXCLUDED.questions, course_id = EXCLUDED.course_id`,
      [
        courses[0]?.id ?? null,
        assessment.slug,
        assessment.title,
        JSON.stringify(assessment.questions),
      ]
    )
  }

  // Contas de demonstração (documentadas no AGENTS.md/README).
  // A conta de professor de demonstração foi retirada: o perfil de professor
  // passa a ser atribuído pela instituição, não por uma conta partilhada.
  const demo = [
    { name: 'Ana Estudante', email: 'aluno@netlab.pt', role: 'student' },
  ]
  await pool.query("DELETE FROM users WHERE email = 'professor@netlab.pt' AND role = 'teacher'")
  for (const account of demo) {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [account.email])
    if (existing.rows.length > 0) continue
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [account.name, account.email, hashPassword('netlab123'), account.role]
    )
    await pool.query('INSERT INTO student_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [rows[0].id])
    if (account.role === 'student') {
      await createProject({
        userId: rows[0].id,
        name: 'Rede do escritório',
        description: 'Duas redes ligadas por um router, com switches.',
        starter: {
          devices: [
            { name: 'SW0', type: 'switch', x: 24, y: 30 },
            { name: 'SW1', type: 'switch', x: 76, y: 30 },
            { name: 'R0', type: 'router', x: 50, y: 52, ip: '192.168.10.1', mask: '255.255.255.0' },
            { name: 'PC0', type: 'pc', x: 16, y: 68, ip: '192.168.10.10', mask: '255.255.255.0', gateway: '192.168.10.1' },
            { name: 'PC1', type: 'pc', x: 32, y: 68, ip: '192.168.10.11', mask: '255.255.255.0', gateway: '192.168.10.1' },
            { name: 'PC2', type: 'pc', x: 66, y: 68, ip: '192.168.20.10', mask: '255.255.255.0' },
            { name: 'SRV0', type: 'server', x: 84, y: 68, ip: '192.168.20.20', mask: '255.255.255.0' },
          ],
          links: [
            { a: 'PC0', b: 'SW0' },
            { a: 'PC1', b: 'SW0' },
            { a: 'SW0', b: 'R0' },
            { a: 'R0', b: 'SW1' },
            { a: 'PC2', b: 'SW1' },
            { a: 'SRV0', b: 'SW1' },
          ],
        },
      })
    }
  }
}
