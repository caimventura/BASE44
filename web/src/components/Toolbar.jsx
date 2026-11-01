import { CableIcon, PingIcon, PlusIcon } from './icons.jsx'

export default function Toolbar({ mode, onAdd, onConnect, onSimulate, onCancel }) {
  return (
    <nav className="toolbar" aria-label="Ferramentas">
      <button
        type="button"
        className={`tool${mode === 'place' ? ' tool--active' : ''}`}
        onClick={onAdd}
      >
        <PlusIcon />
        <span>Adicionar</span>
      </button>
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
        className={`tool${mode === 'simulate' ? ' tool--active' : ''}`}
        onClick={onSimulate}
      >
        <PingIcon />
        <span>Simular</span>
      </button>
      {mode !== 'select' && (
        <button type="button" className="tool tool--cancel" onClick={onCancel}>
          <span>Cancelar</span>
        </button>
      )}
    </nav>
  )
}
