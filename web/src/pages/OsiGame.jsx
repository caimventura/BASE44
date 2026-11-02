import { useEffect, useMemo, useState } from 'react'
import { LEVELS, OSI_LAYERS, explanationFor, layerByNumber, shuffle } from '../lib/osi.js'
import { Badge, PageHeader, ProgressBar } from '../components/ui.jsx'
import { CheckIcon, ClockIcon, LayersIcon, RestartIcon, StarIcon } from '../components/icons.jsx'

function TimerToggle({ on, setOn, seconds }) {
  const label = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <div className="osi__timer">
      <button type="button" className={`chip${on ? ' is-active' : ''}`} onClick={() => setOn(!on)} aria-pressed={on}>
        <ClockIcon width={14} height={14} /> {on ? `Cronómetro ${label}` : 'Cronómetro'}
      </button>
    </div>
  )
}

function MatchLevel({ level, attempt, onSolved }) {
  const items = useMemo(() => shuffle(level.items, attempt + level.slots.length), [level, attempt])
  const [placed, setPlaced] = useState({})
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [errorFlash, setErrorFlash] = useState(null)

  useEffect(() => {
    setPlaced({})
    setSelected(null)
    setFeedback(null)
    setScore(0)
    setMistakes(0)
    setErrorFlash(null)
  }, [attempt, level])

  const usedItems = new Set(Object.values(placed).map((item) => item.id))
  const remaining = items.filter((item) => !usedItems.has(item.id))
  const solved = Object.keys(placed).length === level.slots.length

  useEffect(() => {
    if (solved) onSolved?.(score, mistakes)
  }, [solved]) // eslint-disable-line react-hooks/exhaustive-deps

  function place(slot, item) {
    if (!item || placed[slot.id]) return
    const correct = item.belongsTo === slot.number
    if (correct) {
      const layer = layerByNumber(slot.number)
      setPlaced((previous) => ({ ...previous, [slot.id]: item }))
      setScore((value) => value + 10)
      setFeedback({ tone: 'ok', text: `Correto! ${explanationFor(item, level.slots)}`, layer })
      setErrorFlash(null)
    } else {
      const owner = layerByNumber(item.belongsTo)
      setMistakes((value) => value + 1)
      setFeedback({
        tone: 'bad',
        text: `${item.label} não pertence à camada ${slot.number}. Esta posição é da camada ${slot.number} — ${layerByNumber(slot.number).name}, cuja função é: ${layerByNumber(slot.number).fn}\n\nEste item pertence à camada ${owner.number} — ${owner.name}.`,
      })
      setErrorFlash(slot.id)
      window.setTimeout(() => setErrorFlash(null), 600)
    }
    setSelected(null)
  }

  const slotsView = [...level.slots].sort((a, b) => b.number - a.number)

  return (
    <div className="osi__board">
      <div className="osi__stats">
        <Badge tone="ok"><StarIcon width={13} height={13} /> {score} pontos</Badge>
        <Badge tone={mistakes === 0 ? 'default' : 'warn'}>Tentativas falhadas: {mistakes}</Badge>
        <Badge tone={solved ? 'ok' : 'default'}>{Object.keys(placed).length}/{level.slots.length} colocados</Badge>
      </div>

      <ProgressBar value={(Object.keys(placed).length / level.slots.length) * 100} label="Progresso do nível" />

      <div className="osi__layout">
        <div className="osi__tower" aria-label="Torre das camadas OSI">
          <span className="osi__cap">TOPO</span>
          {slotsView.map((slot) => {
            const item = placed[slot.id]
            return (
              <div
                key={slot.id}
                className={`osi__slot${item ? ' is-filled' : ''}${errorFlash === slot.id ? ' is-error' : ''}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  const id = event.dataTransfer.getData('text/plain')
                  place(slot, items.find((entry) => entry.id === id))
                }}
                onClick={() => selected && place(slot, items.find((entry) => entry.id === selected))}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    if (selected) place(slot, items.find((entry) => entry.id === selected))
                  }
                }}
                aria-label={`Posição da camada ${slot.number}`}
              >
                <span className="osi__slotnumber">{slot.number}</span>
                <span className="osi__slotlabel">{item ? item.label : slot.label}</span>
                {item && <CheckIcon width={15} height={15} />}
              </div>
            )
          })}
          <span className="osi__cap">BASE</span>
        </div>

        <div className="osi__tray" aria-label="Blocos disponíveis">
          <h3>Blocos ({remaining.length})</h3>
          {remaining.length === 0 ? (
            <p className="muted small">Todos os blocos colocados. Muito bem!</p>
          ) : (
            <ul>
              {remaining.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`osi__block${selected === item.id ? ' is-selected' : ''}`}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', item.id)}
                    onClick={() => setSelected(selected === item.id ? null : item.id)}
                    aria-pressed={selected === item.id}
                  >
                    <LayersIcon width={15} height={15} />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="small muted">Arrasta o bloco para uma posição — ou toca no bloco e depois na posição.</p>
        </div>
      </div>

      {feedback && (
        <div className={`osi__feedback osi__feedback--${feedback.tone}`} role="status">
          <p>{feedback.text}</p>
        </div>
      )}

      {solved && (
        <div className="osi__done card">
          <h3><CheckIcon width={18} height={18} /> Nível completo!</h3>
          <p className="muted">Pontuação: {score} pontos · falhas: {mistakes}.</p>
          <p className="small muted">Toda a torre responde: {OSI_LAYERS.map((layer) => layer.number).join(' → ')} (topo → base).</p>
        </div>
      )}
    </div>
  )
}

function QuizLevel({ level, attempt }) {
  const [answers, setAnswers] = useState({})
  const [score, setScore] = useState(0)

  useEffect(() => {
    setAnswers({})
    setScore(0)
  }, [attempt, level])

  return (
    <div className="osi__board">
      <div className="osi__stats">
        <Badge tone="ok"><StarIcon width={13} height={13} /> {score} pontos</Badge>
        <Badge>{Object.keys(answers).length}/{level.questions.length} respondidas</Badge>
      </div>
      <ProgressBar value={(Object.keys(answers).length / level.questions.length) * 100} label="Progresso do nível" />

      <ul className="osi__questions">
        {level.questions.map((question, index) => {
          const chosen = answers[index]
          const answered = chosen !== undefined
          const correct = answered && chosen === question.answer
          return (
            <li key={index} className="card osi__question">
              <p className="osi__problem"><strong>{index + 1}.</strong> {question.problem}</p>
              <div className="osi__options">
                {[1, 2, 3, 4, 5, 6, 7].map((number) => {
                  const layer = layerByNumber(number)
                  const state = !answered
                    ? ''
                    : number === question.answer
                      ? ' is-correct'
                      : chosen === number
                        ? ' is-wrong'
                        : ''
                  return (
                    <button
                      key={number}
                      type="button"
                      className={`chip${state}`}
                      disabled={answered}
                      onClick={() => {
                        setAnswers((previous) => ({ ...previous, [index]: number }))
                        if (number === question.answer) setScore((value) => value + 10)
                      }}
                    >
                      {number}. {layer.name}
                    </button>
                  )
                })}
              </div>
              {answered && (
                <p className={`small ${correct ? 'ok-text' : 'bad-text'}`}>
                  {correct ? 'Correto! ' : `A resposta certa é ${question.answer} — ${layerByNumber(question.answer).name}. `}
                  {question.explanation}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function OsiGame() {
  const [levelIndex, setLevelIndex] = useState(0)
  const [attempt, setAttempt] = useState(1)
  const [timerOn, setTimerOn] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [best, setBest] = useState({})
  const level = LEVELS[levelIndex]

  useEffect(() => {
    if (!timerOn) return undefined
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [timerOn])

  function remember(levelNumber, score, mistakes) {
    setBest((previous) => {
      const current = previous[levelNumber]
      const nextScore = Math.max(current?.score ?? 0, score)
      return { ...previous, [levelNumber]: { score: nextScore, mistakes } }
    })
  }

  function restart(nextLevel = levelIndex) {
    setLevelIndex(nextLevel)
    setAttempt((value) => value + 1)
    setSeconds(0)
    if (!timerOn) setTimerOn(false)
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Jogo educativo"
        title="DESAFIO OSI — Monta a torre"
        description="Sete camadas, quatro níveis. Sobe do físico até à aplicação e aprende com cada erro."
        actions={
          <button type="button" className="btn" onClick={() => restart()}>
            <RestartIcon width={15} height={15} /> Reiniciar
          </button>
        }
      />

      <div className="osi__levels" role="tablist" aria-label="Níveis do desafio OSI">
        {LEVELS.map((entry, index) => (
          <button
            key={entry.title}
            type="button"
            role="tab"
            aria-selected={index === levelIndex}
            className={`osi__level${index === levelIndex ? ' is-active' : ''}`}
            onClick={() => restart(index)}
          >
            <span>Nível {index + 1}</span>
            <small>{['Ordem', 'Funções', 'Protocolos', 'Diagnóstico'][index]}</small>
            {best[index + 1] && <em>{best[index + 1].score} pts</em>}
          </button>
        ))}
      </div>

      <section className="card osi__header">
        <div>
          <h2>{level.title}</h2>
          <p className="muted">{level.description}</p>
        </div>
        <TimerToggle on={timerOn} setOn={setTimerOn} seconds={seconds} />
      </section>

      {levelIndex < 3 ? (
        <MatchLevel
          key={`${levelIndex}-${attempt}`}
          level={level}
          attempt={attempt}
          onSolved={(score, mistakes) => remember(levelIndex + 1, score, mistakes)}
        />
      ) : (
        <QuizLevel key={`${levelIndex}-${attempt}`} level={level} attempt={attempt} />
      )}

      <section className="card noticecard">
        <LayersIcon width={20} height={20} />
        <div>
          <h3>Como jogar</h3>
          <p className="muted">
            Os blocos começam desorganizados. Cada erro explica qual era a posição certa e porquê.
            Podes arrastar ou tocar no bloco e depois na posição — funciona no telemóvel.
          </p>
        </div>
      </section>
    </div>
  )
}
