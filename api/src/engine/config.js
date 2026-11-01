import { CABLE_TYPES, DEVICE_CATALOG, categoryOf, portsOf } from '../catalog.js'

export const LAN_CATEGORIES = new Set(['switch', 'ap'])

export const nextVlanId = (config) => {
  const used = new Set((config?.vlans ?? []).map((vlan) => Number(vlan.id)))
  let id = 2
  while (used.has(id) && id < 4094) id += 1
  return id
}

export function defaultConfig(type) {
  const ports = portsOf(type).map((port) => ({
    name: port.name,
    ip: '',
    mask: '',
    gateway: '',
    dhcp: false,
    status: 'up',
    vlan: 1,
    mode: 'access',
    trunkVlans: '',
    speed: 'auto',
    duplex: 'auto',
    wireless: Boolean(port.wireless),
  }))

  return {
    hostname: '',
    dns: '',
    interfaces: ports,
    vlans: [{ id: 1, name: 'default' }],
    routes: [],
    services: {
      dhcp: {
        enabled: false,
        pool: { network: '', mask: '', start: '', end: '', gateway: '', dns: '' },
      },
      dns: { enabled: false, records: [] },
      http: { enabled: false },
      https: { enabled: false },
      ftp: { enabled: false },
      email: { enabled: false },
    },
    wireless: { ssid: '', security: 'wpa2', password: '', channel: 6 },
    nat: false,
    acl: [],
    startup: null,
    power: true,
  }
}

export function normalizeConfig(type, raw) {
  const base = defaultConfig(type)
  const config = raw && typeof raw === 'object' ? raw : {}

  const interfaces = base.interfaces.map((port) => {
    const saved = (config.interfaces ?? []).find((entry) => entry?.name === port.name)
    return saved ? { ...port, ...saved, wireless: port.wireless } : port
  })
  // Subinterfaces (router-on-a-stick) vivem apenas na configuração guardada.
  for (const saved of config.interfaces ?? []) {
    if (!saved?.name) continue
    if (!interfaces.some((entry) => entry.name === saved.name)) {
      interfaces.push({ ...saved, wireless: Boolean(saved.wireless) })
    }
  }

  return {
    ...base,
    ...config,
    interfaces,
    vlans: Array.isArray(config.vlans) && config.vlans.length > 0 ? config.vlans : base.vlans,
    routes: Array.isArray(config.routes) ? config.routes : [],
    acl: Array.isArray(config.acl) ? config.acl : [],
    services: {
      ...base.services,
      ...(config.services ?? {}),
      dhcp: { ...base.services.dhcp, ...(config.services?.dhcp ?? {}) },
      dns: { ...base.services.dns, ...(config.services?.dns ?? {}) },
    },
    wireless: { ...base.wireless, ...(config.wireless ?? {}) },
  }
}

export function primaryInterface(device) {
  const config = normalizeConfig(device.type, device.config)
  const withIp = config.interfaces.find((iface) => iface.ip)
  return withIp ?? config.interfaces[0] ?? null
}

export function activeIpInterface(device) {
  const config = normalizeConfig(device.type, device.config)
  return config.interfaces.find((iface) => iface.ip && iface.status !== 'down')
}

export function isWirelessCable(cable) {
  return cable === 'wireless'
}

export function validateCable(devices, a, b, cable) {
  if (!CABLE_TYPES[cable]) return 'Tipo de cabo desconhecido.'
  const catA = categoryOf(a.type)
  const catB = categoryOf(b.type)
  const wirelessA = portsOf(a.type).some((port) => port.wireless)
  const wirelessB = portsOf(b.type).some((port) => port.wireless)

  if (cable === 'wireless') {
    if (!wirelessA || !wirelessB) {
      return 'A ligação wireless exige dois equipamentos com interface sem fios.'
    }
    return null
  }
  if (cable === 'serial' && (catA !== 'router' || catB !== 'router')) {
    return 'O cabo serial liga apenas routers entre si.'
  }
  if (cable === 'console' && catA !== 'end' && catB !== 'end' && catA !== 'switch' && catB !== 'switch') {
    return 'O cabo de consola liga um computador a um equipamento de rede.'
  }
  if (cable === 'fiber' && (catA === 'end' || catB === 'end')) {
    // fibra de acesso é permitida, mas não a hubs antigos
    if (a.type === 'hub' || b.type === 'hub') return 'Um hub não tem porta de fibra ótica.'
  }
  return null
}

/** Porta livre (não usada por nenhum cabo) para o dispositivo. */
export function freePort(device, links, excludeLinkId = null) {
  const allPorts = portsOf(device.type).map((port) => port.name)
  const used = new Set(
    links
      .filter((link) => link.id !== excludeLinkId)
      .flatMap((link) => {
        if (link.a_id === device.id) return [link.a_port]
        if (link.b_id === device.id) return [link.b_port]
        return []
      })
      .filter(Boolean)
  )
  return allPorts.find((port) => !used.has(port)) ?? null
}

export function portsInUse(device, links) {
  const map = new Map()
  for (const link of links) {
    if (link.a_id === device.id && link.a_port) map.set(link.a_port, link)
    if (link.b_id === device.id && link.b_port) map.set(link.b_port, link)
  }
  return map
}

export const deviceLabel = (type) => DEVICE_CATALOG[type]?.label ?? type
