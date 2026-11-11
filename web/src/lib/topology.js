import { CABLE_TYPES, categoryOf, portLabel, portsOf } from './catalog.js'

const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

export const isValidIpv4 = (value) => IPV4_PATTERN.test(String(value ?? '').trim())

export function isValidMask(value) {
  if (!isValidIpv4(value)) return false
  const bits = String(value)
    .trim()
    .split('.')
    .map((part) => Number(part).toString(2).padStart(8, '0'))
    .join('')
  return /^1*0*$/.test(bits)
}

export const networkOf = (ip, mask) => {
  if (!isValidIpv4(ip) || !isValidIpv4(mask)) return null
  return String(ip)
    .trim()
    .split('.')
    .map((part, index) => Number(part) & Number(String(mask).trim().split('.')[index]))
    .join('.')
}

export const macOf = (deviceId, interfaceName) => {
  const hex = (value) => Number(value).toString(16).toUpperCase().padStart(2, '0')
  const sum = [...String(interfaceName)].reduce((total, char) => total + char.charCodeAt(0), 0)
  return `00:1A:2B:${hex(Number(deviceId) % 256)}:${hex(sum % 256)}:01`
}

export const primaryIface = (device) => {
  const interfaces = device?.config?.interfaces ?? []
  return interfaces.find((iface) => iface.ip) ?? interfaces[0] ?? null
}

export const ifaceOf = (device, name) =>
  (device?.config?.interfaces ?? []).find((iface) => iface.name === name) ?? null

export const usedPorts = (deviceId, links) => {
  const used = new Set()
  for (const link of links) {
    if (link.a_id === deviceId && link.a_port) used.add(link.a_port)
    if (link.b_id === deviceId && link.b_port) used.add(link.b_port)
  }
  return used
}

export const freePorts = (device, links, cable) => {
  if (!device) return []
  const used = usedPorts(device.id, links)
  // A porta wireless é partilhada por todos os clientes associados.
  if (cable === 'wireless') return portsOf(device.type).filter((port) => port.wireless)
  return portsOf(device.type).filter((port) => !port.wireless && !used.has(port.name))
}

export const interfaceLabel = (device, name) => portLabel(device?.type, name)

/** Equipamento ligado mas ainda sem endereço numa interface em uso. */
export function needsConfiguration(device, links = []) {
  const category = categoryOf(device?.type)
  if (category !== 'router' && category !== 'end') return false
  const interfaces = device?.config?.interfaces ?? []
  if (interfaces.length === 0) return false
  if (category === 'end') {
    return !interfaces.some((iface) => iface.ip && iface.mask)
  }
  const connected = new Set()
  for (const link of links) {
    if (link.a_id === device.id) connected.add(link.a_port)
    if (link.b_id === device.id) connected.add(link.b_port)
  }
  if (connected.size === 0) return false
  return [...connected].some((name) => {
    const iface = interfaces.find((entry) => entry.name === name)
    return iface && !iface.ip
  })
}

export function linkState(a, b, link) {
  if (!a || !b) return { tone: 'off', label: 'Desconhecido' }
  if (a.powered === false || b.powered === false) return { tone: 'off', label: 'Equipamento desligado' }
  const ifaceA = ifaceOf(a, link.a_port)
  const ifaceB = ifaceOf(b, link.b_port)
  if (ifaceA?.status === 'down' || ifaceB?.status === 'down') {
    return { tone: 'down', label: 'Interface desligada' }
  }
  const routerSide = [
    [a, ifaceA, link.a_port],
    [b, ifaceB, link.b_port],
  ].find(([device]) => categoryOf(device.type) === 'router')
  if (routerSide && routerSide[1] && !routerSide[1].ip) {
    return { tone: 'unconfigured', label: `${routerSide[0].name} ${routerSide[2]} sem IP` }
  }
  if (link.cable === 'wireless') {
    const ap = [a, b].find((device) => ['access_point', 'wireless_router'].includes(device.type))
    if (ap && !ap.config?.wireless?.ssid) return { tone: 'down', label: 'Sem SSID configurado' }
  }
  return { tone: 'up', label: 'Ligação ativa' }
}

export const cableInfo = (cable) => CABLE_TYPES[cable] ?? CABLE_TYPES.straight

export const formatIp = (device) => {
  const iface = primaryIface(device)
  if (!iface) return null
  if (!iface.ip) {
    if (iface.dhcp) return 'DHCP pendente'
    return null
  }
  return iface.ip
}


export const maskFromPrefix = (prefix) => {
  const safe = Math.max(0, Math.min(32, Number(prefix) || 0))
  return '1'.repeat(safe).padEnd(32, '0').match(/.{8}/g).map((bits) => parseInt(bits, 2)).join('.')
}

export const prefixOf = (mask) => {
  if (!isValidIpv4(mask)) return 0
  return String(mask).trim().split('.').map((part) => Number(part).toString(2).padStart(8, '0')).join('').split('').filter((bit) => bit === '1').length
}

/** Aceita "255.255.255.0", "24", "/24" ou "192.168.1.10/24". */
export function parseMaskInput(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return { mask: '', prefix: null }
  const slash = raw.match(/\/(\d{1,2})$/)
  if (slash) {
    const prefix = Number(slash[1])
    return prefix >= 0 && prefix <= 32 ? { mask: maskFromPrefix(prefix), prefix } : { mask: raw, prefix: null }
  }
  if (/^\d{1,2}$/.test(raw)) {
    const prefix = Number(raw)
    return prefix >= 0 && prefix <= 32 ? { mask: maskFromPrefix(prefix), prefix } : { mask: raw, prefix: null }
  }
  return { mask: raw, prefix: isValidMask(raw) ? prefixOf(raw) : null }
}

/** Mensagem de erro pedagógica para uma máscara. */
export function maskError(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return 'Indica a máscara: por exemplo 255.255.255.0 (ou /24).'
  const { mask } = parseMaskInput(raw)
  if (!isValidIpv4(mask)) return 'Máscara inválida: são quatro números entre 0 e 255 separados por pontos.'
  if (!isValidMask(mask)) return 'Máscara inválida: os bits de rede devem ser contínuos (ex.: 255.255.255.0).'
  return ''
}

/** Pré-visualização didática da rede calculada. */
export function describeSubnet(ip, mask) {
  if (!isValidIpv4(ip) || !isValidMask(mask)) return ''
  const network = networkOf(ip, mask)
  const prefix = prefixOf(mask)
  // Parte de host = octetos que a máscara não cobre (ex.: /16 → 1.10).
  const host =
    ip
      .split('.')
      .filter((_, index) => Number(mask.split('.')[index]) !== 255)
      .join('.') || '0'
  return `Rede ${network}/${prefix} · host ${host}`
}

export const deviceCategory = (type) => categoryOf(type)

export const suggestionName = (devices, type) => {
  const map = {
    pc: 'PC', notebook: 'NB', server: 'SRV', printer: 'IMP', ipphone: 'TEL',
    smartphone: 'CEL', tablet: 'TAB', ipcam: 'CAM', iot: 'IoT', router: 'R',
    switch: 'SW', multilayer_switch: 'MLS', hub: 'HUB', access_point: 'AP',
    modem: 'MOD', firewall: 'FW', wireless_router: 'WRT', repeater: 'REP',
    bridge: 'BRG', controller: 'CTL',
  }
  const prefix = map[type] ?? 'DEV'
  const taken = new Set(devices.map((device) => device.name))
  let index = 0
  while (taken.has(`${prefix}${index}`)) index += 1
  return `${prefix}${index}`
}

export function defaultConfigFor(type) {
  return {
    hostname: '',
    dns: '',
    interfaces: portsOf(type).map((port) => ({
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
    })),
    vlans: [{ id: 1, name: 'default' }],
    routes: [],
    services: {
      dhcp: { enabled: false, pool: { network: '', mask: '', start: '', end: '', gateway: '', dns: '' } },
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

export const cloneTopology = (topology) => ({
  devices: topology.devices.map((device) => ({
    ...device,
    config: JSON.parse(JSON.stringify(device.config ?? {})),
  })),
  links: topology.links.map((link) => ({ ...link })),
  annotations: topology.annotations.map((annotation) => ({ ...annotation })),
})

export const topologyPayload = (topology) => ({
  devices: topology.devices.map((device) => ({
    id: device.id,
    name: device.name,
    type: device.type,
    x: device.x,
    y: device.y,
    powered: device.powered !== false,
    config: device.config,
  })),
  links: topology.links.map((link) => ({
    a_id: link.a_id,
    b_id: link.b_id,
    a_port: link.a_port,
    b_port: link.b_port,
    cable: link.cable,
  })),
  annotations: topology.annotations.map((annotation) => ({
    text: annotation.text,
    x: annotation.x,
    y: annotation.y,
  })),
})
