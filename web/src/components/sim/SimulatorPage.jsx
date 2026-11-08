import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { useRouter, Link } from '../../lib/router.jsx'
import {
  CABLE_TYPES,
  DEVICE_CATALOG,
  DEVICE_GROUPS,
  categoryOf,
  hasWireless,
  labelOf,
  portLabel,
} from '../../lib/catalog.js'
import {
  cableInfo,
  cloneTopology,
  defaultConfigFor,
  formatIp,
  freePorts,
  prefixOf,
  primaryIface,
  suggestionName,
  topologyPayload,
} from '../../lib/topology.js'
import { DEVICE_ICONS } from '../icons.jsx'
import {
  BoltIcon,
  BotIcon,
  CableIcon,
  CloseIcon,
  CollapseIcon,
  CheckIcon,
  CopyIcon,
  CursorIcon,
  DownloadIcon,
  EraserIcon,
  ExpandIcon,
  FolderIcon,
  GridIcon,
  LayoutIcon,
  PduIcon,
  PenIcon,
  PlayIcon,
  PlusIcon,
  RedoIcon,
  SaveIcon,
  TrashIcon,
  UndoIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '../icons.jsx'
import { Modal, Spinner, Toast, ProgressBar } from '../ui.jsx'
import { PageHeader } from '../ui.jsx'
import Workspace from './Workspace.jsx'
import DeviceDialog from './DeviceDialog.jsx'
import PortPicker from './PortPicker.jsx'
import SimulationPanel from './SimulationPanel.jsx'
import NetbotPanel from './NetbotPanel.jsx'
import PduPanel from './PduPanel.jsx'

const clamp = (value) => Math.min(Math.max(value, 5), 95)

export default function SimulatorPage({ projectId }) {
  const { navigate, query } = useRouter()
  const [project, setProject] = useState(null)
  const [topology, setTopology] = useState({ devices: [], links: [], annotations: [] })
  const [loading, setLoading] = useState(Boolean(projectId))
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)

  const [mode, setMode] = useState('select')
  const [tool, setTool] = useState('select')
  const [cable, setCable] = useState('straight')
  const [placeType, setPlaceType] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedLinkId, setSelectedLinkId] = useState(null)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null)
  const [configId, setConfigId] = useState(null)
  const [connectFrom, setConnectFrom] = useState(null)
  const [portPicker, setPortPicker] = useState(null)
  const [noteDraft, setNoteDraft] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [netbotOpen, setNetbotOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [paletteHidden, setPaletteHidden] = useState(false)
  const [sideHidden, setSideHidden] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [projects, setProjects] = useState(null)
  const [historyRevision, setHistoryRevision] = useState(0)

  const [simFrom, setSimFrom] = useState(null)
  const [simTo, setSimTo] = useState(null)
  const [simMode, setSimMode] = useState('ping')
  const [simResult, setSimResult] = useState(null)
  const [simBusy, setSimBusy] = useState(false)
  const [simStep, setSimStep] = useState(0)
  const [simPlaying, setSimPlaying] = useState(false)
  const [simSpeed, setSimSpeed] = useState(1)
  const [packetOpen, setPacketOpen] = useState(false)
  const [lab, setLab] = useState(null)
  const [evaluation, setEvaluation] = useState(null)
  const [labBusy, setLabBusy] = useState(false)
  const [labInfoOpen, setLabInfoOpen] = useState(false)

  // Ferramenta PDU (simples = ICMP; complexo = protocolo/TTL/tamanho)
  const [pduKind, setPduKind] = useState('simple')
  const [pduFrom, setPduFrom] = useState(null)
  const [pduTo, setPduTo] = useState(null)
  const [pduResult, setPduResult] = useState(null)
  const [pduBusy, setPduBusy] = useState(false)
  const [pduForm, setPduForm] = useState({
    protocol: 'icmp',
    ttl: 128,
    size: 64,
    sequence: 1,
    hostname: '',
  })

  const historyRef = useRef([])
  const futureRef = useRef([])
  const tempIdRef = useRef(-1)
  const savingRef = useRef(false)

  const labId = Number(query.get('lab')) || null

  useEffect(() => {
    if (!projectId) {
      api.projects().then((data) => setProjects(data.projects)).catch((err) => setError(err.message))
      return
    }
    let active = true
    setLoading(true)
    api
      .project(projectId)
      .then((data) => {
        if (!active) return
        setProject(data.project)
        setTopology({ devices: data.devices, links: data.links, annotations: data.annotations })
        setError('')
        window.setTimeout(() => fitToView(data.devices), 150)
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [projectId])

  useEffect(() => {
    if (!labId) {
      setLab(null)
      return
    }
    api.lab(labId).then((data) => setLab(data.lab)).catch(() => setLab(null))
  }, [labId])

  useEffect(() => {
    if (panelOpen || netbotOpen) setSideHidden(false)
  }, [panelOpen, netbotOpen])

  // Em telemóvel o painel de simulação/PDU fica abaixo do mapa: trazê-lo à vista.
  useEffect(() => {
    if (!panelOpen) return undefined
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 760px)').matches) return undefined
    const timer = window.setTimeout(() => {
      document.querySelector('.sim__side')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 180)
    return () => window.clearTimeout(timer)
  }, [panelOpen, mode])

  // Em telemóvel a rotação/resize muda a área útil: volta a enquadrar a topologia.
  useEffect(() => {
    if (!projectId) return undefined
    const timer = window.setTimeout(() => fitToView(), 450)
    const onResize = () => window.setTimeout(() => fitToView(), 200)
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, topology.devices.length])

  // Animação do pacote PDU ao longo do percurso calculado.
  useEffect(() => {
    if (mode !== 'pdu' || !simPlaying || !simResult?.ok) return undefined
    const total = simResult.path?.length ?? 0
    if (total < 2) return undefined
    const timer = window.setTimeout(() => {
      setSimStep((current) => {
        if (current >= total - 1) {
          setSimPlaying(false)
          return current
        }
        return current + 1
      })
    }, 700 / simSpeed)
    return () => window.clearTimeout(timer)
  }, [mode, simPlaying, simStep, simResult, simSpeed])

  const selectedDevice = topology.devices.find((device) => device.id === selectedId) ?? null
  const configDevice = topology.devices.find((device) => device.id === configId) ?? null
  const selectedLink = topology.links.find((link) => link.id === selectedLinkId) ?? null
  const selectedAnnotation = topology.annotations.find((note) => note.id === selectedAnnotationId) ?? null

  const canUndo = historyRef.current.length > 0
  const canRedo = futureRef.current.length > 0
  void historyRevision

  const persist = useCallback(
    async (next, previous) => {
      if (savingRef.current) return null
      savingRef.current = true
      setSaving(true)
      setTopology(next)
      try {
        const saved = await api.saveTopology(projectId, topologyPayload(next))
        setTopology({ devices: saved.devices, links: saved.links, annotations: saved.annotations })
        setError('')
        return saved
      } catch (err) {
        if (previous) setTopology(previous)
        setError(err.message)
        return null
      } finally {
        savingRef.current = false
        setSaving(false)
      }
    },
    [projectId]
  )

  const mutate = useCallback(
    async (producer, { record = true } = {}) => {
      if (savingRef.current) return null
      const previous = cloneTopology(topology)
      const next = producer(cloneTopology(topology))
      if (record) {
        historyRef.current.push(previous)
        if (historyRef.current.length > 40) historyRef.current.shift()
        futureRef.current = []
        setHistoryRevision((value) => value + 1)
      }
      return persist(next, previous)
    },
    [topology, persist]
  )

  async function undo() {
    const snapshot = historyRef.current.pop()
    if (!snapshot) return
    futureRef.current.push(cloneTopology(topology))
    setHistoryRevision((value) => value + 1)
    setSelectedId(null)
    await persist(cloneTopology(snapshot))
  }

  async function redo() {
    const snapshot = futureRef.current.pop()
    if (!snapshot) return
    historyRef.current.push(cloneTopology(topology))
    setHistoryRevision((value) => value + 1)
    setSelectedId(null)
    await persist(cloneTopology(snapshot))
  }

  function resetModes() {
    setMode('select')
    setTool('select')
    setPlaceType(null)
    setConnectFrom(null)
  }

  function resetSimulation() {
    setSimResult(null)
    setSimStep(0)
    setSimPlaying(false)
    setPacketOpen(false)
  }

  async function addDevice(type, point) {
    const device = {
      id: tempIdRef.current--,
      name: suggestionName(topology.devices, type),
      type,
      x: point?.x ?? 30 + Math.random() * 40,
      y: point?.y ?? 30 + Math.random() * 30,
      powered: true,
      config: defaultConfigFor(type),
    }
    const saved = await mutate((current) => ({ ...current, devices: [...current.devices, device] }))
    resetModes()
    setPaletteOpen(false)
    if (saved) {
      const created = saved.devices.find((entry) => entry.name === device.name)
      if (created) setSelectedId(created.id)
      setToast({ message: `${device.name} adicionado à área de trabalho.`, tone: 'ok' })
      if (categoryOf(type) === 'end' || categoryOf(type) === 'router') {
        setSimFrom(null)
        setSimTo(null)
      }
    }
  }

  async function handleCanvasTap(x, y) {
    if (tool === 'note') {
      setNoteDraft({ x, y, text: '' })
      setTool('select')
      return
    }
    if (mode === 'place' && placeType) {
      await addDevice(placeType, { x, y })
      return
    }
    setSelectedId(null)
    setSelectedLinkId(null)
    setSelectedAnnotationId(null)
  }

  function handleDeviceTap(device) {
    if (tool === 'erase') {
      deleteDevice(device)
      return
    }
    if (mode === 'pdu') {
      if (!pduFrom || (pduFrom && pduTo)) {
        setPduFrom(device.id)
        setPduTo(null)
        setPduResult(null)
        setSimResult(null)
        return
      }
      if (pduFrom === device.id) {
        setPduFrom(null)
        return
      }
      setPduTo(device.id)
      if (pduKind === 'simple') sendPdu(device.id)
      return
    }
    if (mode === 'connect') {
      if (!connectFrom) {
        setPortPicker({ device, stage: 'from', cable })
        return
      }
      if (connectFrom.device.id === device.id) {
        setConnectFrom(null)
        setToast({ message: 'Escolha outro equipamento para a ligação.', tone: 'warn' })
        return
      }
      setPortPicker({ device, stage: 'to', cable })
      return
    }
    if (mode === 'simulate') {
      if (!simFrom || (simFrom && simTo)) {
        setSimFrom(device.id)
        setSimTo(null)
        setSimResult(null)
        return
      }
      if (simFrom === device.id) {
        setSimFrom(null)
        return
      }
      setSimTo(device.id)
      return
    }
    setSelectedId(device.id)
    setSelectedLinkId(null)
    setSelectedAnnotationId(null)
  }

  async function pickPort(portName) {
    const request = portPicker
    setPortPicker(null)
    if (!request) return
    if (request.stage === 'from') {
      setConnectFrom({ device: request.device, port: portName })
      return
    }
    if (!connectFrom) return
    const link = {
      id: tempIdRef.current--,
      a_id: connectFrom.device.id,
      b_id: request.device.id,
      a_port: connectFrom.port,
      b_port: portName,
      cable: request.cable,
    }
    const saved = await mutate((current) => ({ ...current, links: [...current.links, link] }))
    if (saved) {
      setToast({
        message: `Ligação ${connectFrom.device.name}:${connectFrom.port} ↔ ${request.device.name}:${portName} criada.`,
        tone: 'ok',
      })
    }
    setConnectFrom(null)
    resetModes()
  }

  async function moveDevice(id, x, y) {
    const saved = await mutate((current) => ({
      ...current,
      devices: current.devices.map((device) => (device.id === id ? { ...device, x, y } : device)),
    }))
    if (!saved) setToast({ message: 'Não foi possível guardar a posição.', tone: 'bad' })
  }

  async function handleSaveDevice({ name, powered, config }) {
    const id = configId
    const saved = await mutate((current) => ({
      ...current,
      devices: current.devices.map((device) =>
        device.id === id
          ? {
              ...device,
              name,
              powered,
              config: { ...config, power: powered },
            }
          : device
      ),
    }))
    if (!saved) throw new Error('Não foi possível guardar a configuração.')
    setToast({ message: `Configuração de ${name} guardada.`, tone: 'ok' })
  }

  async function duplicateDevice(device) {
    const copy = {
      ...device,
      id: tempIdRef.current--,
      name: suggestionName(topology.devices, device.type),
      x: clamp(device.x + 6),
      y: clamp(device.y + 6),
      config: JSON.parse(JSON.stringify(device.config ?? {})),
    }
    const saved = await mutate((current) => ({ ...current, devices: [...current.devices, copy] }))
    if (saved) {
      setConfigId(null)
      const created = saved.devices.find((entry) => entry.name === copy.name)
      if (created) setSelectedId(created.id)
      setToast({ message: `${copy.name} criado a partir de ${device.name}.`, tone: 'ok' })
    }
  }

  async function deleteDevice(device) {
    const saved = await mutate((current) => ({
      devices: current.devices.filter((entry) => entry.id !== device.id),
      links: current.links.filter((link) => link.a_id !== device.id && link.b_id !== device.id),
      annotations: current.annotations,
    }))
    if (saved) {
      setConfigId(null)
      setSelectedId(null)
      setToast({ message: `${device.name} eliminado.`, tone: 'ok' })
    }
  }

  async function deleteLink(linkId) {
    const saved = await mutate((current) => ({
      ...current,
      links: current.links.filter((link) => link.id !== linkId),
    }))
    if (saved) {
      setSelectedLinkId(null)
      setToast({ message: 'Cabo removido.', tone: 'ok' })
    }
  }

  async function changeCable(linkId, nextCable) {
    const saved = await mutate((current) => ({
      ...current,
      links: current.links.map((link) => (link.id === linkId ? { ...link, cable: nextCable } : link)),
    }))
    if (saved) setToast({ message: `Tipo de cabo alterado para ${CABLE_TYPES[nextCable].label}.`, tone: 'ok' })
  }

  async function addAnnotation(text, point) {
    const saved = await mutate((current) => ({
      ...current,
      annotations: [
        ...current.annotations,
        { id: tempIdRef.current--, text, x: point.x, y: point.y },
      ],
    }))
    if (saved) setToast({ message: 'Anotação adicionada.', tone: 'ok' })
  }

  async function moveAnnotation(id, x, y) {
    await mutate((current) => ({
      ...current,
      annotations: current.annotations.map((note) => (note.id === id ? { ...note, x, y } : note)),
    }))
  }

  async function deleteAnnotation(id) {
    const saved = await mutate((current) => ({
      ...current,
      annotations: current.annotations.filter((note) => note.id !== id),
    }))
    if (saved) {
      setSelectedAnnotationId(null)
      setToast({ message: 'Anotação removida.', tone: 'ok' })
    }
  }

  async function autoLayout() {
    const devices = topology.devices
    if (devices.length === 0) return
    const columns = Math.min(5, Math.ceil(Math.sqrt(devices.length)))
    const rows = Math.ceil(devices.length / columns)
    const saved = await mutate((current) => ({
      ...current,
      devices: current.devices.map((device, index) => ({
        ...device,
        x: clamp(12 + (index % columns) * (76 / Math.max(columns - 1, 1))),
        y: clamp(14 + Math.floor(index / columns) * (70 / Math.max(rows - 1, 1))),
      })),
    }))
    if (saved) setToast({ message: 'Equipamentos organizados automaticamente.', tone: 'ok' })
  }

  async function clearWorkspace() {
    if (!window.confirm('Limpar toda a área de trabalho? Esta ação pode ser desfeita.')) return
    const saved = await mutate((current) => ({ devices: [], links: [], annotations: [] }))
    if (saved) {
      setSelectedId(null)
      resetSimulation()
      setToast({ message: 'Área de trabalho limpa. Use Desfazer para recuperar.', tone: 'warn' })
    }
  }

  async function saveNow() {
    const saved = await persist(cloneTopology(topology))
    if (saved) setToast({ message: 'Laboratório guardado.', tone: 'ok' })
  }

  async function refreshTopology() {
    try {
      const data = await api.project(projectId)
      setTopology({ devices: data.devices, links: data.links, annotations: data.annotations })
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDhcp() {
    const result = await api.dhcp(projectId, configId)
    if (result.ok) {
      await refreshTopology()
    }
    return result
  }

  /** Ajusta zoom e deslocamento para mostrar todos os equipamentos. */
  function fitToView(list = topology.devices) {
    const stage = document.querySelector('.stage')
    const world = document.querySelector('.stage__world')
    if (!stage) return
    const width = stage.clientWidth
    const height = stage.clientHeight
    if (!width || !height) return
    if (!list || list.length === 0) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      return
    }
    // As posições são percentagens do mundo físico (1180×760 no computador e
    // 980×640 no telemóvel), não da janela — por isso medimos o mundo real.
    const worldW = world?.offsetWidth || 1180
    const worldH = world?.offsetHeight || 760
    const xs = list.map((device) => (Number(device.x) || 50) * (worldW / 100))
    const ys = list.map((device) => (Number(device.y) || 50) * (worldH / 100))
    const minX = Math.min(...xs) - 90
    const maxX = Math.max(...xs) + 90
    const minY = Math.min(...ys) - 70
    const maxY = Math.max(...ys) + 80
    const boxW = Math.max(1, maxX - minX)
    const boxH = Math.max(1, maxY - minY)
    const nextZoom = Math.min(1.4, Math.max(0.25, Math.min(width / boxW, height / boxH) * 0.92))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    setZoom(Number(nextZoom.toFixed(2)))
    setPan({ x: Math.round(width / 2 - centerX * nextZoom), y: Math.round(height / 2 - centerY * nextZoom) })
  }

  /** Aplica uma configuração sugerida pelo NETBOT (só depois do clique do estudante). */
  async function applyNetbotActions(actions) {
    const patches = (actions ?? []).filter((action) => action.kind === 'applyAddress')
    if (patches.length === 0) return false
    const next = cloneTopology(topology)
    for (const patch of patches) {
      const device = next.devices.find((entry) => entry.id === patch.deviceId)
      if (!device) continue
      device.config = {
        ...device.config,
        dns: patch.dns || device.config.dns || '',
        interfaces: (device.config.interfaces ?? []).map((iface) =>
          iface.name === patch.interface
            ? { ...iface, ip: patch.ip, mask: patch.mask, gateway: patch.gateway ?? '', dhcp: false }
            : iface
        ),
      }
    }
    const saved = await persist(next)
    if (saved) setToast({ message: 'Configuração do NETBOT aplicada.', tone: 'ok' })
    return Boolean(saved)
  }

  /** Abre a ferramenta PDU no modo simples ou complexo. */
  function openPdu(kind) {
    setPduKind(kind)
    setMode('pdu')
    setTool('select')
    setPlaceType(null)
    setConnectFrom(null)
    setNetbotOpen(false)
    setPanelOpen(true)
    setSideHidden(false)
    resetSimulation()
    setPduResult(null)
    if (kind === 'simple') setPduForm((previous) => ({ ...previous, protocol: 'icmp' }))
  }

  /** Envia um PDU (ICMP simples ou complexo) para a API. */
  async function sendPdu(toOverride) {
    const from = pduFrom
    const to = toOverride ?? pduTo
    if (!from || !to) {
      setToast({ message: 'Escolha a origem e o destino do PDU.', tone: 'warn' })
      return
    }
    if (from === to) {
      setToast({ message: 'A origem e o destino têm de ser diferentes.', tone: 'warn' })
      return
    }
    setPduBusy(true)
    setPduResult(null)
    resetSimulation()
    try {
      const payload = {
        from,
        to,
        kind: pduKind,
        ...(pduKind === 'complex'
          ? {
              protocol: pduForm.protocol,
              ttl: Number(pduForm.ttl),
              size: Number(pduForm.size),
              sequence: Number(pduForm.sequence),
              hostname: pduForm.hostname,
            }
          : { protocol: 'icmp' }),
      }
      const result = await api.pdu(projectId, payload)
      setPduResult(result)
      setSimResult(result)
      setSimStep(0)
      setSimPlaying(Boolean(result.ok))
      setPduTo(to)
      if (result.ok) setToast({ message: result.summary, tone: 'ok' })
      else setToast({ message: result.reason, tone: 'bad' })
    } catch (err) {
      setError(err.message)
    } finally {
      setPduBusy(false)
    }
  }

  async function runSimulation() {
    if (!simFrom || !simTo) {
      setToast({ message: 'Escolha a origem e o destino da simulação.', tone: 'warn' })
      return
    }
    setSimBusy(true)
    resetSimulation()
    try {
      const result = await api.ping(projectId, simFrom, simTo, simMode)
      setSimResult(result)
      setSimStep(0)
      setSimPlaying(Boolean(result.ok))
      setPanelOpen(true)
      if (result.ok) {
        setToast({ message: result.summary, tone: 'ok' })
      } else {
        setToast({ message: result.reason, tone: 'bad' })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSimBusy(false)
    }
  }

  async function verifyLab() {
    if (!lab || !projectId) return
    setLabBusy(true)
    try {
      const result = await api.verifyLab(projectId, lab.id)
      setEvaluation(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLabBusy(false)
    }
  }

  async function createProjectFromPalette() {
    try {
      const data = await api.createProject({ name: 'Novo laboratório' })
      navigate(`/simulador/${data.project.id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  /** Relatório visual: topologia + endereçamento de cada interface. */
  function exportPng() {
    const width = 1600
    const topologyHeight = 860
    const rows = []
    for (const device of topology.devices) {
      const connectedPorts = new Set(
        topology.links.flatMap((link) => {
          if (link.a_id === device.id) return [link.a_port]
          if (link.b_id === device.id) return [link.b_port]
          return []
        })
      )
      const interfaces = (device.config?.interfaces ?? []).filter(
        (iface) => iface.ip || iface.status === 'down' || connectedPorts.has(iface.name)
      )
      if (interfaces.length === 0) {
        rows.push({ device, iface: null })
        continue
      }
      for (const iface of interfaces) rows.push({ device, iface })
    }
    const tableHeight = Math.max(120, rows.length * 34 + 70)
    const height = topologyHeight + tableHeight + 150
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    const topoTop = 132
    const topoHeight = topologyHeight - topoTop - 24
    const truncate = (text, max) => {
      const value = String(text ?? '')
      return value.length > max ? `${value.slice(0, max - 1)}…` : value
    }

    // cabeçalho
    ctx.fillStyle = '#0b1f33'
    ctx.fillRect(0, 0, width, 104)
    ctx.fillStyle = '#7fa8d4'
    ctx.font = 'bold 14px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('NETLAB ACADEMY · RELATÓRIO DE REDE', 40, 34)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 32px system-ui, sans-serif'
    ctx.fillText(truncate(project?.name ?? 'Topologia', 52), 40, 72)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#b8cde4'
    ctx.font = '14px system-ui, sans-serif'
    ctx.fillText(new Date().toLocaleString('pt-PT'), width - 40, 36)
    ctx.fillText(`${topology.devices.length} equipamentos · ${topology.links.length} cabos`, width - 40, 60)
    ctx.fillText(
      truncate(simResult ? `Última simulação: ${simResult.summary}` : `Laboratório #${projectId ?? '—'}`, 74),
      width - 40,
      84
    )

    // área da topologia
    ctx.fillStyle = '#f6f9fd'
    ctx.fillRect(24, topoTop, width - 48, topoHeight)
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    for (let x = 24; x < width - 24; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, topoTop)
      ctx.lineTo(x, topoTop + topoHeight)
      ctx.stroke()
    }
    for (let y = topoTop; y < topoTop + topoHeight; y += 40) {
      ctx.beginPath()
      ctx.moveTo(24, y)
      ctx.lineTo(width - 24, y)
      ctx.stroke()
    }

    const toPx = (device) => ({
      x: (device.x / 100) * (width - 220) + 110,
      y: topoTop + 70 + (device.y / 100) * (topoHeight - 150),
    })

    // cabos com portas nas pontas
    for (const link of topology.links) {
      const a = topology.devices.find((device) => device.id === link.a_id)
      const b = topology.devices.find((device) => device.id === link.b_id)
      if (!a || !b) continue
      const pa = toPx(a)
      const pb = toPx(b)
      const info = cableInfo(link.cable)
      ctx.strokeStyle = info.color
      ctx.lineWidth = link.cable === 'wireless' ? 2 : 3
      ctx.setLineDash(link.cable === 'wireless' ? [9, 7] : [])
      ctx.beginPath()
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#475569'
      ctx.font = '12px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(portLabel(a.type, link.a_port), pa.x + (pb.x - pa.x) * 0.22, pa.y + (pb.y - pa.y) * 0.22 - 8)
      ctx.fillText(portLabel(b.type, link.b_port), pa.x + (pb.x - pa.x) * 0.78, pa.y + (pb.y - pa.y) * 0.78 - 8)
      ctx.fillStyle = info.color
      ctx.font = 'bold 11px system-ui, sans-serif'
      ctx.fillText(info.short, (pa.x + pb.x) / 2, (pa.y + pb.y) / 2 + 4)
    }

    // equipamentos com o endereçamento visível
    for (const device of topology.devices) {
      const { x, y } = toPx(device)
      const category = categoryOf(device.type)
      const accent = { end: '#1d4ed8', switch: '#4f46e5', router: '#0f9d58', ap: '#7c3aed' }[category] ?? '#1d4ed8'
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = device.powered === false ? '#cbd5e1' : accent
      ctx.lineWidth = 2
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(x - 92, y - 46, 184, 92, 12)
      else ctx.rect(x - 92, y - 46, 184, 92)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = accent
      if (ctx.roundRect) ctx.roundRect(x - 92, y - 46, 6, 92, 3)
      else ctx.rect(x - 92, y - 46, 6, 92)
      ctx.fill()

      ctx.textAlign = 'left'
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 19px system-ui, sans-serif'
      ctx.fillText(truncate(device.name, 16), x - 74, y - 16)
      ctx.fillStyle = '#64748b'
      ctx.font = '12px system-ui, sans-serif'
      ctx.fillText(truncate(labelOf(device.type), 24), x - 74, y + 2)

      const configured = (device.config?.interfaces ?? []).filter((iface) => iface.ip)
      if (configured.length === 0) {
        ctx.fillStyle = '#b45309'
        ctx.font = 'bold 12px system-ui, sans-serif'
        ctx.fillText('Sem endereço IP', x - 74, y + 24)
      } else {
        ctx.fillStyle = '#0f172a'
        ctx.font = '13px ui-monospace, monospace'
        configured.slice(0, 2).forEach((iface, index) => {
          ctx.fillText(`${iface.ip}/${prefixOf(iface.mask)}`, x - 74, y + 22 + index * 17)
        })
        if (configured.length > 2) {
          ctx.fillStyle = '#64748b'
          ctx.font = '11px system-ui, sans-serif'
          ctx.fillText(`+${configured.length - 2} interfaces`, x + 20, y + 22)
        }
      }
      if (device.powered === false) {
        ctx.fillStyle = '#94a3b8'
        ctx.font = 'bold 11px system-ui, sans-serif'
        ctx.fillText('DESLIGADO', x + 60, y - 30)
      }
    }

    for (const note of topology.annotations) {
      const { x, y } = toPx(note)
      ctx.fillStyle = '#065f46'
      ctx.font = 'bold 17px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(note.text, x, y)
    }

    // legenda
    const usedCables = [...new Set(topology.links.map((link) => link.cable))]
    let legendX = 44
    const legendY = topologyHeight - 16
    ctx.textAlign = 'left'
    ctx.font = '12px system-ui, sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText('Legenda:', legendX, legendY)
    legendX += 62
    for (const cable of usedCables) {
      const info = cableInfo(cable)
      ctx.strokeStyle = info.color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(legendX, legendY - 4)
      ctx.lineTo(legendX + 26, legendY - 4)
      ctx.stroke()
      ctx.fillStyle = '#334155'
      ctx.fillText(info.label, legendX + 32, legendY)
      legendX += 32 + ctx.measureText(info.label).width + 24
    }

    // tabela de configuração
    const tableTop = topologyHeight + 18
    ctx.fillStyle = '#0b1f33'
    ctx.fillRect(24, tableTop, width - 48, 42)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 13px system-ui, sans-serif'
    const columns = [
      { x: 44, label: 'Equipamento' },
      { x: 250, label: 'Tipo' },
      { x: 430, label: 'Interface' },
      { x: 700, label: 'Endereço IP' },
      { x: 920, label: 'Máscara' },
      { x: 1120, label: 'Gateway / VLAN' },
      { x: 1400, label: 'Estado' },
    ]
    columns.forEach((column) => ctx.fillText(column.label, column.x, tableTop + 27))

    rows.forEach((row, index) => {
      const y = tableTop + 42 + index * 34
      ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc'
      ctx.fillRect(24, y, width - 48, 34)
      ctx.strokeStyle = '#e2e8f0'
      ctx.beginPath()
      ctx.moveTo(24, y + 34)
      ctx.lineTo(width - 24, y + 34)
      ctx.stroke()
      const { device, iface } = row
      const extra = iface
        ? iface.mode === 'trunk'
          ? `trunk ${iface.trunkVlans || 'all'}`
          : iface.gateway || `VLAN ${iface.vlan ?? 1}`
        : '—'
      const values = [
        truncate(device.name, 24),
        truncate(labelOf(device.type), 24),
        iface ? truncate(portLabel(device.type, iface.name), 26) : '—',
        iface?.ip || '—',
        iface?.mask ? `${iface.mask} (/${prefixOf(iface.mask)})` : '—',
        extra,
        device.powered === false ? 'Desligado' : iface?.status === 'down' ? 'shutdown' : 'Ativa',
      ]
      ctx.font = '13px ui-monospace, monospace'
      ctx.fillStyle = '#0f172a'
      values.forEach((value, columnIndex) => {
        if (columnIndex === 6) {
          ctx.fillStyle = value === 'Ativa' ? '#0f9d58' : '#b45309'
          ctx.font = 'bold 12px system-ui, sans-serif'
        }
        ctx.fillText(truncate(value, columnIndex === 4 ? 30 : 34), columns[columnIndex].x, y + 22)
        ctx.fillStyle = '#0f172a'
        ctx.font = '13px ui-monospace, monospace'
      })
    })

    ctx.fillStyle = '#64748b'
    ctx.font = '12px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(
      'Gerado pelo NETLAB ACADEMY · simulador educativo — os endereços e estados acima refletem a configuração guardada.',
      40,
      height - 24
    )

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${(project?.name ?? 'netlab').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-relatorio.png`
      anchor.click()
      URL.revokeObjectURL(url)
      setToast({ message: 'Relatório da topologia exportado em PNG.', tone: 'ok' })
    })
  }

  /** Exportação gratuita e portátil: ficheiro JSON do laboratório inteiro. */
  function exportJson() {
    const payload = {
      app: 'NETLAB ACADEMY',
      version: 1,
      exportedAt: new Date().toISOString(),
      project: {
        name: project?.name ?? 'Laboratório',
        description: project?.description ?? '',
      },
      devices: topology.devices,
      links: topology.links,
      annotations: topology.annotations,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${(project?.name ?? 'netlab').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.netlab.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setToast({ message: 'Laboratório exportado em JSON (pode reimportar noutro dispositivo).', tone: 'ok' })
  }

  if (!projectId) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Simulador"
          title="Os meus laboratórios"
          description="Escolha um laboratório para continuar ou crie um novo."
          actions={
            <button type="button" className="btn btn--primary" onClick={createProjectFromPalette}>
              <PlusIcon width={17} height={17} /> Criar novo laboratório
            </button>
          }
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        {!projects ? (
          <Spinner label="A carregar laboratórios…" />
        ) : projects.length === 0 ? (
          <p className="muted">Ainda não tem laboratórios. Crie o primeiro para começar.</p>
        ) : (
          <ul className="projectgrid">
            {projects.map((entry) => (
              <li key={entry.id} className="card projectcard">
                <h3>{entry.name}</h3>
                <p className="muted">{entry.description || 'Sem descrição.'}</p>
                <p className="small">{entry.device_count} equipamentos · {entry.link_count} cabos</p>
                <div className="row">
                  <Link className="btn btn--primary btn--tiny" to={`/simulador/${entry.id}`}>Abrir</Link>
                  <Link className="btn btn--tiny" to="/laboratorios">Exercícios</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const hint = (() => {
    if (saving) return 'A guardar alterações…'
    if (tool === 'pan') return 'Arraste o mapa para navegar.'
    if (tool === 'note') return 'Clique no mapa para colocar uma anotação.'
    if (tool === 'erase') return 'Toque num equipamento, cabo ou anotação para apagar.'
    if (mode === 'pdu') {
      return pduKind === 'simple'
        ? 'PDU simples: toque na origem e depois no destino para enviar o ICMP.'
        : 'PDU complexo: escolha protocolo, TTL e tamanho no painel e envie.'
    }
    if (mode === 'place') return `Clique no mapa para colocar ${labelOf(placeType)}.`
    if (mode === 'connect') {
      return connectFrom
        ? `Porta ${connectFrom.port} escolhida em ${connectFrom.device.name}. Escolha o segundo equipamento.`
        : `Escolha o primeiro equipamento do cabo ${CABLE_TYPES[cable].label.toLowerCase()}.`
    }
    if (mode === 'simulate') return 'Escolha origem e destino no painel ou clicando nos equipamentos.'
    return 'Selecione um equipamento para configurar. Arraste para mover.'
  })()

  return (
    <div className={`sim${expanded ? ' sim--expanded' : ''}`}>
      <div className="sim__bar">
        <div className="sim__id">
          <p className="eyebrow">NETLAB ACADEMY · simulador</p>
          <h1>{project?.name ?? 'Laboratório'}</h1>
          <p className="small muted">
            {topology.devices.length} equipamentos · {topology.links.length} cabos
            {saving ? ' · a guardar…' : ''}
          </p>
        </div>
        <div className="simbar">
          <div className="simbar__group">
            <button type="button" className="toolbtn" onClick={createProjectFromPalette}>
              <PlusIcon width={16} height={16} /><span>Novo</span>
            </button>
            <button type="button" className="toolbtn" onClick={() => setOpenDialog(true)}>
              <FolderIcon width={16} height={16} /><span>Abrir</span>
            </button>
            <button type="button" className="toolbtn" onClick={saveNow}>
              <SaveIcon width={16} height={16} /><span>Guardar</span>
            </button>
            <button
              type="button"
              className={`toolbtn${expanded ? ' is-active' : ''}`}
              onClick={() => setExpanded((value) => !value)}
              aria-pressed={expanded}
              title={expanded ? 'Restaurar a interface' : 'Expandir a área de trabalho'}
            >
              {expanded ? <CollapseIcon width={16} height={16} /> : <ExpandIcon width={16} height={16} />}
              <span>{expanded ? 'Restaurar' : 'Expandir'}</span>
            </button>
          </div>

          <div className="simbar__group">
            <button type="button" className="toolbtn toolbtn--icon" onClick={undo} disabled={!canUndo} aria-label="Desfazer">
              <UndoIcon width={17} height={17} />
            </button>
            <button type="button" className="toolbtn toolbtn--icon" onClick={redo} disabled={!canRedo} aria-label="Refazer">
              <RedoIcon width={17} height={17} />
            </button>
            <button type="button" className="toolbtn toolbtn--icon" onClick={() => setZoom((value) => Math.max(0.6, Number((value - 0.15).toFixed(2))))} aria-label="Afastar">
              <ZoomOutIcon width={17} height={17} />
            </button>
            <span className="zoomlabel">{Math.round(zoom * 100)}%</span>
            <button type="button" className="toolbtn toolbtn--icon" onClick={() => setZoom((value) => Math.min(1.8, Number((value + 0.15).toFixed(2))))} aria-label="Aproximar">
              <ZoomInIcon width={17} height={17} />
            </button>
            <button
              type="button"
              className="toolbtn toolbtn--icon"
              onClick={() => {
                setZoom(1)
                setPan({ x: 0, y: 0 })
              }}
              aria-label="Repor zoom"
            >
              <GridIcon width={17} height={17} />
            </button>
          </div>

          <div className="simbar__group">
            <button
              type="button"
              className={`toolbtn${tool === 'select' && mode !== 'connect' && tool !== 'note' ? ' is-active' : ''}`}
              onClick={() => {
                setTool('select')
                setMode('select')
                setPlaceType(null)
                setConnectFrom(null)
              }}
            >
              <CursorIcon width={16} height={16} /><span>Selecionar</span>
            </button>
            <button
              type="button"
              className={`toolbtn${mode === 'connect' ? ' is-active' : ''}`}
              onClick={() => {
                setMode('connect')
                setTool('select')
                setConnectFrom(null)
                setPlaceType(null)
              }}
            >
              <CableIcon width={16} height={16} /><span>Cabo</span>
            </button>
            <button
              type="button"
              className={`toolbtn${tool === 'note' ? ' is-active' : ''}`}
              onClick={() => {
                setTool('note')
                setMode('select')
                setConnectFrom(null)
              }}
            >
              <PenIcon width={16} height={16} /><span>Anotação</span>
            </button>
            <button
              type="button"
              className={`toolbtn toolbtn--erase${tool === 'erase' ? ' is-active' : ''}`}
              onClick={() => {
                setTool('erase')
                setMode('select')
                setPlaceType(null)
                setConnectFrom(null)
              }}
              aria-pressed={tool === 'erase'}
              title="Apagar equipamentos, cabos e anotações"
            >
              <EraserIcon width={16} height={16} /><span>Apagar</span>
            </button>
            <button
              type="button"
              className={`toolbtn${!paletteHidden ? ' is-active' : ''}`}
              onClick={() => {
                setPaletteHidden((value) => !value)
                setPaletteOpen(false)
              }}
              aria-pressed={!paletteHidden}
            >
              <GridIcon width={16} height={16} /><span>Dispositivos</span>
            </button>
            <button
              type="button"
              className={`toolbtn${tool === 'pan' ? ' is-active' : ''}`}
              onClick={() => {
                setTool('pan')
                setMode('select')
                setPlaceType(null)
                setConnectFrom(null)
              }}
            >
              <GridIcon width={16} height={16} /><span>Navegar</span>
            </button>
          </div>

          <div className="simbar__group">
            <label className="cableselect">
              <span className="visually-hidden">Tipo de cabo</span>
              <select value={cable} onChange={(event) => setCable(event.target.value)}>
                {Object.entries(CABLE_TYPES).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </label>
            <button type="button" className="toolbtn" onClick={exportPng} title="Relatório visual da topologia com configurações">
              <DownloadIcon width={16} height={16} /><span>Relatório PNG</span>
            </button>
            <button type="button" className="toolbtn" onClick={exportJson} title="Exportar o laboratório em JSON (backup gratuito)">
              <DownloadIcon width={16} height={16} /><span>JSON</span>
            </button>
            <button type="button" className="toolbtn" onClick={() => fitToView()}>
              <ExpandIcon width={16} height={16} /><span>Ajustar</span>
            </button>
            <button type="button" className="toolbtn" onClick={autoLayout}>
              <LayoutIcon width={16} height={16} /><span>Organizar</span>
            </button>
            <button type="button" className="toolbtn toolbtn--danger" onClick={clearWorkspace}>
              <TrashIcon width={16} height={16} /><span>Limpar</span>
            </button>
          </div>

          <div className="simbar__group">
            <div className="segmented" role="group" aria-label="Modo do simulador">
              <button
                type="button"
                className={mode !== 'simulate' ? 'is-active' : ''}
                onClick={() => {
                  setMode('select')
                  setTool('select')
                  resetSimulation()
                }}
              >
                <BoltIcon width={15} height={15} /> Tempo real
              </button>
              <button
                type="button"
                className={mode === 'simulate' ? 'is-active' : ''}
                onClick={() => {
                  setMode('simulate')
                  setTool('select')
                  setPanelOpen(true)
                  setNetbotOpen(false)
                }}
              >
                <PlayIcon width={15} height={15} /> Simulação
              </button>
            </div>
            <button
              type="button"
              className={`toolbtn${mode === 'pdu' && pduKind === 'simple' ? ' is-active' : ''}`}
              onClick={() => openPdu('simple')}
              title="PDU simples: ICMP Echo entre dois equipamentos"
            >
              <PduIcon width={16} height={16} /><span>PDU simples</span>
            </button>
            <button
              type="button"
              className={`toolbtn${mode === 'pdu' && pduKind === 'complex' ? ' is-active' : ''}`}
              onClick={() => openPdu('complex')}
              title="PDU complexo: protocolo, TTL, tamanho e sequência"
            >
              <PduIcon width={16} height={16} /><span>PDU complexo</span>
            </button>
            <button type="button" className={`toolbtn${netbotOpen ? ' is-active' : ''}`} onClick={() => setNetbotOpen((value) => !value)}>
              <BotIcon width={16} height={16} /><span>NETBOT</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="banner banner--bad" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Fechar">×</button>
        </div>
      )}

      {lab && (
        <div className="banner banner--lab">
          <span>
            <strong>{lab.title}</strong> — {lab.objective}
          </span>
          <span className="row">
            <button type="button" className="btn btn--tiny" onClick={() => setLabInfoOpen(true)}>Instruções</button>
            <button type="button" className="btn btn--tiny btn--primary" onClick={verifyLab} disabled={labBusy}>
              {labBusy ? 'A avaliar…' : 'Verificar exercício'}
            </button>
          </span>
        </div>
      )}

      <div className="sim__body">
        <aside
          className={`palette${paletteOpen ? ' palette--open' : ''}${paletteHidden ? ' palette--hidden' : ''}`}
          aria-label="Biblioteca de equipamentos"
        >
          <header className="palette__head">
            <h2>Equipamentos</h2>
            <button
              type="button"
              className="icon-btn palette__close"
              onClick={() => {
                setPaletteOpen(false)
                setPaletteHidden(true)
              }}
              aria-label="Fechar biblioteca"
            >
              <CloseIcon width={16} height={16} />
            </button>
          </header>
          <p className="palette__hint">Escolha um equipamento e clique no mapa para o colocar.</p>
          {DEVICE_GROUPS.map((group) => (
            <section key={group.title} className="palette__group">
              <h3>{group.title}</h3>
              <ul>
                {group.types.map((type) => {
                  const Icon = DEVICE_ICONS[type]
                  const model = DEVICE_CATALOG[type]
                  return (
                    <li key={type}>
                      <button
                        type="button"
                        className={`palette__item${placeType === type && mode === 'place' ? ' is-active' : ''}`}
                        onClick={() => {
                          setPlaceType(type)
                          setMode('place')
                          setTool('select')
                          setConnectFrom(null)
                          setPaletteOpen(false)
                        }}
                        title={`${model.description} · ${model.ports.length} porta(s)`}
                      >
                        <span className={`palette__icon palette__icon--${model.category}`}><Icon width={20} height={20} /></span>
                        <span className="palette__meta">
                          <strong>{model.label}</strong>
                          <small>{model.model} · {model.ports.length} porta(s)</small>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </aside>

        <div className="sim__center">
          <div className="sim__hint">
            <span>{hint}</span>
            <button
              type="button"
              className="btn btn--tiny sim__palettebtn"
              onClick={() => {
                setPaletteHidden(false)
                setPaletteOpen(true)
              }}
            >
              Equipamentos
            </button>
          </div>

          {loading ? (
            <Spinner label="A carregar laboratório…" />
          ) : (
            <Workspace
              devices={topology.devices}
              links={topology.links}
              annotations={topology.annotations}
              mode={mode === 'simulate' ? 'simulate' : mode}
              tool={tool}
              selectedId={selectedId}
              selectedLinkId={selectedLinkId}
              selectedAnnotationId={selectedAnnotationId}
              connectFrom={connectFrom ? { id: connectFrom.device.id } : null}
              activeHopId={simResult?.ok ? simResult.path[simStep] : null}
              pduFrom={mode === 'pdu' ? pduFrom : null} pduTo={mode === 'pdu' ? pduTo : null}
              packet={
                simResult?.ok && simResult.path[simStep]
                  ? (() => {
                      const device = topology.devices.find((entry) => entry.id === simResult.path[simStep])
                      if (!device) return null
                      return {
                        x: device.x,
                        y: device.y,
                        label: `${simResult?.packet?.protocol ?? (simMode === 'ping' ? 'ICMP' : 'Rota')} · ${device.name}`,
                        onClick: () => setPacketOpen(true),
                      }
                    })()
                  : null
              }
              zoom={zoom}
              pan={pan}
              onZoomPanChange={(nextZoom, nextPan) => {
                setZoom(nextZoom)
                setPan(nextPan)
              }}
              onCanvasTap={handleCanvasTap}
              onDeviceTap={handleDeviceTap}
              onDeviceOpen={(device) => setConfigId(device.id)}
              onDeviceMove={moveDevice}
              onLinkTap={(id) => {
                if (tool === 'erase') {
                  deleteLink(id)
                  return
                }
                setSelectedLinkId(id)
                setSelectedId(null)
                setSelectedAnnotationId(null)
              }}
              onAnnotationTap={(id) => {
                if (tool === 'erase') {
                  deleteAnnotation(id)
                  return
                }
                setSelectedAnnotationId(id)
                setSelectedId(null)
                setSelectedLinkId(null)
              }}
              onAnnotationMove={moveAnnotation}
            />
          )}

          {selectedDevice && (
            <div className="selbar" role="toolbar" aria-label={`Ações para ${selectedDevice.name}`}>
              <span className={`selbar__icon selbar__icon--${categoryOf(selectedDevice.type)}`}>
                {(() => {
                  const Icon = DEVICE_ICONS[selectedDevice.type]
                  return <Icon width={18} height={18} />
                })()}
              </span>
              <div className="selbar__meta">
                <strong>{selectedDevice.name}</strong>
                <small>{labelOf(selectedDevice.type)} · {formatIp(selectedDevice) ?? 'sem IP'}</small>
              </div>
              <button type="button" className="btn btn--tiny btn--primary" onClick={() => setConfigId(selectedDevice.id)}>
                Configurar
              </button>
              <button type="button" className="btn btn--tiny" onClick={() => duplicateDevice(selectedDevice)}>
                <CopyIcon width={14} height={14} /> Duplicar
              </button>
              <button type="button" className="btn btn--tiny" onClick={() => { setMode('connect'); setTool('select'); setConnectFrom(null) }}>
                <CableIcon width={14} height={14} /> Ligar
              </button>
              <button type="button" className="btn btn--tiny btn--danger" onClick={() => deleteDevice(selectedDevice)}>
                <TrashIcon width={14} height={14} /> Eliminar
              </button>
            </div>
          )}

          {selectedLink && (
            <div className="selbar selbar--cable" role="dialog" aria-label="Ligação selecionada">
              {(() => {
                const a = topology.devices.find((device) => device.id === selectedLink.a_id)
                const b = topology.devices.find((device) => device.id === selectedLink.b_id)
                return (
                  <>
                    <div className="selbar__meta">
                      <strong>{cableInfo(selectedLink.cable).label}</strong>
                      <small>
                        {a?.name}:{selectedLink.a_port} ↔ {b?.name}:{selectedLink.b_port}
                      </small>
                    </div>
                    <label className="cableselect">
                      <span className="visually-hidden">Alterar tipo de cabo</span>
                      <select value={selectedLink.cable} onChange={(event) => changeCable(selectedLink.id, event.target.value)}>
                        {Object.entries(CABLE_TYPES).map(([key, value]) => (
                          <option key={key} value={key}>{value.label}</option>
                        ))}
                      </select>
                    </label>
                    <button type="button" className="btn btn--tiny btn--danger" onClick={() => deleteLink(selectedLink.id)}>
                      Remover cabo
                    </button>
                    <button type="button" className="icon-btn" onClick={() => setSelectedLinkId(null)} aria-label="Fechar">×</button>
                  </>
                )
              })()}
            </div>
          )}

          {selectedAnnotation && (
            <div className="selbar" role="toolbar" aria-label="Anotação selecionada">
              <div className="selbar__meta">
                <strong>Anotação</strong>
                <small>{selectedAnnotation.text}</small>
              </div>
              <button type="button" className="btn btn--tiny btn--danger" onClick={() => deleteAnnotation(selectedAnnotation.id)}>
                Eliminar
              </button>
              <button type="button" className="icon-btn" onClick={() => setSelectedAnnotationId(null)} aria-label="Fechar">×</button>
            </div>
          )}
        </div>

        <aside
          className={`sim__side${panelOpen || netbotOpen ? ' sim__side--open' : ''}${sideHidden ? ' sim__side--hidden' : ''}`}
          aria-label="Painel lateral"
        >
          <button
            type="button"
            className="icon-btn sim__sideclose"
            onClick={() => setSideHidden(true)}
            aria-label="Fechar painel lateral"
          >
            <CloseIcon width={16} height={16} />
          </button>
          {netbotOpen ? (
            <NetbotPanel
              projectId={projectId}
              selectedDevice={selectedDevice}
              onApply={applyNetbotActions}
              onClose={() => setNetbotOpen(false)}
            />
          ) : mode === 'simulate' ? (
            <SimulationPanel
              devices={topology.devices}
              links={topology.links}
              result={simResult}
              mode={simMode}
              setMode={setSimMode}
              fromId={simFrom}
              toId={simTo}
              setFromId={setSimFrom}
              setToId={setSimTo}
              onRun={runSimulation}
              busy={simBusy}
              step={simStep}
              setStep={setSimStep}
              playing={simPlaying}
              setPlaying={setSimPlaying}
              speed={simSpeed}
              setSpeed={setSimSpeed}
              onRestart={resetSimulation}
              packetOpen={packetOpen}
              setPacketOpen={setPacketOpen}
            />
          ) : mode === 'pdu' ? (
            <PduPanel
              devices={topology.devices}
              kind={pduKind}
              setKind={(next) => {
                setPduKind(next)
                setPduResult(null)
                setSimResult(null)
              }}
              fromId={pduFrom}
              toId={pduTo}
              setFromId={setPduFrom}
              setToId={setPduTo}
              form={pduForm}
              setForm={setPduForm}
              result={pduResult}
              busy={pduBusy}
              onSend={() => sendPdu()}
              onClose={() => {
                setMode('select')
                setPanelOpen(false)
                setPduResult(null)
                setSimResult(null)
              }}
            />
          ) : (
            <div className="simp">
              <header className="simp__head">
                <div>
                  <p className="eyebrow">Laboratório</p>
                  <h2>{project?.name}</h2>
                </div>
                <span className="tag">{topology.devices.length} disp.</span>
              </header>
              <p className="muted">{project?.description || 'Sem descrição.'}</p>
              <dl className="details details--compact">
                <div><dt>Modo</dt><dd>{mode === 'connect' ? 'Ligação' : mode === 'place' ? 'Colocação' : 'Tempo real'}</dd></div>
                <div><dt>Equipamento selecionado</dt><dd>{selectedDevice?.name ?? '—'}</dd></div>
                <div><dt>Estado do projeto</dt><dd>{saving ? 'A guardar…' : 'Guardado'}</dd></div>
                <div><dt>Exercício</dt><dd>{lab ? lab.title : 'Nenhum'}</dd></div>
              </dl>
              <div className="panel panel--tight">
                <h3>Teste rápido</h3>
                <p className="muted small">Escolha origem e destino e execute um ping a partir do centro de simulação.</p>
                <button
                  type="button"
                  className="btn btn--primary btn--tiny"
                  onClick={() => {
                    setMode('simulate')
                    setPanelOpen(true)
                  }}
                >
                  Abrir centro de simulação
                </button>
              </div>
              {lab && (
                <div className="panel panel--tight">
                  <h3>Progresso do exercício</h3>
                  {evaluation ? (
                    <>
                      <p className="scoreline">
                        <strong>{evaluation.score.toFixed(1)}</strong> / {evaluation.maxScore} valores
                      </p>
                      <ProgressBar value={evaluation.percentage} label="Progresso do exercício" />
                      <button type="button" className="btn btn--tiny" onClick={verifyLab} disabled={labBusy}>
                        Avaliar novamente
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn--primary btn--tiny" onClick={verifyLab} disabled={labBusy}>
                      {labBusy ? 'A avaliar…' : 'Avaliar agora'}
                    </button>
                  )}
                </div>
              )}
              <button type="button" className="btn btn--tiny sim__panelclose" onClick={() => setPanelOpen(false)}>
                Fechar painel
              </button>
            </div>
          )}
        </aside>
      </div>

      {configDevice && (
        <DeviceDialog
          device={configDevice}
          devices={topology.devices}
          links={topology.links}
          projectId={projectId}
          onClose={() => setConfigId(null)}
          onSave={handleSaveDevice}
          onDuplicate={duplicateDevice}
          onDelete={deleteDevice}
          onDhcp={handleDhcp}
          onRefresh={refreshTopology}
        />
      )}

      {portPicker && (
        <PortPicker
          device={portPicker.device}
          cable={portPicker.cable}
          links={topology.links}
          onPick={pickPort}
          onClose={() => {
            setPortPicker(null)
            setConnectFrom(null)
          }}
        />
      )}

      {noteDraft && (
        <Modal
          title="Nova anotação"
          subtitle="Escreva um texto para documentar a área de trabalho."
          onClose={() => setNoteDraft(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setNoteDraft(null)}>Cancelar</button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={async () => {
                  const text = noteDraft.text.trim()
                  if (!text) return
                  const draft = noteDraft
                  setNoteDraft(null)
                  await addAnnotation(text, draft)
                }}
              >
                Adicionar
              </button>
            </>
          }
        >
          <label className="field">
            <span className="field__label">Texto</span>
            <input
              className="field__input"
              value={noteDraft.text}
              onChange={(event) => setNoteDraft((previous) => ({ ...previous, text: event.target.value }))}
              placeholder="Rede do Departamento de Informática"
              maxLength={160}
              autoFocus
            />
          </label>
        </Modal>
      )}

      {openDialog && (
        <Modal
          title="Abrir projeto"
          subtitle="Continue um laboratório existente."
          onClose={() => setOpenDialog(false)}
          footer={
            <button
              type="button"
              className="btn btn--primary"
              onClick={async () => {
                const data = await api.createProject({ name: 'Novo laboratório' })
                navigate(`/simulador/${data.project.id}`)
                setOpenDialog(false)
              }}
            >
              Criar novo laboratório
            </button>
          }
        >
          {!projects ? (
            <Spinner label="A carregar…" />
          ) : (
            <ul className="list">
              {projects.map((entry) => (
                <li key={entry.id} className="list__row">
                  <span>
                    <strong>{entry.name}</strong>
                    <small className="muted"> · {entry.device_count} equipamentos</small>
                  </span>
                  <button
                    type="button"
                    className="btn btn--tiny btn--primary"
                    onClick={() => {
                      setOpenDialog(false)
                      navigate(`/simulador/${entry.id}`)
                    }}
                  >
                    Abrir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {labInfoOpen && lab && (
        <Modal title={lab.title} subtitle={lab.objective} onClose={() => setLabInfoOpen(false)}>
          <p className="muted">{lab.brief}</p>
          <h3>Passos</h3>
          <ol className="steps">
            {(lab.instructions ?? []).map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </Modal>
      )}

      {evaluation && (
        <Modal
          title={`Avaliação — ${evaluation.score.toFixed(1)} / ${evaluation.maxScore}`}
          subtitle={`${evaluation.percentage}% dos critérios cumpridos`}
          onClose={() => setEvaluation(null)}
        >
          <ProgressBar value={evaluation.percentage} />
          <ul className="checklist">
            {evaluation.checks.map((check, index) => (
              <li key={index} className={check.passed ? 'is-ok' : 'is-bad'}>
                <span className="checklist__mark">{check.passed ? <CheckIcon width={14} height={14} /> : '×'}</span>
                <span>
                  <strong>{check.label}</strong>
                  <small>{check.detail}</small>
                </span>
              </li>
            ))}
          </ul>
          {evaluation.recommendations.length > 0 && (
            <>
              <h3>Recomendações</h3>
              <ul className="list list--plain">
                {evaluation.recommendations.map((advice, index) => (
                  <li key={index}>{advice}</li>
                ))}
              </ul>
            </>
          )}
        </Modal>
      )}

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  )
}
