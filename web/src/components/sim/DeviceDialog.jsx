import { useEffect, useMemo, useState } from 'react'
import { categoryOf, labelOf, DEVICE_CATALOG } from '../../lib/catalog.js'
import { Modal, Toast } from '../ui.jsx'
import { DesktopTab, InterfacesTab, MacTab, RoutesTab, ServicesTab, VlansTab, WirelessTab } from './DeviceConfigTabs.jsx'
import TerminalTab from './TerminalTab.jsx'
import BrowserTab from './BrowserTab.jsx'

const tabsFor = (device) => {
  const category = categoryOf(device.type)
  if (device.type === 'server') return ['services', 'desktop', 'interfaces', 'terminal', 'browser']
  if (category === 'end') return ['desktop', 'terminal', 'browser']
  if (device.type === 'access_point') return ['wireless', 'interfaces', 'terminal']
  if (['switch', 'multilayer_switch'].includes(device.type)) return ['interfaces', 'vlans', 'mac', 'terminal']
  if (category === 'router') {
    const tabs = ['interfaces', 'routes', 'terminal']
    if (device.type === 'wireless_router') tabs.splice(2, 0, 'wireless')
    return tabs
  }
  return ['interfaces']
}

const TAB_LABELS = {
  desktop: 'Desktop',
  interfaces: 'Interfaces',
  vlans: 'VLANs',
  mac: 'Tabela MAC',
  routes: 'Rotas',
  services: 'Serviços',
  wireless: 'Wireless',
  terminal: 'Terminal',
  browser: 'Navegador',
}

export default function DeviceDialog({
  device,
  devices,
  links,
  projectId,
  onClose,
  onSave,
  onDuplicate,
  onDelete,
  onDhcp,
  onRefresh,
}) {
  const tabs = useMemo(() => tabsFor(device), [device])
  const [tab, setTab] = useState(tabs[0])
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(device.config ?? {})))
  const [name, setName] = useState(device.name)
  const [powered, setPowered] = useState(device.powered !== false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [dhcpLog, setDhcpLog] = useState(null)

  const model = DEVICE_CATALOG[device.type]
  const configKey = JSON.stringify(device.config ?? {})

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(device.config ?? {})))
  }, [configKey])

  async function save() {
    setBusy('save')
    setError('')
    try {
      await onSave({ name: name.trim(), powered, config: draft })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function handleDhcp() {
    setBusy('dhcp')
    setError('')
    setDhcpLog(null)
    try {
      const result = await onDhcp()
      setDhcpLog(result.events ?? [])
      if (result.ok && result.config) {
        setDraft(result.config)
        setToast({ message: result.summary, tone: 'ok' })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <Modal
      title={`${device.name} · ${labelOf(device.type)}`}
      subtitle={`${model?.model ?? 'modelo NL'} · ${categoryOf(device.type) === 'end' ? 'dispositivo final' : categoryOf(device.type) === 'router' ? 'equipamento de camada 3' : 'equipamento de camada 2'}`}
      onClose={onClose}
      wide
      footer={
        <div className="dialog__foot">
          <div className="row">
            <button type="button" className="btn btn--ghost" onClick={() => onDuplicate(device)}>
              Duplicar
            </button>
            <button type="button" className="btn btn--danger" onClick={() => onDelete(device)}>
              Eliminar
            </button>
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" onClick={save} disabled={busy === 'save'}>
              {busy === 'save' ? 'A guardar…' : 'Guardar configuração'}
            </button>
          </div>
        </div>
      }
    >
      <div className="dialog__identity">
        <label className="field">
          <span className="field__label">Nome do equipamento</span>
          <input className="field__input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="switch">
          <input type="checkbox" checked={powered} onChange={(event) => setPowered(event.target.checked)} />
          <span>Equipamento ligado</span>
        </label>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="tabs" role="tablist">
        {tabs.map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={tab === entry}
            className={`tabs__tab${tab === entry ? ' tabs__tab--active' : ''}`}
            onClick={() => setTab(entry)}
          >
            {TAB_LABELS[entry]}
          </button>
        ))}
      </div>

      <div className="tabcontent">
        {tab === 'desktop' && (
          <DesktopTab draft={draft} setDraft={setDraft} device={device} onDhcp={handleDhcp} busy={busy === 'dhcp'} dhcpLog={dhcpLog} />
        )}
        {tab === 'interfaces' && (
          <InterfacesTab draft={draft} setDraft={setDraft} device={device} links={links} />
        )}
        {tab === 'vlans' && <VlansTab draft={draft} setDraft={setDraft} device={device} />}
        {tab === 'mac' && <MacTab device={device} draft={draft} links={links} devices={devices} />}
        {tab === 'routes' && <RoutesTab draft={draft} setDraft={setDraft} device={device} />}
        {tab === 'services' && <ServicesTab draft={draft} setDraft={setDraft} />}
        {tab === 'wireless' && <WirelessTab draft={draft} setDraft={setDraft} device={device} />}
        {tab === 'terminal' && (
          <TerminalTab projectId={projectId} device={device} onConfigChanged={onRefresh} />
        )}
        {tab === 'browser' && <BrowserTab projectId={projectId} device={device} />}
      </div>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </Modal>
  )
}
