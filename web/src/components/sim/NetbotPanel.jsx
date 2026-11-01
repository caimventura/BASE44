import { useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { BotIcon, SendIcon, CloseIcon } from '../icons.jsx'

const greeting = `Olá! Sou o NETBOT, o assistente de redes do NETLAB ACADEMY.

Posso analisar o laboratório atual e explicar porque um ping falha, o que falta numa configuração de IP, VLAN, DHCP, DNS ou routing. As respostas são calculadas a partir da topologia real — nada inventado.`

const QUICK = [
  'Porque é que o meu ping falha?',
  'Como está o endereçamento IP?',
  'Explica as VLANs deste laboratório',
  'O DHCP está bem configurado?',
]

export default function NetbotPanel({ projectId, onClose }) {
  const [messages, setMessages] = useState([{ role: 'bot', text: greeting }])
  const [suggestions, setSuggestions] = useState(QUICK)
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef(null)

  async function ask(text) {
    const trimmed = String(text ?? '').trim()
    if (!trimmed || busy) return
    setMessages((previous) => [...previous, { role: 'user', text: trimmed }])
    setQuestion('')
    setBusy(true)
    try {
      const result = await api.netbot(projectId, trimmed)
      setMessages((previous) => [...previous, { role: 'bot', text: result.answer, issues: result.issues }])
      setSuggestions(result.suggestions?.length ? result.suggestions : QUICK)
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        { role: 'bot', text: `Não consegui analisar o laboratório: ${error.message}` },
      ])
    } finally {
      setBusy(false)
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
      })
    }
  }

  return (
    <section className="netbot" aria-label="NETBOT">
      <header className="simp__head">
        <div className="row">
          <span className="netbot__avatar"><BotIcon width={20} height={20} /></span>
          <div>
            <p className="eyebrow">Assistente educativo</p>
            <h2>NETBOT</h2>
          </div>
        </div>
        {onClose && (
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar NETBOT">
            <CloseIcon width={16} height={16} />
          </button>
        )}
      </header>

      <div className="netbot__log" ref={listRef} aria-live="polite">
        {messages.map((message, index) => (
          <article key={index} className={`msg msg--${message.role}`}>
            <p>{message.text}</p>
            {message.issues?.length > 0 && (
              <ul className="msg__issues">
                {message.issues.slice(0, 4).map((issue, position) => (
                  <li key={position} className={`issue issue--${issue.severity}`}>
                    {issue.text}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
        {busy && <p className="muted small">O NETBOT está a analisar a topologia…</p>}
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
          placeholder="Escreva a sua dúvida em português…"
          aria-label="Pergunta ao NETBOT"
        />
        <button type="submit" className="btn btn--primary btn--icon" disabled={busy} aria-label="Enviar">
          <SendIcon width={17} height={17} />
        </button>
      </form>
    </section>
  )
}
