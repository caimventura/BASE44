import { useState } from 'react'
import { api } from '../../lib/api.js'

export default function BrowserTab({ projectId, device }) {
  const [url, setUrl] = useState('http://www.netlab.local')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function open(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const match = url.match(/^(https?|ftp):\/\/([^/:]+)/i)
      const service = match ? match[1].toLowerCase() : 'http'
      const hostname = match ? match[2] : url.trim()
      const data = await api.service(projectId, device.id, hostname, service)
      if (data.ok) setResult(data)
      else setError(data.reason)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="browser">
      <div className="browser__chrome">
        <span className="browser__dots" aria-hidden="true">•••</span>
        <form className="browser__form" onSubmit={open}>
          <input
            className="browser__url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-label="Endereço"
            spellCheck="false"
          />
          <button type="submit" className="btn btn--tiny btn--primary" disabled={busy}>
            {busy ? 'A abrir…' : 'Abrir'}
          </button>
        </form>
      </div>

      <div className="browser__page">
        {result ? (
          <article className="browser__site">
            <p className="eyebrow">Servidor {result.server}</p>
            <h3>Bem-vindo ao NETLAB ACADEMY</h3>
            <p>{result.content}</p>
            <p className="muted small">
              Página simulada servida por {result.server} através do protocolo {result.service.toUpperCase()}.
            </p>
          </article>
        ) : error ? (
          <div className="browser__error" role="alert">
            <strong>Não foi possível abrir a página</strong>
            <p>{error}</p>
          </div>
        ) : (
          <div className="browser__empty">
            <p>Navegador simulado</p>
            <span>Escreva um endereço e abra para testar os serviços ativos na rede.</span>
          </div>
        )}
      </div>
    </div>
  )
}
