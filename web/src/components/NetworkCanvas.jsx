import { PcIcon, RouterIcon, SwitchIcon } from './icons.jsx'

const ICONS = { pc: PcIcon, switch: SwitchIcon, router: RouterIcon }

export default function NetworkCanvas({
  devices,
  links,
  mode,
  selectedId,
  connectFrom,
  pingFrom,
  onDeviceTap,
  onCanvasTap,
}) {
  const positions = new Map(devices.map((device) => [device.id, device]))

  function handleClick(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    onCanvasTap(Math.round(x * 10) / 10, Math.round(y * 10) / 10)
  }

  return (
    <div className={`canvas canvas--${mode}`} onClick={handleClick}>
      <svg className="canvas__cables" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {links.map((link) => {
          const from = positions.get(link.a_id)
          const to = positions.get(link.b_id)
          if (!from || !to) return null
          return (
            <line
              key={link.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>

      {devices.map((device) => {
        const Icon = ICONS[device.type]
        const active = connectFrom?.id === device.id || pingFrom?.id === device.id
        const classes = [
          'node',
          `node--${device.type}`,
          selectedId === device.id ? 'node--selected' : '',
          active ? 'node--active' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <button
            key={device.id}
            type="button"
            className={classes}
            style={{ left: `${device.x}%`, top: `${device.y}%` }}
            onClick={(event) => {
              event.stopPropagation()
              onDeviceTap(device)
            }}
          >
            <span className="node__icon">
              <Icon />
            </span>
            <span className="node__name">{device.name}</span>
            {device.ip && <span className="node__ip">{device.ip}</span>}
          </button>
        )
      })}

      {devices.length === 0 && (
        <p className="canvas__empty">Toque em PC, Switch ou Roteador para começar.</p>
      )}
    </div>
  )
}
