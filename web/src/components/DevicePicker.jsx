import { DEVICE_GROUPS, labelOf } from '../lib/deviceTypes.js'
import { DEVICE_ICONS } from './icons.jsx'

export default function DevicePicker({ onPick, onClose }) {
  return (
    <section className="sheet">
      <div className="sheet__head">
        <div>
          <h2>Adicionar dispositivo</h2>
          <p className="sheet__type">Escolha o tipo e toque no mapa.</p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </div>

      {DEVICE_GROUPS.map((group) => (
        <div className="picker" key={group.title}>
          <h3>{group.title}</h3>
          <div className="picker__grid">
            {group.types.map((type) => {
              const Icon = DEVICE_ICONS[type]
              return (
                <button
                  key={type}
                  type="button"
                  className="picker__item"
                  onClick={() => onPick(type)}
                >
                  <Icon />
                  <span>{labelOf(type)}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
