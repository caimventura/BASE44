import { CableIcon, PcIcon, PingIcon, RouterIcon, SwitchIcon } from './icons.jsx'

const DEVICES = [
  { type: 'pc', label: 'PC', Icon: PcIcon },
  { type: 'switch', label: 'Switch', Icon: SwitchIcon },
  { type: 'router', label: 'Roteador', Icon: RouterIcon },
]

export default function Toolbar({ mode, placeType, onPlace, onConnect, onPing, onCancel }) {
  const placing = mode === 'place' ? placeType : null

  return (
    <nav className="toolbar" aria-label="Ferramentas">
      {DEVICES.map(({ type, label, Icon }) => (
        <button
          key={type}
          type="button"
          className={`tool${placing === type ? ' tool--active' : ''}`}
          onClick={() => onPlace(type)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
      <button
        type="button"
        className={`tool${mode === 'connect' ? ' tool--active' : ''}`}
        onClick={onConnect}
      >
        <CableIcon />
        <span>Cabo</span>
      </button>
      <button
        type="button"
        className={`tool${mode === 'ping' ? ' tool--active' : ''}`}
        onClick={onPing}
      >
        <PingIcon />
        <span>Ping</span>
      </button>
      {mode !== 'select' && (
        <button type="button" className="tool tool--cancel" onClick={onCancel}>
          <span>Cancelar</span>
        </button>
      )}
    </nav>
  )
}
