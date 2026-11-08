import { useRef, useState } from 'react'
import { DEVICE_ICONS } from '../icons.jsx'
import { categoryOf } from '../../lib/catalog.js'
import { cableInfo, formatIp, interfaceLabel, linkState, needsConfiguration } from '../../lib/topology.js'

const DRAG_THRESHOLD = 5

export default function Workspace({
  devices,
  links,
  annotations,
  mode,
  tool,
  selectedId,
  selectedLinkId,
  selectedAnnotationId,
  connectFrom,
  activeHopId,
  pduFrom,
  pduTo,
  packet,
  zoom,
  pan,
  onZoomPanChange,
  onCanvasTap,
  onDeviceTap,
  onDeviceMove,
  onDeviceOpen,
  onLinkTap,
  onAnnotationTap,
  onAnnotationMove,
}) {
  const worldRef = useRef(null)
  const dragRef = useRef(null)
  const panRef = useRef(null)
  const movedRef = useRef(false)
  const [drag, setDrag] = useState(null)
  const [noteDrag, setNoteDrag] = useState(null)

  const nodes = devices.map((device) =>
    drag && drag.id === device.id ? { ...device, x: drag.x, y: drag.y } : device
  )
  const notes = annotations.map((annotation) =>
    noteDrag && noteDrag.id === annotation.id ? { ...annotation, x: noteDrag.x, y: noteDrag.y } : annotation
  )
  const positions = new Map(nodes.map((device) => [device.id, device]))

  function pointFromEvent(event) {
    const rect = worldRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    return { x: Math.min(Math.max(x, 3), 97), y: Math.min(Math.max(y, 3), 97) }
  }

  function handleDevicePointerDown(event, device) {
    if (tool === 'pan') return
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
      // captura é opcional
    }
  }

  function handlePointerMove(event) {
    if (panRef.current) {
      const state = panRef.current
      onZoomPanChange(zoom, { x: state.panX + (event.clientX - state.startX), y: state.panY + (event.clientY - state.startY) })
      return
    }
    const state = dragRef.current
    if (state) {
      const dx = event.clientX - state.startX
      const dy = event.clientY - state.startY
      if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      state.moved = true
      const point = pointFromEvent(event)
      state.x = point.x
      state.y = point.y
      setDrag({ id: state.id, x: point.x, y: point.y })
      return
    }
    if (noteDrag) {
      const point = pointFromEvent(event)
      setNoteDrag((previous) => (previous ? { ...previous, x: point.x, y: point.y } : previous))
    }
  }

  function handlePointerUp() {
    if (panRef.current) {
      panRef.current = null
      return
    }
    const state = dragRef.current
    dragRef.current = null
    if (state) {
      if (state.moved) {
        movedRef.current = true
        setDrag(null)
        onDeviceMove(state.id, Math.round(state.x * 10) / 10, Math.round(state.y * 10) / 10)
      }
      return
    }
    if (noteDrag) {
      onAnnotationMove(noteDrag.id, Math.round(noteDrag.x * 10) / 10, Math.round(noteDrag.y * 10) / 10)
      setNoteDrag(null)
    }
  }

  function handleStagePointerDown(event) {
    if (tool !== 'pan') return
    panRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    }
  }

  const stageClass = `stage stage--${mode} stage--tool-${tool}`

  return (
    <div
      className={stageClass}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerDown={handleStagePointerDown}
      onPointerCancel={handlePointerUp}
    >
      <div className="stage__viewport">
        <div
          ref={worldRef}
          className="stage__world"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          onClick={(event) => {
            if (tool === 'pan' || movedRef.current) {
              movedRef.current = false
              return
            }
            if (event.target.closest('.node, .annotation, .cable-hit')) return
            const point = pointFromEvent(event)
            onCanvasTap(Math.round(point.x * 10) / 10, Math.round(point.y * 10) / 10)
          }}
        >
          <svg className="cables" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="false">
            {links.map((link) => {
              const a = positions.get(link.a_id)
              const b = positions.get(link.b_id)
              if (!a || !b) return null
              const state = linkState(a, b, link)
              const info = cableInfo(link.cable)
              const selected = selectedLinkId === link.id
              return (
                <g key={link.id} className={`cable cable--${state.tone}${selected ? ' cable--selected' : ''}`}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className="cable__hit"
                    vectorEffect="non-scaling-stroke"
                    onClick={(event) => {
                      event.stopPropagation()
                      onLinkTap(link.id)
                    }}
                  />
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className="cable__line"
                    style={{ stroke: info.color }}
                    strokeDasharray={link.cable === 'wireless' ? '2 1.6' : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={(a.x + b.x) / 2}
                    cy={(a.y + b.y) / 2}
                    r="0.9"
                    className={`cable__dot cable__dot--${state.tone}`}
                    vectorEffect="non-scaling-stroke"
                  />

                </g>
              )
            })}
          </svg>

          {selectedLinkId && (() => {
            const link = links.find((entry) => entry.id === selectedLinkId)
            const a = link && positions.get(link.a_id)
            const b = link && positions.get(link.b_id)
            if (!a || !b) return null
            return (
              <>
                <span className="cable__portlabel" style={{ left: `${a.x}%`, top: `${a.y}%` }}>
                  {interfaceLabel(a, link.a_port)}
                </span>
                <span className="cable__portlabel" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
                  {interfaceLabel(b, link.b_port)}
                </span>
              </>
            )
          })()}

          {notes.map((annotation) => (
            <div
              key={annotation.id}
              className={`annotation${selectedAnnotationId === annotation.id ? ' annotation--selected' : ''}`}
              style={{ left: `${noteDrag?.id === annotation.id ? noteDrag.x : annotation.x}%`, top: `${noteDrag?.id === annotation.id ? noteDrag.y : annotation.y}%` }}
              onPointerDown={(event) => {
                event.stopPropagation()
                movedRef.current = false
                setNoteDrag({ id: annotation.id, x: annotation.x, y: annotation.y })
              }}
              onClick={(event) => {
                event.stopPropagation()
                onAnnotationTap(annotation.id)
              }}
              role="button"
              tabIndex={0}
            >
              <span className="annotation__text">{annotation.text}</span>
            </div>
          ))}

          {nodes.map((device) => {
            const Icon = DEVICE_ICONS[device.type] ?? DEVICE_ICONS.pc
            const state = device.powered === false ? 'off' : 'up'
            const classes = [
              'node',
              `node--${categoryOf(device.type)}`,
              device.powered === false ? 'node--off' : '',
              selectedId === device.id ? 'node--selected' : '',
              connectFrom?.id === device.id ? 'node--active' : '',
              activeHopId === device.id ? 'node--hop' : '',
              pduFrom === device.id ? 'node--pdu-source' : '',
              pduTo === device.id ? 'node--pdu-target' : '',
              drag?.id === device.id ? 'node--dragging' : '',
            ]
              .filter(Boolean)
              .join(' ')
            const ip = formatIp(device)
            const warn = needsConfiguration(device, links)

            return (
              <button
                key={device.id}
                type="button"
                className={classes}
                style={{ left: `${device.x}%`, top: `${device.y}%` }}
                aria-label={`${device.name}, ${ip ?? 'sem IP'}`}
                onPointerDown={(event) => handleDevicePointerDown(event, device)}
                onDoubleClick={(event) => {
                  event.stopPropagation()
                  onDeviceOpen?.(device)
                }}
                onClick={(event) => {
                  event.stopPropagation()
                  if (movedRef.current) {
                    movedRef.current = false
                    return
                  }
                  onDeviceTap(device)
                }}
              >
                <span className={`node__icon node__icon--${categoryOf(device.type)}`}>
                  <Icon width={26} height={26} />
                </span>
                <span className="node__name">{device.name}</span>
                <span className="node__ip">{ip ?? 'sem IP'}</span>
                {warn && (
                  <span className="node__warn" title="Interface ligada sem endereço IP — configure o equipamento">
                    !
                  </span>
                )}
                <span className={`node__status node__status--${state}`} aria-hidden="true" />
              </button>
            )
          })}

          {packet && (
            <button
              type="button"
              className="packet"
              style={{ left: `${packet.x}%`, top: `${packet.y}%` }}
              onClick={(event) => {
                event.stopPropagation()
                packet.onClick?.()
              }}
              aria-label="Detalhes do pacote"
            >
              <span className="packet__dot" />
              <span className="packet__label">{packet.label}</span>
            </button>
          )}
        </div>
      </div>

      {devices.length === 0 && (
        <div className="stage__empty">
          <p>Área de trabalho vazia</p>
          <span>Abra a biblioteca de equipamentos e adicione o primeiro dispositivo.</span>
        </div>
      )}

      {tool === 'pan' && <span className="stage__tool">Ferramenta de navegação: arraste para deslocar o cenário</span>}
      {tool === 'note' && <span className="stage__tool">Clique no mapa para colocar uma anotação</span>}
      {tool === 'erase' && <span className="stage__tool">Toque num equipamento, cabo ou anotação para apagar</span>}
      {mode === 'connect' && <span className="stage__tool">Clique num equipamento para escolher a porta de ligação</span>}
    </div>
  )
}
