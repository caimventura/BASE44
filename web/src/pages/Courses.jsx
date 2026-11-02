import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { Link } from '../lib/router.jsx'
import { BookIcon, ClipboardIcon } from '../components/icons.jsx'
import { Badge, PageHeader, ProgressBar, Spinner } from '../components/ui.jsx'

const STAGES = ['Iniciante', 'Básico', 'Intermédio', 'Avançado']

export default function Courses() {
  const [courses, setCourses] = useState(null)
  const [error, setError] = useState('')
  const [openAnyway, setOpenAnyway] = useState([])

  useEffect(() => {
    api.courses().then((data) => setCourses(data.courses)).catch((err) => setError(err.message))
  }, [])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Aprendizagem interativa"
        title="Cursos"
        description="Cinco módulos progressivos: começa do zero e só avanças quando os fundamentos estiverem aprendidos. Cada lição tem teoria, exemplo, teste com explicação e prática no simulador."
      />

      {error && <p className="form-error" role="alert">{error}</p>}

      {courses && courses.length > 0 && (() => {
        const totalLessons = courses.reduce((total, course) => total + course.lesson_count, 0)
        const doneLessons = courses.reduce((total, course) => total + course.completed_count, 0)
        const ratio = totalLessons ? doneLessons / totalLessons : 0
        const stageIndex = ratio >= 0.7 ? 3 : ratio >= 0.4 ? 2 : ratio >= 0.15 ? 1 : 0
        return (
          <section className="progression" aria-label="Progressão de aprendizagem">
            {STAGES.map((stage, index) => (
              <div key={stage} className={`progression__step${index === stageIndex ? ' is-current' : ''}${index < stageIndex ? ' is-done' : ''}`}>
                <span>{index + 1}</span>
                <small>{stage}</small>
              </div>
            ))}
          </section>
        )
      })()}

      {!courses ? (
        <Spinner label="A carregar cursos…" />
      ) : (
        <ul className="coursegrid">
          {courses.map((course, index) => {
            const percentage = course.lesson_count ? (course.completed_count / course.lesson_count) * 100 : 0
            const previous = index > 0 ? courses[index - 1] : null
            const previousRatio = previous && previous.lesson_count ? previous.completed_count / previous.lesson_count : 1
            const locked = Boolean(previous) && previousRatio < 0.5 && !openAnyway.includes(course.slug)
            return (
              <li key={course.id} className={`card coursecard${locked ? ' coursecard--locked' : ''}`}>
                <div className="coursecard__top">
                  <span className="coursecard__level">Módulo {course.level}</span>
                  <span className="coursecard__icon"><BookIcon width={22} height={22} /></span>
                </div>
                <h3>{course.title}</h3>
                <p className="muted">{course.description}</p>
                <ProgressBar value={percentage} label={`Progresso de ${course.title}`} />
                <p className="small muted">
                  {course.completed_count} de {course.lesson_count} lições concluídas
                </p>
                {locked ? (
                  <>
                    <p className="small muted">
                      Recomendado: conclui primeiro <strong>{previous.title}</strong> ({Math.round(previousRatio * 100)}% feito).
                    </p>
                    <button
                      type="button"
                      className="btn btn--tiny"
                      onClick={() => setOpenAnyway((previousList) => [...previousList, course.slug])}
                    >
                      Abrir mesmo assim
                    </button>
                  </>
                ) : (
                  <Link className="btn btn--primary btn--tiny" to={`/cursos/${course.slug}`}>
                    {percentage > 0 ? 'Continuar módulo' : 'Começar módulo'}
                  </Link>
                )}
                {percentage === 100 && <Badge tone="ok">Concluído</Badge>}
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
