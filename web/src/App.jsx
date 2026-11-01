import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from './lib/api.js'
import { labelOf } from './lib/deviceTypes.js'
import NetworkCanvas from './components/NetworkCanvas.jsx'
import Toolbar from './components/Toolbar.jsx'
import DevicePicker from './components/DevicePicker.jsx'
import DevicePanel from './components/DevicePanel.jsx'
import SimulationPanel from './components/SimulationPanel.jsx'

const SEGMENT_MS = 650

export default function App() {
  const [lab, setLab] = useState({ devices: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('select')
  const [placeType, setPlaceType] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [connectFrom, setConnectFrom] = useState(null)
  const [simFrom, setSimFrom] = useState(null)
  const [simBusy, setSimBusy] = useState(false)
  const [simResult, setSimResult] = useState(null)
  const [packet, setPacket] = useState(null)
  const [hopLabel, setHopLabel] = useState('')
  const [activeHopId, setActiveHopId] = useState(null)
  const [error, setError] = useState('')
  const frameRef = useRef(null)

  useEffect(() => {
    api
      .getLab()
      .then(setLab)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  const selected = lab.devices.find((device) => device.id === selectedId) ?? null

  const connections = useMemo(() => {
    if (!selected) return []
    const byId = new Map(lab.devices.map((device) => [device.id, device]))
    return lab.links
      .filter((link) => link.a_id === selected.id || link.b_id === selected.id)
      .map((link) => {
        const otherId = link.a_id === selected.id ? link.b_id : link.a_id
        return { id: link.id, name: byId.get(otherId)?.name ?? '?' }
      })
  }, [lab, selected])

  const hint = (() => {
    if (simBusy) return 'Simulando o fluxo de pacotes…'
    if (pickerOpen) return 'Escolha o tipo de dispositivo.'
    if (mode === 'place') return `Toque no mapa para posicionar: ${labelOf(placeType)}.`
    if (mode === 'connect') {
      return connectFrom
        ? `Agora toque no segundo dispositivo para ligar ao ${connectFrom.name}.`
        : 'Toque no primeiro dispositivo do cabo.'
    }
    if (mode === 'simulate') {
      return simFrom ? 'Agora toque no dispositivo de destino.' : 'Toque no dispositivo de origem do fluxo.'
    }
    return 'Toque para configurar, ou arraste para mover.'
  })()

  function resetModes() {
    setMode('select')
    setPlaceType(null)
    setConnectFrom(null)
    setSimFrom(null)
  }

  async function handleCanvasTap(x, y) {
    if (mode === 'place' && placeType) {
      try {
        const device = await api.createDevice({ type: placeType, x, y })
        setLab((previous) => ({ ...previous, devices: [...previous.devices, device] }))
        setSelectedId(device.id)
        setError('')
      } catch (err) {
        setError(err.message)
      }
      resetModes()
      return
    }

    if (mode === 'select') setSelectedId(null)
  }

  async function handleDeviceTap(device) {
    if (mode === 'connect') {
      if (!connectFrom) {
        setConnectFrom(device)
        return
      }
      if (connectFrom.id === device.id) {
        setConnectFrom(null)
        return
      }
      try {
        const link = await api.createLink(connectFrom.id, device.id)
        setLab((previous) => ({ ...previous, links: [...previous.links, link] }))
        setError('')
      } catch (err) {
        setError(err.message)
      }
      resetModes()
      return
    }

    if (mode === 'simulate') {
      if (!simFrom) {
        setSimFrom(device)
        return
      }
      if (simFrom.id === device.id) {
        setSimFrom(null)
        return
      }
      const origin = simFrom
      setSimFrom(null)
      await runSimulation(origin, device)
      return
    }

    setSelectedId(device.id)
    setSimResult(null)
  }

  function animateFlow(hops) {
    return new Promise((resolve) => {
      const segments = hops.length - 1
      if (segments < 1) {
        resolve()
        return
      }
      const start = performance.now()

      const step = (now) => {
        const progress = Math.min((now - start) / SEGMENT_MS, segments)
        const index = Math.min(Math.floor(progress), segments - 1)
        const raw = progress - index
        const eased = raw * raw * (3 - 2 * raw)
        const from = hops[index]
        const to = hops[index + 1]

        setPacket({ x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased })
        setHopLabel(`${from.name} → ${to.name}`)
        setActiveHopId(to.id)

        if (progress >= segments) {
          setPacket(null)
          setHopLabel('')
          setActiveHopId(null)
          resolve()
          return
        }
        frameRef.current = requestAnimationFrame(step)
      }

      frameRef.current = requestAnimationFrame(step)
    })
  }

  async function runSimulation(origin, destination) {
    resetModes()
    setSimResult(null)
    setSimBusy(true)
    try {
      const result = await api.simulate(origin.id, destination.id)
      setError('')
      if (result.ok && Array.isArray(result.path) && result.path.length > 1) {
        const hops = result.path
          .map((id) => lab.devices.find((device) => device.id === id))
          .filter(Boolean)
        await animateFlow(hops)
      }
      setSimResult(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setSimBusy(false)
    }
  }

  async function moveDevice(id, x, y) {
    setLab((previous) => ({
      ...previous,
      devices: previous.devices.map((device) =>
        device.id === id ? { ...device, x, y } : device
      ),
    }))
    try {
      await api.updateDevice(id, { x, y })
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function saveDevice(fields) {
    const updated = await api.updateDevice(selectedId, fields)
    setLab((previous) => ({
      ...previous,
      devices: previous.devices.map((device) => (device.id === updated.id ? updated : device)),
    }))
    setError('')
  }

  async function deleteDevice() {
    try {
      await api.deleteDevice(selectedId)
      setLab((previous) => ({
        devices: previous.devices.filter((device) => device.id !== selectedId),
        links: previous.links.filter(
          (link) => link.a_id !== selectedId && link.b_id !== selectedId
        ),
      }))
      setSelectedId(null)
      setSimResult(null)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeLink(id) {
    try {
      await api.deleteLink(id)
      setLab((previous) => ({
        ...previous,
        links: previous.links.filter((link) => link.id !== id),
      }))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  function pickType(type) {
    setPickerOpen(false)
    setMode('place')
    setPlaceType(type)
    setSelectedId(null)
    setSimResult(null)
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>NetSim</h1>
        <span className="app__badge">
          {lab.devices.length} disp. · {lab.links.length} cabos
        </span>
      </header>

      <p className="app__hint">{hint}</p>

      {error && (
        <div className="app__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      )}

      <div className="app__body">
        {loading ? (
          <p className="canvas__empty">Carregando laboratório…</p>
        ) : (
          <NetworkCanvas
            devices={lab.devices}
            links={lab.links}
            mode={mode}
            selectedId={selectedId}
            connectFrom={connectFrom}
            simFrom={simFrom}
            packet={packet}
            hopLabel={hopLabel}
            activeHopId={activeHopId}
            onDeviceTap={handleDeviceTap}
            onDeviceMove={moveDevice}
            onCanvasTap={handleCanvasTap}
          />
        )}

        {pickerOpen && <DevicePicker onPick={pickType} onClose={() => setPickerOpen(false)} />}

        {!pickerOpen && simResult && (
          <SimulationPanel result={simResult} onClose={() => setSimResult(null)} />
        )}

        {!pickerOpen && !simResult && selected && (
          <DevicePanel
            device={selected}
            connections={connections}
            onSave={saveDevice}
            onDelete={deleteDevice}
            onRemoveLink={removeLink}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      <Toolbar
        mode={mode}
        onAdd={() => {
          setPickerOpen((open) => !open)
          resetModes()
          setSimResult(null)
        }}
        onConnect={() => {
          setMode(mode === 'connect' ? 'select' : 'connect')
          setPlaceType(null)
          setConnectFrom(null)
          setSimFrom(null)
        }}
        onSimulate={() => {
          setMode(mode === 'simulate' ? 'select' : 'simulate')
          setPlaceType(null)
          setConnectFrom(null)
          setSimFrom(null)
          setSimResult(null)
        }}
        onCancel={resetModes}
      />
    </div>
  )
}
