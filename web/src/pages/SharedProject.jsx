import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { Link } from '../lib/router.jsx'
import { DEVICE_ICONS } from '../components/icons.jsx'
import { labelOf } from '../lib/catalog.js'
import { cableInfo, formatIp, linkState } from '../lib/topology.js'
import { Spinner } from '../components/ui.jsx'

export default function SharedProject({ slug }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.sharedProject(slug).then(setData).catch((err) => setError(err.message))
  }, [slug])

  if (error) {
    return (
      <div className="page">
        <h1>Projeto indisponível</h1>
        <p className="muted">{error}</p>
        <Link className="btn btn--primary" to="/">Ir para o NETLAB ACADEMY</Link>
      </div>
    )
  }

  if (!data) {
    return <div className="page"><Spinner label="A carregar projeto partilhado…" /></div>
  }

  const positions = new Map(data.devices.map((device) => [device.id, device]))

  return (
    <div className="shared">
      <header className="shared__head">
        <div>
          <p className="eyebrow">NETLAB ACADEMY · projeto partilhado</p>
          <h1>{data.project.name}</h1>
          <p className="muted">{data.project.description || 'Sem descrição.'}</p>
        </div>
        <Link className="btn btn--primary" to="/">Entrar para editar</Link>
      </header>

      <div className="shared__stage">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="cables" aria-hidden="true">
          {data.links.map((link) => {
            const a = positions.get(link.a_id)
            const b = positions.get(link.b_id)
            if (!a || !b) return null
            const state = linkState(a, b, link)
            return (
              <g key={link.id}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="cable__line" style={{ stroke: cableInfo(link.cable).color }} vectorEffect="non-scaling-stroke" strokeDasharray={link.cable === 'wireless' ? '2 1.6' : undefined} />
                <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="0.8" className={`cable__dot cable__dot--${state.tone}`} />
              </g>
            )
          })}
        </svg>
        {data.devices.map((device) => {
          const Icon = DEVICE_ICONS[device.type] ?? DEVICE_ICONS.pc
          return (
            <div key={device.id} className={`node node--${device.type} node--static`} style={{ left: `${device.x}%`, top: `${device.y}%` }}>
              <span className="node__icon"><Icon width={24} height={24} /></span>
              <span className="node__name">{device.name}</span>
              <span className="node__ip">{formatIp(device) ?? 'sem IP'}</span>
            </div>
          )
        })}
        {data.annotations.map((annotation) => (
          <div key={annotation.id} className="annotation annotation--static" style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}>
            <span className="annotation__text">{annotation.text}</span>
          </div>
        ))}
      </div>

      <section className="card">
        <h2>Equipamentos</h2>
        <div className="tablewrap">
          <table className="table">
            <thead><tr><th>Nome</th><th>Tipo</th><th>IP</th></tr></thead>
            <tbody>
              {data.devices.map((device) => (
                <tr key={device.id}>
                  <td>{device.name}</td>
                  <td>{labelOf(device.type)}</td>
                  <td className="mono">{formatIp(device) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">Vista de leitura. As configurações completas não são editáveis nesta página.</p>
      </section>
    </div>
  )
}
