import { useRef, useState } from 'react'
import { DEVICE_ICONS } from './icons.jsx'
import { categoryOf } from '../lib/deviceTypes.js'

const DRAG_THRESHOLD = 6

export default function NetworkCanvas({
  devices,
  links,
  mode,
  selectedId,
  connectFrom,
  simFrom,
  packet,
  hopLabel,
  activeHopId,
  onDeviceTap,
  onDeviceMove,
  onCanvasTap,
}) {
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const movedRef = useRef(false)
  const [drag, setDrag] = useState(null)

  const nodes = devices.map((device) =>
    drag && drag.id === device.id ? { ...device, x: drag.x, y: drag.y } : device
  )
  const positions = new Map(nodes.map((device) => [device.id, device]))

  function pointFromEvent(event) {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    return { x: Math.min(Math.max(x, 6), 94), y: Math.min(Math.max(y, 6), 94) }
  }

  function handleCanvasClick(event) {
    const point = pointFromEvent(event)
    onCanvasTap(Math.round(point.x * 10) / 10, Math.round(point.y * 10) / 10)
  }

  function handlePointerDown(event, device) {
    event.stopPropagation()
    movedRef.current = false
    dragRef.current = {
      id: device.id,
      startX: event.clientX,
      startY: event.clientY,
      x: device.x,
      y: device.y,
      moved: false,
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // capture is best-effort: dragging still works while inside the map
    }
  }

  function handlePointerMove(event) {
    const state = dragRef.current
    if (!state) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return

    state.moved = true
    const point = pointFromEvent(event)
    state.x = point.x
    state.y = point.y
    setDrag({ id: state.id, x: point.x, y: point.y })
  }

  function finishDrag() {
    const state = dragRef.current
    dragRef.current = null
    if (!state) return
    if (state.moved) {
      movedRef.current = true
      setDrag(null)
      onDeviceMove(state.id, Math.round(state.x * 10) / 10, Math.round(state.y * 10) / 10)
    }
  }

  return (
    <div ref={canvasRef} className={`canvas canvas--${mode}`} onClick={handleCanvasClick}>
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

      {nodes.map((device) => {
        const Icon = DEVICE_ICONS[device.type] ?? DEVICE_ICONS.pc
        const classes = [
          'node',
          `node--${categoryOf(device.type)}`,
          selectedId === device.id ? 'node--selected' : '',
          connectFrom?.id === device.id || simFrom?.id === device.id ? 'node--active' : '',
          activeHopId === device.id ? 'node--hop' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <button
            key={device.id}
            type="button"
            className={classes}
            style={{ left: `${device.x}%`, top: `${device.y}%` }}
            onPointerDown={(event) => handlePointerDown(event, device)}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onClick={(event) => {
              event.stopPropagation()
              if (movedRef.current) {
                movedRef.current = false
                return
              }
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

      {packet && (
        <span className="packet" style={{ left: `${packet.x}%`, top: `${packet.y}%` }} />
      )}
      {hopLabel && <span className="sim-chip">{hopLabel}</span>}

      {devices.length === 0 && (
        <p className="canvas__empty">Toque em Adicionar para começar.</p>
      )}
    </div>
  )
}
