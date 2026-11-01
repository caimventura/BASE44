import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { Link } from '../lib/router.jsx'
import { BookIcon, ClipboardIcon } from '../components/icons.jsx'
import { PageHeader, ProgressBar, Spinner } from '../components/ui.jsx'

export default function Courses() {
  const [courses, setCourses] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.courses().then((data) => setCourses(data.courses)).catch((err) => setError(err.message))
  }, [])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Aprendizagem interativa"
        title="Cursos"
        description="Cinco níveis, do fundamento à administração. Cada lição tem teoria, exemplos e um teste rápido."
      />

      {error && <p className="form-error" role="alert">{error}</p>}

      {!courses ? (
        <Spinner label="A carregar cursos…" />
      ) : (
        <ul className="coursegrid">
          {courses.map((course) => {
            const percentage = course.lesson_count ? (course.completed_count / course.lesson_count) * 100 : 0
            return (
              <li key={course.id} className="card coursecard">
                <div className="coursecard__top">
                  <span className="coursecard__level">Nível {course.level}</span>
                  <span className="coursecard__icon"><BookIcon width={22} height={22} /></span>
                </div>
                <h3>{course.title}</h3>
                <p className="muted">{course.description}</p>
                <ProgressBar value={percentage} label={`Progresso de ${course.title}`} />
                <p className="small muted">
                  {course.completed_count} de {course.lesson_count} lições concluídas
                </p>
                <Link className="btn btn--primary btn--tiny" to={`/cursos/${course.slug}`}>
                  Abrir curso
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <section className="card noticecard">
        <ClipboardIcon width={20} height={20} />
        <div>
          <h3>Avaliações por módulo</h3>
          <p className="muted">
            Cada módulo tem um teste de avaliação com nota de 0 a 20. Pode repetir as vezes que
            precisar — fica registada a melhor nota.
          </p>
          <Link className="btn btn--tiny" to="/avaliacoes">Ir para avaliações</Link>
        </div>
      </section>
    </div>
  )
}
