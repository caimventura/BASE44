import { useMemo, useState } from 'react'
import { categoryOf, labelOf, portLabel } from '../../lib/catalog.js'
import { describeSubnet, freePorts, isValidIpv4, isValidMask, macOf, maskError, maskFromPrefix, networkOf, parseMaskInput, prefixOf } from '../../lib/topology.js'

const updateIface = (setDraft) => (name, patch) =>
  setDraft((draft) => ({
    ...draft,
    interfaces: draft.interfaces.map((iface) => (iface.name === name ? { ...iface, ...patch } : iface)),
  }))

function IpField({ label, value, onChange, placeholder, error, disabled }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className={`field__input${error ? ' field__input--error' : ''}`}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
        autoComplete="off"
        spellCheck="false"
        disabled={disabled}
      />
      {error && <span className="field__error">{error}</span>}
    </label>
  )
}

const COMMON_PREFIXES = [8, 16, 24, 25, 26, 27, 28, 29, 30]

function MaskField({ label = 'Máscara de sub-rede', value, onChange, ip, disabled }) {
  const error = value ? maskError(value) : ''
  const prefix = value && !error ? prefixOf(value) : null
  const preview = ip && !error ? describeSubnet(ip, value) : ''
  return (
    <div className="field maskfield">
      <span className="field__label">{label}</span>
      <div className="maskfield__row">
        <input
          className={`field__input${error ? ' field__input--error' : ''}`}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder="255.255.255.0"
          inputMode="decimal"
          autoComplete="off"
          spellCheck="false"
          disabled={disabled}
          aria-label={label}
        />
        <select
          className="field__input maskfield__select"
          value={prefix ?? ''}
          onChange={(event) => {
            const next = event.target.value
            onChange(next === '' ? '' : maskFromPrefix(Number(next)))
          }}
          disabled={disabled}
          aria-label="Prefixo CIDR"
        >
          <option value="">/—</option>
          {COMMON_PREFIXES.map((entry) => (
            <option key={entry} value={entry}>/{entry}</option>
          ))}
        </select>
      </div>
      {error && <span className="field__error">{error}</span>}
      {!error && preview && <span className="field__hint">{preview}</span>}
      {!error && !preview && <span className="field__hint">Pode escrever 255.255.255.0 ou apenas /24.</span>}
    </div>
  )
}

export function DesktopTab({ draft, setDraft, device, onDhcp, busy, dhcpLog }) {
  const iface = draft.interfaces.find((entry) => entry.wireless && entry.ip) ?? draft.interfaces[0] ?? {}
  const set = updateIface(setDraft)

  const ipError = iface.ip && !isValidIpv4(iface.ip) ? 'Endereço IPv4 inválido: usa quatro números entre 0 e 255.' : ''
  const gatewayError = iface.gateway && !isValidIpv4(iface.gateway) ? 'Gateway inválido.' : ''
  const gatewayOutside =
    iface.gateway && iface.ip && isValidIpv4(iface.gateway) && isValidMask(iface.mask) &&
    networkOf(iface.ip, iface.mask) !== networkOf(iface.gateway, iface.mask)
      ? 'O gateway deve estar na mesma sub-rede do computador.'
      : ''

  return (
    <div className="tabpane">
      <section className="panel">
        <h3>Configuração IP</h3>
        <p className="muted">Interface {iface.name} · {labelOf(device.type)}</p>
        <div className="grid grid--2">
          <IpField
            label="Endereço IPv4"
            value={iface.ip}
            onChange={(value) => set(iface.name, { ip: value })}
            placeholder="192.168.1.10"
            error={ipError}
          />
          <MaskField
            value={iface.mask}
            onChange={(value) => set(iface.name, { mask: parseMaskInput(value).mask })}
            ip={iface.ip}
          />
        </div>
        <IpField
          label="Gateway padrão"
          value={iface.gateway}
          onChange={(value) => set(iface.name, { gateway: value })}
          placeholder="192.168.1.1 (opcional na mesma sub-rede)"
          error={gatewayError || gatewayOutside}
        />
        <div className="grid grid--2">
          <IpField
            label="DNS primário"
            value={draft.dns}
            onChange={(value) => setDraft((previous) => ({ ...previous, dns: value }))}
            placeholder="8.8.8.8"
            error={draft.dns && !isValidIpv4(draft.dns) ? 'DNS inválido.' : ''}
          />
          <IpField
            label="DNS secundário"
            value={draft.dns2}
            onChange={(value) => setDraft((previous) => ({ ...previous, dns2: value }))}
            placeholder="1.1.1.1 (opcional)"
            error={draft.dns2 && !isValidIpv4(draft.dns2) ? 'DNS inválido.' : ''}
          />
        </div>
        <p className="small muted">
          O gateway só é necessário para comunicar com outras redes. Dentro da mesma sub-rede pode ficar vazio.
        </p>
      </section>

      <section className="panel">
        <h3>Endereçamento automático</h3>
        <p className="muted">
          Obtém um endereço de um servidor DHCP ligado ao mesmo segmento (processo DORA).
        </p>
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={onDhcp} disabled={busy}>
            {busy ? 'A pedir endereço…' : iface.dhcp ? 'Renovar endereço DHCP' : 'Obter IP por DHCP'}
          </button>
          <span className={`tag ${iface.dhcp ? 'tag--ok' : ''}`}>
            {iface.dhcp ? 'DHCP ativo' : 'IP estático'}
          </span>
        </div>
      </section>
    </div>
  )
}

export function InterfacesTab({ draft, setDraft, device, links, devices = [] }) {
  const set = updateIface(setDraft)
  const peerOf = (portName) => {
    const link = links.find(
      (entry) =>
        (entry.a_id === device.id && entry.a_port === portName) ||
        (entry.b_id === device.id && entry.b_port === portName)
    )
    return link ? link : null
  }
  const peerDetails = (link) => {
    if (!link) return null
    const peerId = link.a_id === device.id ? link.b_id : link.a_id
    const peerPort = link.a_id === device.id ? link.b_port : link.a_port
    const peer = devices.find((entry) => entry.id === peerId)
    return { peer, peerPort }
  }
  const activeCount = draft.interfaces.filter((iface) => iface.status !== 'down').length
  const supportsVlan = ['switch', 'multilayer_switch'].includes(device.type)
  const supportsIp = categoryOf(device.type) !== 'end'

  return (
    <div className="tabpane">
      <section className="panel">
        <h3>Interfaces</h3>
        <p className="muted">
          {activeCount} ativas de {draft.interfaces.length}. Nomenclatura Cisco: FastEthernet, GigabitEthernet e Wireless.
        </p>
        <div className="ifaces">
          {draft.interfaces.map((iface) => {
            const connected = peerOf(iface.name)
            const peer = peerDetails(connected)
            return (
              <article key={iface.name} className={`iface${iface.status === 'down' ? ' iface--down' : ''}`}>
                <header className="iface__head">
                  <span className="iface__title">
                    <span className={`led ${iface.status === 'down' ? 'led--down' : connected ? 'led--up' : 'led--idle'}`} aria-hidden="true" />
                    <strong>{portLabel(device.type, iface.name)}</strong>
                    <small className="iface__short">{iface.name}</small>
                  </span>
                  <span className={`tag ${iface.status === 'down' ? 'tag--off' : 'tag--ok'}`}>
                    {iface.status === 'down' ? 'admin down' : 'up'}
                  </span>
                </header>
                <p className="iface__link">
                  {peer?.peer
                    ? `Ligada a ${peer.peer.name} · ${portLabel(peer.peer.type, peer.peerPort)} (${connected.cable})`
                    : 'Sem cabo ligado'}
                  <span className="iface__mac">MAC {macOf(device.id, iface.name)}</span>
                </p>
                <div className="iface__grid">
                  {supportsIp && (
                    <>
                      <label className="field">
                        <span className="field__label">IP</span>
                        <input
                          className="field__input"
                          value={iface.ip ?? ''}
                          onChange={(event) => set(iface.name, { ip: event.target.value })}
                          placeholder="192.168.1.1"
                          inputMode="decimal"
                        />
                      </label>
                      <label className="field">
                        <span className="field__label">Máscara</span>
                        <input
                          className="field__input"
                          value={iface.mask ?? ''}
                          onChange={(event) => set(iface.name, { mask: event.target.value })}
                          placeholder="255.255.255.0"
                          inputMode="decimal"
                        />
                      </label>
                    </>
                  )}
                  {supportsVlan && (
                    <>
                      <label className="field">
                        <span className="field__label">Modo</span>
                        <select
                          className="field__input"
                          value={iface.mode ?? 'access'}
                          onChange={(event) => set(iface.name, { mode: event.target.value })}
                        >
                          <option value="access">access</option>
                          <option value="trunk">trunk</option>
                        </select>
                      </label>
                      {iface.mode === 'trunk' ? (
                        <label className="field">
                          <span className="field__label">VLANs permitidas</span>
                          <input
                            className="field__input"
                            value={iface.trunkVlans ?? ''}
                            onChange={(event) => set(iface.name, { trunkVlans: event.target.value })}
                            placeholder="10,20 ou all"
                          />
                        </label>
                      ) : (
                        <label className="field">
                          <span className="field__label">VLAN</span>
                          <select
                            className="field__input"
                            value={iface.vlan ?? 1}
                            onChange={(event) => set(iface.name, { vlan: Number(event.target.value) })}
                          >
                            {draft.vlans.map((vlan) => (
                              <option key={vlan.id} value={vlan.id}>
                                {vlan.id} — {vlan.name || 'sem nome'}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </>
                  )}
                  {!iface.wireless && (
                    <>
                      <label className="field">
                        <span className="field__label">Velocidade</span>
                        <select
                          className="field__input"
                          value={iface.speed ?? 'auto'}
                          onChange={(event) => set(iface.name, { speed: event.target.value })}
                        >
                          <option value="auto">auto</option>
                          <option value="10">10 Mbps</option>
                          <option value="100">100 Mbps</option>
                          <option value="1000">1 Gbps</option>
                        </select>
                      </label>
                      <label className="field">
                        <span className="field__label">Duplex</span>
                        <select
                          className="field__input"
                          value={iface.duplex ?? 'auto'}
                          onChange={(event) => set(iface.name, { duplex: event.target.value })}
                        >
                          <option value="auto">auto</option>
                          <option value="full">full</option>
                          <option value="half">half</option>
                        </select>
                      </label>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className={`btn btn--tiny ${iface.status === 'down' ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => set(iface.name, { status: iface.status === 'down' ? 'up' : 'down' })}
                >
                  {iface.status === 'down' ? 'no shutdown' : 'shutdown'}
                </button>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export function VlansTab({ draft, setDraft, device }) {
  const [newVlan, setNewVlan] = useState({ id: '', name: '' })
  const portsByVlan = useMemo(() => {
    const map = new Map()
    for (const iface of draft.interfaces) {
      if (iface.mode === 'trunk') continue
      const vlan = Number(iface.vlan ?? 1)
      map.set(vlan, [...(map.get(vlan) ?? []), iface.name])
    }
    return map
  }, [draft.interfaces])

  const addVlan = () => {
    const id = Number(newVlan.id)
    if (!Number.isInteger(id) || id < 1 || id > 4094) return
    if (draft.vlans.some((vlan) => Number(vlan.id) === id)) return
    setDraft((previous) => ({
      ...previous,
      vlans: [...previous.vlans, { id, name: newVlan.name || `VLAN${id}` }],
    }))
    setNewVlan({ id: '', name: '' })
  }

  return (
    <div className="tabpane">
      <section className="panel">
        <h3>VLANs</h3>
        <p className="muted">Separe departamentos em redes lógicas independentes dentro do switch.</p>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Portas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {draft.vlans.map((vlan) => (
              <tr key={vlan.id}>
                <td>{vlan.id}</td>
                <td>
                  <input
                    className="field__input field__input--inline"
                    value={vlan.name ?? ''}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        vlans: previous.vlans.map((entry) =>
                          Number(entry.id) === Number(vlan.id)
                            ? { ...entry, name: event.target.value }
                            : entry
                        ),
                      }))
                    }
                  />
                </td>
                <td>{(portsByVlan.get(Number(vlan.id)) ?? []).join(', ') || '—'}</td>
                <td>
                  {Number(vlan.id) !== 1 && (
                    <button
                      type="button"
                      className="btn btn--tiny btn--danger"
                      onClick={() =>
                        setDraft((previous) => ({
                          ...previous,
                          vlans: previous.vlans.filter((entry) => Number(entry.id) !== Number(vlan.id)),
                          interfaces: previous.interfaces.map((iface) =>
                            Number(iface.vlan) === Number(vlan.id) ? { ...iface, vlan: 1 } : iface
                          ),
                        }))
                      }
                    >
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Nova VLAN</h3>
        <div className="row row--end">
          <label className="field field--small">
            <span className="field__label">ID</span>
            <input
              className="field__input"
              value={newVlan.id}
              onChange={(event) => setNewVlan((previous) => ({ ...previous, id: event.target.value }))}
              placeholder="10"
              inputMode="numeric"
            />
          </label>
          <label className="field">
            <span className="field__label">Nome</span>
            <input
              className="field__input"
              value={newVlan.name}
              onChange={(event) => setNewVlan((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="Financeiro"
            />
          </label>
          <button type="button" className="btn btn--primary" onClick={addVlan}>
            Adicionar VLAN
          </button>
        </div>
        <p className="muted">Depois de criar, atribua as portas na aba Interfaces.</p>
      </section>
    </div>
  )
}

export function RoutesTab({ draft, setDraft, device }) {
  const [route, setRoute] = useState({ network: '', mask: '', nextHop: '' })
  const [error, setError] = useState('')

  const add = () => {
    if (!isValidIpv4(route.network) || !isValidMask(route.mask) || !isValidIpv4(route.nextHop)) {
      setError('Indique rede, máscara e next-hop válidos.')
      return
    }
    if (draft.routes.some((entry) => entry.network === route.network && entry.mask === route.mask)) {
      setError('Já existe uma rota para essa rede.')
      return
    }
    setDraft((previous) => ({ ...previous, routes: [...previous.routes, { ...route }] }))
    setRoute({ network: '', mask: '', nextHop: '' })
    setError('')
  }

  return (
    <div className="tabpane">
      <section className="panel">
        <h3>Rotas estáticas</h3>
        <p className="muted">Sem rota para a rede remota, o router descarta o pacote.</p>
        {draft.routes.length === 0 ? (
          <p className="muted">Nenhuma rota estática configurada.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Rede</th><th>Máscara</th><th>Next-hop</th><th /></tr>
            </thead>
            <tbody>
              {draft.routes.map((entry, index) => (
                <tr key={`${entry.network}-${index}`}>
                  <td>{entry.network}</td>
                  <td>{entry.mask}</td>
                  <td>{entry.nextHop}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--tiny btn--danger"
                      onClick={() =>
                        setDraft((previous) => ({
                          ...previous,
                          routes: previous.routes.filter((_, position) => position !== index),
                        }))
                      }
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h3>Adicionar rota</h3>
        <div className="grid grid--3">
          <IpField label="Rede" value={route.network} onChange={(value) => setRoute((p) => ({ ...p, network: value }))} placeholder="10.0.0.0" />
          <IpField label="Máscara" value={route.mask} onChange={(value) => setRoute((p) => ({ ...p, mask: value }))} placeholder="255.255.255.0" />
          <IpField label="Next-hop" value={route.nextHop} onChange={(value) => setRoute((p) => ({ ...p, nextHop: value }))} placeholder="192.168.1.2" />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="button" className="btn btn--primary" onClick={add}>
          Adicionar rota
        </button>
      </section>

      <section className="panel">
        <h3>NAT</h3>
        <p className="muted">Defina o papel das interfaces (inside/outside) na aba Interfaces, na CLI.</p>
        <p className={draft.nat ? 'tag tag--ok' : 'tag'}>
          {draft.nat ? 'NAT configurado' : 'NAT não configurado'}
        </p>
      </section>

      <p className="muted small">Equipamento: {device.name}</p>
    </div>
  )
}

export function ServicesTab({ draft, setDraft }) {
  const [record, setRecord] = useState({ name: '', ip: '' })
  const [error, setError] = useState('')
  const services = [
    { key: 'dhcp', label: 'DHCP' },
    { key: 'dns', label: 'DNS' },
    { key: 'http', label: 'HTTP' },
    { key: 'https', label: 'HTTPS' },
    { key: 'ftp', label: 'FTP' },
    { key: 'email', label: 'E-mail' },
  ]

  const toggle = (key) =>
    setDraft((previous) => ({
      ...previous,
      services: {
        ...previous.services,
        [key]: { ...previous.services[key], enabled: !previous.services[key]?.enabled },
      },
    }))

  const pool = draft.services.dhcp.pool
  const setPool = (field, value) =>
    setDraft((previous) => ({
      ...previous,
      services: {
        ...previous.services,
        dhcp: { ...previous.services.dhcp, pool: { ...previous.services.dhcp.pool, [field]: value } },
      },
    }))

  const addRecord = () => {
    if (!record.name.trim() || !isValidIpv4(record.ip)) {
      setError('Indique o nome e um endereço IP válido.')
      return
    }
    setDraft((previous) => ({
      ...previous,
      services: {
        ...previous.services,
        dns: { ...previous.services.dns, records: [...previous.services.dns.records, { ...record }] },
      },
    }))
    setRecord({ name: '', ip: '' })
    setError('')
  }

  return (
    <div className="tabpane">
      <section className="panel">
        <h3>Serviços simulados</h3>
        <div className="services">
          {services.map((service) => {
            const active = Boolean(draft.services[service.key]?.enabled)
            return (
              <button
                key={service.key}
                type="button"
                className={`service${active ? ' service--on' : ''}`}
                onClick={() => toggle(service.key)}
                aria-pressed={active}
              >
                <span className="service__dot" aria-hidden="true" />
                <strong>{service.label}</strong>
                <small>{active ? 'Ativo' : 'Inativo'}</small>
              </button>
            )
          })}
        </div>
      </section>

      {draft.services.dhcp.enabled && (
        <section className="panel">
          <h3>Servidor DHCP</h3>
          <div className="grid grid--2">
            <IpField
              label="Nome do pool"
              value={pool.name}
              onChange={(value) => setPool('name', value)}
              placeholder="Pool da sala"
            />
            <IpField label="Rede" value={pool.network} onChange={(value) => setPool('network', value)} placeholder="192.168.1.0" />
            <MaskField
              value={pool.mask}
              onChange={(value) => setPool('mask', parseMaskInput(value).mask)}
              ip={pool.start}
            />
            <IpField label="Primeiro endereço" value={pool.start} onChange={(value) => setPool('start', value)} placeholder="192.168.1.100" />
            <IpField
              label="Número máximo de clientes"
              value={pool.maxClients}
              onChange={(value) => {
                const count = Number(String(value).replace(/\D/g, '')) || 0
                setPool('maxClients', value)
                if (count > 0 && isValidIpv4(pool.start)) {
                  const start = pool.start.split('.').map(Number)
                  const end = start[3] + count - 1
                  setPool('end', `${start[0]}.${start[1]}.${start[2]}.${Math.min(254, end)}`)
                }
              }}
              placeholder="50"
            />
            <IpField label="Último endereço (calculado)" value={pool.end} onChange={(value) => setPool('end', value)} placeholder="192.168.1.149" />
            <IpField label="Gateway" value={pool.gateway} onChange={(value) => setPool('gateway', value)} placeholder="192.168.1.1" />
            <IpField label="DNS" value={pool.dns} onChange={(value) => setPool('dns', value)} placeholder="8.8.8.8" />
          </div>
          {isValidIpv4(pool.start) && isValidIpv4(pool.end) && (
            <p className="small muted">O servidor entrega endereços de {pool.start} a {pool.end} (processo DORA).</p>
          )}
        </section>
      )}

      {draft.services.dns.enabled && (
        <section className="panel">
          <h3>Registos DNS</h3>
          {draft.services.dns.records.length === 0 ? (
            <p className="muted">Ainda não há nomes registados.</p>
          ) : (
            <ul className="list">
              {draft.services.dns.records.map((entry, index) => (
                <li key={`${entry.name}-${index}`} className="list__row">
                  <span>
                    <strong>{entry.name}</strong> → {entry.ip}
                  </span>
                  <button
                    type="button"
                    className="btn btn--tiny btn--danger"
                    onClick={() =>
                      setDraft((previous) => ({
                        ...previous,
                        services: {
                          ...previous.services,
                          dns: {
                            ...previous.services.dns,
                            records: previous.services.dns.records.filter((_, position) => position !== index),
                          },
                        },
                      }))
                    }
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="row">
            <label className="field">
              <span className="field__label">Nome</span>
              <input
                className="field__input"
                value={record.name}
                onChange={(event) => setRecord((previous) => ({ ...previous, name: event.target.value }))}
                placeholder="www.netlab.local"
              />
            </label>
            <label className="field">
              <span className="field__label">Endereço IP</span>
              <input
                className="field__input"
                value={record.ip}
                onChange={(event) => setRecord((previous) => ({ ...previous, ip: event.target.value }))}
                placeholder="192.168.1.10"
                inputMode="decimal"
              />
            </label>
            <button type="button" className="btn" onClick={addRecord}>
              Adicionar registo
            </button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      )}
    </div>
  )
}

export function WirelessTab({ draft, setDraft, device }) {
  const wireless = draft.wireless
  const set = (field, value) =>
    setDraft((previous) => ({ ...previous, wireless: { ...previous.wireless, [field]: value } }))

  return (
    <div className="tabpane">
      <section className="panel">
        <h3>Rede sem fios</h3>
        <p className="muted">
          {device.type === 'access_point' || device.type === 'wireless_router'
            ? 'Configure o SSID para que os dispositivos wireless se possam associar.'
            : 'Configuração do módulo wireless deste equipamento.'}
        </p>
        <label className="field">
          <span className="field__label">SSID (nome da rede)</span>
          <input
            className="field__input"
            value={wireless.ssid}
            onChange={(event) => set('ssid', event.target.value)}
            placeholder="NETLAB-ACADEMY"
          />
        </label>
        <div className="grid grid--2">
          <label className="field">
            <span className="field__label">Segurança</span>
            <select
              className="field__input"
              value={wireless.security}
              onChange={(event) => set('security', event.target.value)}
            >
              <option value="wpa2">WPA2</option>
              <option value="wpa3">WPA3</option>
              <option value="open">Aberta</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Canal</span>
            <select
              className="field__input"
              value={wireless.channel}
              onChange={(event) => set('channel', Number(event.target.value))}
            >
              {[1, 6, 11, 36, 44, 48].map((channel) => (
                <option key={channel} value={channel}>{channel}</option>
              ))}
            </select>
          </label>
        </div>
        {wireless.security !== 'open' && (
          <label className="field">
            <span className="field__label">Palavra-passe</span>
            <input
              className="field__input"
              type="password"
              value={wireless.password}
              onChange={(event) => set('password', event.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
            {wireless.password && wireless.password.length < 8 && (
              <span className="field__error">A palavra-passe deve ter pelo menos 8 caracteres.</span>
            )}
          </label>
        )}
        {!wireless.ssid && <p className="form-warn">Sem SSID, nenhum cliente se pode associar a esta rede.</p>}
      </section>
    </div>
  )
}

export function MacTab({ device, draft, links, devices }) {
  const rows = []
  for (const link of links) {
    const isA = link.a_id === device.id
    const peerId = isA ? link.b_id : link.a_id
    const port = isA ? link.a_port : link.b_port
    const peer = devices.find((entry) => entry.id === peerId)
    if (!peer) continue
    const iface = draft.interfaces.find((entry) => entry.name === port)
    rows.push({
      port,
      peer: peer.name,
      mac: macOf(peer.id, peer.config?.interfaces?.[0]?.name ?? 'Eth0'),
      vlan: iface?.mode === 'trunk' ? 'trunk' : iface?.vlan ?? 1,
    })
  }

  return (
    <div className="tabpane">
      <section className="panel">
        <h3>Tabela MAC</h3>
        <p className="muted">Endereços aprendidos a partir dos equipamentos ligados a cada porta.</p>
        {rows.length === 0 ? (
          <p className="muted">Nenhum endereço MAC aprendido — ligue equipamentos a este switch.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Porta</th><th>VLAN</th><th>MAC</th><th>Equipamento</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.port}>
                  <td>{row.port}</td>
                  <td>{row.vlan}</td>
                  <td className="mono">{row.mac}</td>
                  <td>{row.peer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="panel">
        <h3>Portas livres</h3>
        <p className="muted">{freePorts(device, links, 'straight').map((port) => port.name).join(', ') || 'Nenhuma'}</p>
      </section>
    </div>
  )
}
