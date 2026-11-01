import { useEffect, useMemo, useState } from 'react'
import { api } from './lib/api.js'
import NetworkCanvas from './components/NetworkCanvas.jsx'
import Toolbar from './components/Toolbar.jsx'
import DevicePanel from './components/DevicePanel.jsx'
import PingPanel from './components/PingPanel.jsx'

const PLACE_LABELS = { pc: 'PC', switch: 'switch', router: 'roteador' }

export default function App() {
  const [lab, setLab] = useState({ devices: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('select')
  const [placeType, setPlaceType] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [connectFrom, setConnectFrom] = useState(null)
  const [pingFrom, setPingFrom] = useState(null)
  const [pingBusy, setPingBusy] = useState(false)
  const [pingResult, setPingResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getLab()
      .then(setLab)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
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
    if (mode === 'place') return `Toque no mapa para posicionar o ${PLACE_LABELS[placeType]}.`
    if (mode === 'connect') {
      return connectFrom
        ? `Agora toque no segundo dispositivo para ligar ao ${connectFrom.name}.`
        : 'Toque no primeiro dispositivo do cabo.'
    }
    if (mode === 'ping') {
      return pingFrom ? 'Agora toque no PC de destino.' : 'Toque no PC de origem do ping.'
    }
    return 'Toque em um dispositivo para configurar.'
  })()

  function resetModes() {
    setMode('select')
    setPlaceType(null)
    setConnectFrom(null)
    setPingFrom(null)
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

    if (mode === 'ping') {
      if (!pingFrom) {
        setPingFrom(device)
        return
      }
      if (pingFrom.id === device.id) {
        setPingFrom(null)
        return
      }
      setPingBusy(true)
      try {
        const result = await api.ping(pingFrom.id, device.id)
        setPingResult(result)
        setError('')
      } catch (err) {
        setError(err.message)
      } finally {
        setPingBusy(false)
        resetModes()
      }
      return
    }

    setSelectedId(device.id)
    setPingResult(null)
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
      setPingResult(null)
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

  return (
    <div className="app">
      <header className="app__header">
        <h1>NetSim</h1>
        <span className="app__badge">
          {lab.devices.length} disp. · {lab.links.length} cabos
        </span>
      </header>

      <p className="app__hint">{pingBusy ? 'Simulando o ping…' : hint}</p>

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
            pingFrom={pingFrom}
            onDeviceTap={handleDeviceTap}
            onCanvasTap={handleCanvasTap}
          />
        )}

        {pingResult && <PingPanel result={pingResult} onClose={() => setPingResult(null)} />}

        {!pingResult && selected && (
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
        placeType={placeType}
        onPlace={(type) => {
          if (mode === 'place' && placeType === type) {
            resetModes()
            return
          }
          setMode('place')
          setPlaceType(type)
          setConnectFrom(null)
          setPingFrom(null)
          setPingResult(null)
        }}
        onConnect={() => {
          setMode(mode === 'connect' ? 'select' : 'connect')
          setPlaceType(null)
          setConnectFrom(null)
          setPingFrom(null)
        }}
        onPing={() => {
          setMode(mode === 'ping' ? 'select' : 'ping')
          setPlaceType(null)
          setConnectFrom(null)
          setPingFrom(null)
          setPingResult(null)
        }}
        onCancel={resetModes}
      />
    </div>
  )
}
