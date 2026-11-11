import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { CheckIcon, ClipboardIcon, RestartIcon } from '../components/icons.jsx'
import { Badge, PageHeader, ProgressBar, Spinner, Toast } from '../components/ui.jsx'

export default function Assessments() {
  const [list, setList] = useState(null)
  const [active, setActive] = useState(null)
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)

  const load = () =>
    api.assessments().then((data) => setList(data.assessments)).catch((err) => setError(err.message))

  useEffect(() => {
    load()
  }, [])

  async function start(assessment) {
    setBusy(true)
    setError('')
    try {
      const data = await api.assessment(assessment.id)
      setActive(data.assessment)
      setAnswers(new Array(data.assessment.questions.length).fill(null))
      setResult(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (answers.some((value) => value === null)) {
      setError('Responda a todas as questões antes de submeter.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const data = await api.submitAssessment(active.id, answers)
      setResult(data)
      await load()
      setToast({ message: `Nota: ${data.score} / 20 valores.`, tone: data.score >= 10 ? 'ok' : 'warn' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (active) {
    const answered = answers.filter((value) => value !== null).length
    return (
      <div className="page">
        <PageHeader
          eyebrow="Avaliação"
          title={active.title}
          description="Responda a todas as questões. A nota é calculada no servidor (0–20 valores)."
          actions={
            <button type="button" className="btn" onClick={() => { setActive(null); setResult(null) }}>
              Voltar
            </button>
          }
        />

        <ProgressBar value={(answered / active.questions.length) * 100} label="Questões respondidas" />
        <p className="small muted">{answered} de {active.questions.length} questões respondidas</p>

        <div className="assessment">
          {active.questions.map((question, index) => {
            const detail = result?.details?.[index]
            return (
              <fieldset key={index} className="card assessment__question">
                <legend>{index + 1}. {question.question}</legend>
                {question.options.map((option, optionIndex) => {
                  const isChosen = answers[index] === optionIndex
                  const isCorrect = detail?.correctAnswer === optionIndex
                  const tone = result ? (isCorrect ? ' is-correct' : isChosen ? ' is-wrong' : '') : ''
                  return (
                    <label key={optionIndex} className={`quiz__option${isChosen ? ' is-chosen' : ''}${tone}`}>
                      <input
                        type="radio"
                        name={`question-${index}`}
                        checked={isChosen}
                        disabled={Boolean(result)}
                        onChange={() =>
                          setAnswers((previous) => {
                            const next = [...previous]
                            next[index] = optionIndex
                            return next
                          })
                        }
                      />
                      <span>{option}</span>
                    </label>
                  )
                })}
                {detail && (
                  <div className="quiz__explain">
                    <p className={`small ${detail.correct ? 'ok-text' : 'bad-text'}`}>
                      {detail.correct
                        ? 'Correto! Vamos perceber porquê.'
                        : `Ainda não. A resposta certa é: “${question.options[detail.correctAnswer]}”.`}
                    </p>
                    {detail.explanation && <p className="small">{detail.explanation}</p>}
                  </div>
                )}
              </fieldset>
            )
          })}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        {!result ? (
          <button type="button" className="btn btn--primary" onClick={submit} disabled={busy}>
            {busy ? 'A submeter…' : 'Submeter avaliação'}
          </button>
        ) : (
          <section className={`card resultcard resultcard--${result.score >= 10 ? 'ok' : 'bad'}`}>
            <div>
              <p className="eyebrow">Resultado</p>
              <h2>{result.score} / 20 valores</h2>
              <p className="muted">{result.correct} de {result.total} respostas corretas.</p>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => start(active)}>
                <RestartIcon width={15} height={15} /> Repetir
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setActive(null)}>
                Concluir
              </button>
            </div>
          </section>
        )}

        <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Sistema de avaliação"
        title="Avaliações"
        description="Testes por módulo, corrigidos no servidor. Pode repetir e fica registada a melhor nota."
      />

      {error && <p className="form-error" role="alert">{error}</p>}

      {!list ? (
        <Spinner label="A carregar avaliações…" />
      ) : (
        <ul className="projectgrid">
          {list.map((assessment) => (
            <li key={assessment.id} className="card projectcard">
              <div className="card__head">
                <span className="coursecard__icon"><ClipboardIcon width={18} height={18} /></span>
                <span className="tag">Nível {assessment.level ?? 1}</span>
                <span className="grow" />
                {assessment.best !== null && (
                  <Badge tone={assessment.best >= 10 ? 'ok' : 'warn'}>Melhor: {Number(assessment.best).toFixed(1)}/20</Badge>
                )}
              </div>
              <h3>{assessment.title}</h3>
              <p className="muted">{assessment.course}</p>
              <p className="small muted">{assessment.question_count} questões · 20 valores</p>
              <button type="button" className="btn btn--primary btn--tiny" onClick={() => start(assessment)} disabled={busy}>
                {busy ? 'A abrir…' : 'Começar avaliação'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="card noticecard">
        <CheckIcon width={20} height={20} />
        <div>
          <h3>Como é calculada a nota</h3>
          <p className="muted">
            Cada resposta certa vale o mesmo. A nota final é proporcional ao número de acertos,
            convertida para a escala de 0 a 20 valores. As respostas são validadas no servidor e
            nunca enviadas ao cliente antes da submissão.
          </p>
        </div>
      </section>
    </div>
  )
}
