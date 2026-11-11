import { CABLE_TYPES } from '../../lib/catalog.js'
import { freePorts } from '../../lib/topology.js'
import { Modal } from '../ui.jsx'

export default function PortPicker({ device, cable, links, onPick, onClose }) {
  const ports = freePorts(device, links, cable)
  const info = CABLE_TYPES[cable]

  return (
    <Modal
      title={`Porta em ${device?.name ?? 'equipamento'}`}
      subtitle={`${info?.label ?? 'Cabo'} — ${info?.description ?? ''}`}
      onClose={onClose}
    >
      {ports.length === 0 ? (
        <p className="form-error">
          Este equipamento não tem portas livres compatíveis com o cabo escolhido.
        </p>
      ) : (
        <ul className="portlist">
          {ports.map((port) => (
            <li key={port.name}>
              <button type="button" className="portlist__item" onClick={() => onPick(port.name)}>
                <span className="portlist__name">{port.label ?? port.name}</span>
                <span className="portlist__kind">
                  {port.name} · {port.wireless ? 'wireless' : 'Ethernet'} · livre
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
