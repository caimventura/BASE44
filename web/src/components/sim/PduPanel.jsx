import { labelOf } from '../../lib/catalog.js'
import { CloseIcon, PduIcon } from '../icons.jsx'

const PROTOCOLS = [
  { key: 'icmp', label: 'ICMP (ping)' },
  { key: 'http', label: 'HTTP (TCP 80)' },
  { key: 'https', label: 'HTTPS (TCP 443)' },
  { key: 'ftp', label: 'FTP (TCP 21)' },
  { key: 'dns', label: 'DNS (UDP 53)' },
]

const withIp = (device) => (device.config?.interfaces ?? []).some((iface) => iface.ip)

function PacketField({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/**
 * Ferramenta PDU — o equivalente ao "Add Simple/Complex PDU" do Packet Tracer.
 * O PDU simples envia um ICMP Echo; o complexo permite escolher protocolo,
 * TTL, tamanho e sequência e mostra o pacote camada a camada.
 */
export default function PduPanel({
  devices,
  kind,
  setKind,
  fromId,
  toId,
  setFromId,
  setToId,
  form,
  setForm,
  result,
  busy,
  onSend,
  onClose,
}) {
  const candidates = devices.filter((device) => withIp(device) || kind === 'simple')
  const packet = result?.packet
  const setField = (field) => (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))

  return (
    <section className="simp pdu" aria-label="Ferramenta PDU">
      <header className="simp__head">
        <div>
          <p className="eyebrow">Ferramenta de simulação</p>
          <h2><PduIcon width={18} height={18} /> PDU</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar PDU">
          <CloseIcon width={16} height={16} />
        </button>
      </header>

      <div className="segmented segmented--block" role="group" aria-label="Tipo de PDU">
        <button type="button" className={kind === 'simple' ? 'is-active' : ''} onClick={() => setKind('simple')}>
          PDU simples
        </button>
        <button type="button" className={kind === 'complex' ? 'is-active' : ''} onClick={() => setKind('complex')}>
          PDU complexo
        </button>
      </div>

      <p className="small muted">
        {kind === 'simple'
          ? 'No mapa, toque na origem e depois no destino para enviar um ICMP Echo (ping).'
          : 'Escolha o protocolo e os parâmetros do pacote. Também pode tocar nos equipamentos no mapa.'}
      </p>

      <div className="simp__form simp__form--tight">
        <label className="field">
          <span className="field__label">Origem</span>
          <select className="field__input" value={fromId ?? ''} onChange={(event) => setFromId(Number(event.target.value) || null)}>
            <option value="">Escolher…</option>
            {candidates.map((device) => (
              <option key={device.id} value={device.id}>{device.name} · {labelOf(device.type)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Destino</span>
          <select className="field__input" value={toId ?? ''} onChange={(event) => setToId(Number(event.target.value) || null)}>
            <option value="">Escolher…</option>
            {candidates.map((device) => (
              <option key={device.id} value={device.id}>{device.name} · {labelOf(device.type)}</option>
            ))}
          </select>
        </label>
      </div>

      {kind === 'complex' && (
        <div className="pdu__grid">
          <label className="field">
            <span className="field__label">Protocolo</span>
            <select className="field__input" value={form.protocol} onChange={setField('protocol')}>
              {PROTOCOLS.map((entry) => (
                <option key={entry.key} value={entry.key}>{entry.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">TTL</span>
            <input className="field__input" type="number" min="1" max="255" value={form.ttl} onChange={setField('ttl')} />
          </label>
          <label className="field">
            <span className="field__label">Tamanho (bytes)</span>
            <input className="field__input" type="number" min="32" max="1500" value={form.size} onChange={setField('size')} />
          </label>
          <label className="field">
            <span className="field__label">Sequência</span>
            <input className="field__input" type="number" min="0" max="9999" value={form.sequence} onChange={setField('sequence')} />
          </label>
          {form.protocol === 'dns' && (
            <label className="field pdu__full">
              <span className="field__label">Nome a resolver</span>
              <input className="field__input" value={form.hostname} onChange={setField('hostname')} placeholder="ex.: servidor.netlab.pt" />
            </label>
          )}
        </div>
      )}

      <button type="button" className="btn btn--primary btn--block" onClick={onSend} disabled={busy || !fromId || !toId}>
        {busy ? 'A enviar PDU…' : 'Enviar PDU'}
      </button>

      {!result && (
        <p className="muted small">
          O resultado mostra o percurso, os endereços MAC, o TTL e o encapsulamento OSI do pacote.
        </p>
      )}

      {result && (
        <>
          <div className={`simp__status simp__status--${result.ok ? 'ok' : 'bad'}`}>
            <span className="simp__status-icon">{result.ok ? '✓' : '×'}</span>
            <div>
              <strong>{result.ok ? result.summary : result.reason}</strong>
              {result.ok && result.answer && <p className="small">{result.answer}</p>}
              {!result.ok && result.hint && <p className="small">{result.hint}</p>}
            </div>
          </div>

          {packet && (
            <div className="pdu__packet">
              <h3>Detalhe do pacote</h3>
              <dl className="details details--compact">
                <PacketField label="Protocolo" value={`${packet.protocol} · ${packet.type}`} />
                <PacketField label="Origem" value={`${packet.srcIp}${packet.srcPort ? `:${packet.srcPort}` : ''}`} />
                <PacketField label="Destino" value={`${packet.dstIp}${packet.dstPort ? `:${packet.dstPort}` : ''}`} />
                <PacketField label="MAC" value={`${packet.srcMac} → ${packet.dstMac}`} />
                <PacketField label="TTL" value={packet.ttl} />
                <PacketField label="Tamanho" value={`${packet.size} bytes`} />
                <PacketField label="Sequência" value={packet.sequence} />
                <PacketField label="Latência" value={`${result.latencyMs} ms`} />
              </dl>
            </div>
          )}

          {result.layers?.length > 0 && (
            <div className="pdu__layers">
              <h3>Encapsulamento OSI</h3>
              <ol>
                {result.layers.map((layer) => (
                  <li key={layer.layer}>
                    <span className="pdu__layer">L{layer.layer}</span>
                    <span>
                      <strong>{layer.name}</strong>
                      <small>{layer.detail}</small>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.events?.length > 0 && (
            <div className="events">
              <h3>Eventos</h3>
              <ol className="events__list">
                {result.events.slice(-8).map((event, index) => (
                  <li key={index} className={`event event--${event.level}`}>
                    <span className="event__text">{event.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  )
}
