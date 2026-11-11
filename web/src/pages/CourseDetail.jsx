import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { Link, useRouter } from '../lib/router.jsx'
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
  if (block.type === 'steps') {
    return (
      <section className="lessonblock">
        {block.title && <h4>{block.title}</h4>}
        <ol className="steps">
          {(block.items ?? []).map((item, index) => <li key={index}>{item}</li>)}
        </ol>
      </section>
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
  const [showExample, setShowExample] = useState(false)
  if (questions.length === 0) return null

  const correct = questions.filter((question, index) => answers[index] === question.answer).length
  const allCorrect = checked && correct === questions.length
  const wrong = questions.filter((question, index) => checked && answers[index] !== question.answer)

  function retry() {
    setAnswers([])
    setChecked(false)
    setShowExample(false)
  }

  return (
    <section className="quiz">
      <h4>Teste rápido</h4>
      {questions.map((question, index) => {
        const chosen = answers[index]
        const isWrong = checked && chosen !== question.answer
        return (
          <fieldset key={index} className="quiz__question">
            <legend>{index + 1}. {question.question}</legend>
            {question.options.map((option, optionIndex) => (
              <label key={optionIndex} className={`quiz__option${checked && optionIndex === question.answer ? ' is-correct' : ''}${checked && chosen === optionIndex && optionIndex !== question.answer ? ' is-wrong' : ''}`}>
                <input
                  type="radio"
                  name={`q-${lesson.id}-${index}`}
                  checked={chosen === optionIndex}
                  disabled={checked}
                  onChange={() => setAnswers((previous) => {
                    const next = [...previous]
                    next[index] = optionIndex
                    return next
                  })}
                />
                <span>{option}</span>
              </label>
            ))}
            {isWrong && (
              <div className="quiz__explain">
                <p className="bad-text small">A resposta correta é: “{question.options[question.answer]}”.</p>
                <p className="small">{question.explanation || 'Revê a explicação da lição e tenta outra vez.'}</p>
              </div>
            )}
            {checked && !isWrong && question.explanation && (
              <p className="small ok-text">{question.explanation}</p>
            )}
          </fieldset>
        )
      })}
      <div className="row row--wrap">
        <button
          type="button"
          className="btn btn--tiny"
          onClick={() => setChecked(true)}
          disabled={checked || answers.filter((value) => value !== undefined).length !== questions.length}
        >
          Verificar respostas
        </button>
        {checked && (
          <Badge tone={allCorrect ? 'ok' : 'warn'}>
            {correct} de {questions.length} corretas
          </Badge>
        )}
        {checked && wrong.length > 0 && (
          <>
            <button type="button" className="btn btn--tiny" onClick={() => setChecked(true)}>
              Explicar novamente
            </button>
            <button type="button" className="btn btn--tiny" onClick={() => setShowExample((value) => !value)}>
              {showExample ? 'Ocultar exemplo' : 'Mostrar exemplo'}
            </button>
            <button type="button" className="btn btn--tiny" onClick={retry}>
              Tentar novamente
            </button>
          </>
        )}
        {showExample && wrong.length > 0 && (
          <p className="small muted quiz__example">
            Exemplo: repara que a pergunta fala de “{wrong[0].options[wrong[0].answer]}”. Sempre que vires
            este conceito, aplica o raciocínio da lição antes de responder.
          </p>
        )}
        {allCorrect && !lesson.completed && (
          <button type="button" className="btn btn--primary btn--tiny" onClick={onComplete}>
            Marcar lição como concluída
          </button>
        )}
        {lesson.completed && <Badge tone="ok">Lição concluída</Badge>}
      </div>
    </section>
  )
}

function PracticeCard({ lesson, onStart, busy, error }) {
  const task = lesson.practice
  if (!task?.title) return null
  return (
    <section className="practice">
      <div className="practice__head">
        <span className="practice__icon">🔬</span>
        <div>
          <p className="eyebrow">Aprender na prática</p>
          <h4>{task.title}</h4>
        </div>
      </div>
      <p className="muted">{task.goal}</p>
      {Array.isArray(task.steps) && task.steps.length > 0 && (
        <ol className="steps">
          {task.steps.map((step, index) => <li key={index}>{step}</li>)}
        </ol>
      )}
      <button type="button" className="btn btn--primary btn--tiny" onClick={onStart} disabled={busy}>
        {busy ? 'A abrir…' : 'Praticar no simulador'}
      </button>
      {error && <p className="form-error small" role="alert">{error}</p>}
    </section>
  )
}

export default function CourseDetail({ slug }) {
  const { navigate } = useRouter()
  const [data, setData] = useState(null)
  const [practiceBusy, setPracticeBusy] = useState(false)
  const [practiceError, setPracticeError] = useState('')
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

  async function startPractice(lesson) {
    setPracticeBusy(true)
    setPracticeError('')
    try {
      const result = await api.startPractice(lesson.id)
      navigate(`/simulador/${result.project.id}`)
    } catch (err) {
      setPracticeError(err.message)
    } finally {
      setPracticeBusy(false)
    }
  }

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
                  <PracticeCard
                    lesson={lesson}
                    busy={practiceBusy}
                    error={practiceError}
                    onStart={() => startPractice(lesson)}
                  />
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
