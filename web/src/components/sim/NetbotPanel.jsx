import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { BotIcon, SendIcon, CloseIcon } from '../icons.jsx'

const greeting =
  'Olá! Sou o NETBOT. Responde só ao que perguntas: um IP, uma máscara, uma configuração ou a causa de um ping que falha. Se selecionares um equipamento no mapa, eu uso-o como referência.'

const QUICK = [
  'Dá-me um IP para esta máquina',
  'Qual é a máscara para 192.168.1.10?',
  'Porque é que o meu ping falha?',
  'Como configuro DHCP?',
]

export default function NetbotPanel({ projectId, selectedDevice, onApply, onClose }) {
  const [messages, setMessages] = useState([{ role: 'bot', text: greeting, actions: [] }])
  const [suggestions, setSuggestions] = useState(QUICK)
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function scrollToEnd() {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
    })
  }

  async function ask(text) {
    const trimmed = String(text ?? '').trim()
    if (!trimmed || busy) return
    setMessages((previous) => [...previous, { role: 'user', text: trimmed }])
    setQuestion('')
    setBusy(true)
    try {
      const context = selectedDevice?.id > 0 ? selectedDevice.id : null
      const result = await api.netbot(projectId, trimmed, context)
      setMessages((previous) => [
        ...previous,
        { role: 'bot', text: result.answer, actions: result.actions ?? [], applied: false },
      ])
      setSuggestions(result.suggestions?.length ? result.suggestions : QUICK)
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        { role: 'bot', text: `Não consegui responder agora: ${error.message}` },
      ])
    } finally {
      setBusy(false)
      scrollToEnd()
    }
  }

  async function apply(index) {
    const message = messages[index]
    if (!message?.actions?.length || !onApply) return
    setBusy(true)
    const ok = await onApply(message.actions)
    setBusy(false)
    setMessages((previous) =>
      previous.map((entry, position) =>
        position === index
          ? {
              ...entry,
              applied: ok !== false,
              text: ok === false
                ? entry.text
                : `${entry.text}\n\nConfiguração aplicada: ${message.actions
                    .map((action) => `${action.deviceName} → ${action.ip}/${action.mask}`)
                    .join(', ')}.`,
            }
          : entry
      )
    )
    scrollToEnd()
  }

  return (
    <section className="netbot" aria-label="NETBOT">
      <header className="simp__head">
        <div className="row">
          <span className="netbot__avatar"><BotIcon width={20} height={20} /></span>
          <div>
            <p className="eyebrow">Professor particular</p>
            <h2>NETBOT</h2>
          </div>
        </div>
        {onClose && (
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar NETBOT">
            <CloseIcon width={16} height={16} />
          </button>
        )}
      </header>

      <p className="netbot__context small muted">
        {selectedDevice ? `Contexto: ${selectedDevice.name}` : 'Nenhum equipamento selecionado'}
      </p>

      <div className="netbot__log" ref={listRef} aria-live="polite">
        {messages.map((message, index) => (
          <article key={index} className={`msg msg--${message.role}`}>
            <p className="msg__text">{message.text}</p>
            {message.actions?.length > 0 && !message.applied && onApply && (
              <button type="button" className="btn btn--primary btn--tiny" onClick={() => apply(index)} disabled={busy}>
                Aplicar configuração
              </button>
            )}
            {message.applied && <p className="small ok-text">Aplicado ao laboratório.</p>}
          </article>
        ))}
        {busy && <p className="muted small">O NETBOT está a analisar…</p>}
      </div>

      <div className="netbot__suggestions">
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" className="chip" onClick={() => ask(suggestion)} disabled={busy}>
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="netbot__form"
        onSubmit={(event) => {
          event.preventDefault()
          ask(question)
        }}
      >
        <input
          className="field__input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={selectedDevice ? `Pergunta sobre ${selectedDevice.name}…` : 'Escreve a tua dúvida em português…'}
          aria-label="Pergunta ao NETBOT"
        />
        <button type="submit" className="btn btn--primary btn--icon" disabled={busy} aria-label="Enviar">
          <SendIcon width={17} height={17} />
        </button>
      </form>
    </section>
  )
}
