import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { Link } from '../lib/router.jsx'
import { CheckIcon, ChevronIcon, ClipboardIcon, ClockIcon } from '../components/icons.jsx'
import { Badge, PageHeader, Spinner, Toast } from '../components/ui.jsx'

function Block({ block }) {
  if (block.type === 'list') {
    return (
      <section className="lessonblock">
        {block.title && <h4>{block.title}</h4>}
        <ul className="list list--plain">
          {(block.items ?? []).map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </section>
    )
  }
  if (block.type === 'note') {
    return (
      <aside className="lessonblock lessonblock--note">
        {block.title && <h4>{block.title}</h4>}
        <p>{block.text}</p>
      </aside>
    )
  }
  if (block.type === 'code') {
    return (
      <section className="lessonblock">
        {block.title && <h4>{block.title}</h4>}
        <pre className="codeblock">{block.text}</pre>
      </section>
    )
  }
  return (
    <section className="lessonblock">
      {block.title && <h4>{block.title}</h4>}
      <p>{block.text}</p>
    </section>
  )
}

function Quiz({ lesson, onComplete }) {
  const questions = lesson.quiz ?? []
  const [answers, setAnswers] = useState([])
  const [checked, setChecked] = useState(false)
  if (questions.length === 0) return null

  const correct = questions.filter((question, index) => answers[index] === question.answer).length

  return (
    <section className="quiz">
      <h4>Teste rápido</h4>
      {questions.map((question, index) => (
        <fieldset key={index} className="quiz__question">
          <legend>{index + 1}. {question.question}</legend>
          {question.options.map((option, optionIndex) => (
            <label key={optionIndex} className={`quiz__option${checked && optionIndex === question.answer ? ' is-correct' : ''}${checked && answers[index] === optionIndex && optionIndex !== question.answer ? ' is-wrong' : ''}`}>
              <input
                type="radio"
                name={`q-${lesson.id}-${index}`}
                checked={answers[index] === optionIndex}
                onChange={() => setAnswers((previous) => {
                  const next = [...previous]
                  next[index] = optionIndex
                  return next
                })}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <div className="row">
        <button type="button" className="btn btn--tiny" onClick={() => setChecked(true)} disabled={answers.filter((value) => value !== undefined).length !== questions.length}>
          Verificar respostas
        </button>
        {checked && (
          <Badge tone={correct === questions.length ? 'ok' : 'warn'}>
            {correct} de {questions.length} corretas
          </Badge>
        )}
        {!lesson.completed && (
          <button type="button" className="btn btn--primary btn--tiny" onClick={onComplete}>
            Marcar lição como concluída
          </button>
        )}
        {lesson.completed && <Badge tone="ok">Lição concluída</Badge>}
      </div>
    </section>
  )
}

export default function CourseDetail({ slug }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [openLesson, setOpenLesson] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    api
      .course(slug)
      .then((result) => {
        setData(result)
        const first = result.lessons.find((lesson) => !lesson.completed) ?? result.lessons[0]
        setOpenLesson(first?.id ?? null)
      })
      .catch((err) => setError(err.message))
  }, [slug])

  async function complete(lesson) {
    try {
      await api.completeLesson(lesson.id)
      setData((previous) => ({
        ...previous,
        lessons: previous.lessons.map((entry) =>
          entry.id === lesson.id ? { ...entry, completed: true } : entry
        ),
      }))
      setToast({ message: 'Lição concluída. Progresso atualizado.', tone: 'ok' })
    } catch (err) {
      setError(err.message)
    }
  }

  if (!data) {
    return <div className="page">{error ? <p className="form-error" role="alert">{error}</p> : <Spinner label="A carregar curso…" />}</div>
  }

  const { course, lessons, assessments } = data
  const done = lessons.filter((lesson) => lesson.completed).length

  return (
    <div className="page">
      <PageHeader
        eyebrow={`Nível ${course.level}`}
        title={course.title}
        description={course.description}
        actions={<Link className="btn" to="/cursos">Voltar aos cursos</Link>}
      />

      <div className="coursehead">
        <Badge tone="ok">{done}/{lessons.length} lições</Badge>
        <p className="muted">
          {lessons.reduce((total, lesson) => total + lesson.minutes, 0)} minutos de estudo
        </p>
      </div>

      <div className="lessons">
        {lessons.map((lesson, index) => {
          const open = openLesson === lesson.id
          return (
            <article key={lesson.id} className={`lesson${open ? ' lesson--open' : ''}`}>
              <button
                type="button"
                className="lesson__head"
                aria-expanded={open}
                onClick={() => setOpenLesson(open ? null : lesson.id)}
              >
                <span className="lesson__number">{String(index + 1).padStart(2, '0')}</span>
                <span className="lesson__meta">
                  <strong>{lesson.title}</strong>
                  <small>{lesson.summary}</small>
                </span>
                <span className="lesson__time"><ClockIcon width={14} height={14} /> {lesson.minutes} min</span>
                {lesson.completed && <span className="lesson__done"><CheckIcon width={15} height={15} /></span>}
                <span className={`lesson__chevron${open ? ' is-open' : ''}`}><ChevronIcon width={16} height={16} /></span>
              </button>
              {open && (
                <div className="lesson__body">
                  {(lesson.content ?? []).map((block, blockIndex) => (
                    <Block key={blockIndex} block={block} />
                  ))}
                  <Quiz lesson={lesson} onComplete={() => complete(lesson)} />
                </div>
              )}
            </article>
          )
        })}
      </div>

      {assessments.length > 0 && (
        <section className="card noticecard">
          <ClipboardIcon width={20} height={20} />
          <div>
            <h3>Avaliação deste módulo</h3>
            {assessments.map((assessment) => (
              <p key={assessment.id} className="muted">{assessment.title}</p>
            ))}
            <Link className="btn btn--tiny btn--primary" to="/avaliacoes">Fazer avaliação</Link>
          </div>
        </section>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  )
}
