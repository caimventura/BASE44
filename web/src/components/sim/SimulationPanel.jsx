import { useEffect } from 'react'
import { CABLE_TYPES, labelOf, categoryOf } from '../../lib/catalog.js'
import { PlayIcon, PauseIcon, StepIcon, RestartIcon, BoltIcon, CheckIcon, CloseIcon } from '../icons.jsx'
import { Modal } from '../ui.jsx'

export default function SimulationPanel({
  devices,
  links,
  result,
  mode,
  setMode,
  fromId,
  toId,
  setFromId,
  setToId,
  onRun,
  busy,
  step,
  setStep,
  playing,
  setPlaying,
  speed,
  setSpeed,
  onRestart,
  packetOpen,
  setPacketOpen,
}) {
  const withIp = devices.filter((device) =>
    (device.config?.interfaces ?? []).some((iface) => iface.ip)
  )
  const hops = result?.ok ? result.path : []
  const visibleEvents = result?.events
    ? result.events.slice(0, Math.max(1, Math.ceil(((step + 1) / Math.max(hops.length, 1)) * result.events.length)))
    : []

  useEffect(() => {
    if (!result) return undefined
    if (!playing) return undefined
    if (!result.ok || hops.length === 0) return undefined
    const timer = setTimeout(() => {
      setStep((current) => {
        if (current >= hops.length - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 1500 / speed)
    return () => clearTimeout(timer)
  }, [playing, step, result, speed, hops.length, setStep, setPlaying])

  const packet = result?.packet
  const origin = devices.find((device) => device.id === fromId)
  const destination = devices.find((device) => device.id === toId)

  return (
    <section className="simp" aria-label="Centro de simulação">
      <header className="simp__head">
        <div>
          <p className="eyebrow">Modo simulação</p>
          <h2>Centro de simulação</h2>
        </div>
        <span className={`tag ${result ? (result.ok ? 'tag--ok' : 'tag--bad') : ''}`}>
          {result ? (result.ok ? 'Entregue' : 'Interrompida') : 'Pronto'}
        </span>
      </header>

      <div className="simp__form">
        <label className="field">
          <span className="field__label">Origem</span>
          <select className="field__input" value={fromId ?? ''} onChange={(event) => setFromId(Number(event.target.value) || null)}>
            <option value="">Escolher…</option>
            {withIp.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} · {labelOf(device.type)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Destino</span>
          <select className="field__input" value={toId ?? ''} onChange={(event) => setToId(Number(event.target.value) || null)}>
            <option value="">Escolher…</option>
            {withIp.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} · {labelOf(device.type)}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented" role="group" aria-label="Protocolo">
          <button type="button" className={mode === 'ping' ? 'is-active' : ''} onClick={() => setMode('ping')}>
            Ping
          </button>
          <button type="button" className={mode === 'traceroute' ? 'is-active' : ''} onClick={() => setMode('traceroute')}>
            Tracert
          </button>
        </div>
        <button type="button" className="btn btn--primary" onClick={onRun} disabled={busy || !fromId || !toId}>
          {busy ? 'A calcular…' : 'Executar simulação'}
        </button>
      </div>

      {!result && (
        <p className="muted small">
          Escolha origem e destino (ou clique nos equipamentos no mapa). A simulação verifica cabos, IPs, máscaras, VLANs, gateways e rotas.
        </p>
      )}

      {result && (
        <>
          <div className={`simp__status simp__status--${result.ok ? 'ok' : 'bad'}`}>
            <span className="simp__status-icon">{result.ok ? <CheckIcon width={16} height={16} /> : <CloseIcon width={16} height={16} />}</span>
            <div>
              <strong>{result.ok ? result.summary : result.reason}</strong>
              {!result.ok && result.hint && <p className="small">{result.hint}</p>}
            </div>
          </div>

          <div className="controls" role="group" aria-label="Controlos da simulação">
            <button type="button" className="btn btn--tiny" onClick={() => setPlaying(!playing)} disabled={!result.ok} aria-label={playing ? 'Pausar' : 'Continuar'}>
              {playing ? <PauseIcon width={15} height={15} /> : <PlayIcon width={15} height={15} />}
              {playing ? 'Pausar' : 'Reproduzir'}
            </button>
            <button type="button" className="btn btn--tiny" onClick={() => setStep((value) => Math.min(value + 1, Math.max(hops.length - 1, 0)))} disabled={!result.ok}>
              <StepIcon width={15} height={15} />
              Passo
            </button>
            <button type="button" className="btn btn--tiny" onClick={onRestart}>
              <RestartIcon width={15} height={15} />
              Reiniciar
            </button>
            <label className="speed">
              <BoltIcon width={14} height={14} />
              <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} aria-label="Velocidade">
                <option value={0.5}>0,5×</option>
                <option value={1}>1×</option>
                <option value={2}>2×</option>
                <option value={3}>3×</option>
              </select>
            </label>
          </div>

          {result.ok && hops.length > 0 && (
            <div className="hopbar" aria-label="Percurso do pacote">
              {hops.map((id, index) => {
                const device = devices.find((entry) => entry.id === id)
                if (!device) return null
                return (
                  <button
                    key={`${id}-${index}`}
                    type="button"
                    className={`hop${index <= step ? ' hop--done' : ''}${index === step ? ' hop--current' : ''}`}
                    onClick={() => setStep(index)}
                    title={device.name}
                  >
                    <span className="hop__dot" />
                    <span className="hop__name">{device.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          {result.ok && (
            <button type="button" className="packetcard" onClick={() => setPacketOpen(true)}>
              <span className="packetcard__icon">⇄</span>
              <span>
                <strong>Pacote {packet?.protocol} {packet?.type}</strong>
                <small>{packet?.srcIp} → {packet?.dstIp} · TTL {packet?.ttl}</small>
              </span>
              <span className="packetcard__more">Ver detalhes</span>
            </button>
          )}

          <div className="events">
            <h3>Eventos da simulação</h3>
            <ol className="events__list">
              {visibleEvents.map((event, index) => (
                <li key={index} className={`events__item events__item--${event.level}`}>
                  <span className="events__index">{index + 1}</span>
                  <span>{event.text}</span>
                </li>
              ))}
            </ol>
            {result.ok && step < hops.length - 1 && (
              <p className="muted small">A simulação está em curso — {step + 1} de {hops.length} equipamentos.</p>
            )}
          </div>

          {!result.ok && result.events?.length > 0 && (
            <div className="events">
              <h3>Onde parou</h3>
              <ol className="events__list">
                {result.events.slice(-6).map((event, index) => (
                  <li key={index} className={`events__item events__item--${event.level}`}>
                    <span className="events__index">{index + 1}</span>
                    <span>{event.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      {links.length > 0 && (
        <p className="muted small">
          Cabos na topologia: {links.map((link) => CABLE_TYPES[link.cable]?.short ?? 'Cabo').join(' · ')}
        </p>
      )}

      {packetOpen && result?.ok && (
        <Modal title="Detalhes do pacote" subtitle={`${origin?.name ?? 'origem'} → ${destination?.name ?? 'destino'}`} onClose={() => setPacketOpen(false)}>
          <dl className="details">
            <div><dt>Equipamento de origem</dt><dd>{origin?.name} ({categoryOf(origin?.type)} — {labelOf(origin?.type)})</dd></div>
            <div><dt>Equipamento de destino</dt><dd>{destination?.name} ({labelOf(destination?.type)})</dd></div>
            <div><dt>IP de origem</dt><dd className="mono">{packet?.srcIp}</dd></div>
            <div><dt>IP de destino</dt><dd className="mono">{packet?.dstIp}</dd></div>
            <div><dt>MAC de origem</dt><dd className="mono">{packet?.srcMac}</dd></div>
            <div><dt>MAC de destino</dt><dd className="mono">{packet?.dstMac}</dd></div>
            <div><dt>Protocolo</dt><dd>{packet?.protocol}</dd></div>
            <div><dt>Tipo de pacote</dt><dd>{packet?.type}</dd></div>
            <div><dt>Estado da transmissão</dt><dd>{packet?.status}</dd></div>
            <div><dt>Próximo salto</dt><dd className="mono">{packet?.nextHop}</dd></div>
            <div><dt>Resultado</dt><dd>{result.summary}</dd></div>
          </dl>
        </Modal>
      )}
    </section>
  )
}
