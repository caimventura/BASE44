// Cópia de api/src/catalog.js — manter os dois em sincronia.

const ranged = (prefix, count, start = 1) =>
  Array.from({ length: count }, (_, index) => `${prefix}${start + index}`)

const endPorts = [{ name: 'Eth0', wireless: false }]
const wirelessPorts = [
  { name: 'Eth0', wireless: false },
  { name: 'Wlan0', wireless: true },
]
const switchPorts = (count, prefix = 'Fa0/') =>
  ranged(prefix, count).map((name) => ({ name, wireless: false }))
const routerPorts = (count) =>
  ranged('Gig0/', count, 0).map((name) => ({ name, wireless: false }))

export const DEVICE_CATALOG = {
  pc: { label: 'Computador', model: 'NL-Workstation 100', category: 'end', description: 'Estação de trabalho com Ethernet, terminal e navegador simulados.', ports: endPorts },
  notebook: { label: 'Laptop', model: 'NL-Notebook 210', category: 'end', description: 'Portátil com Ethernet e interface wireless.', ports: wirelessPorts },
  server: { label: 'Servidor', model: 'NL-Server 900', category: 'end', description: 'Servidor com DHCP, DNS, HTTP, HTTPS, FTP e e-mail.', ports: endPorts },
  printer: { label: 'Impressora', model: 'NL-Print 55', category: 'end', description: 'Impressora de rede com IP próprio.', ports: endPorts },
  ipphone: { label: 'Telefone IP', model: 'NL-Voice 320', category: 'end', description: 'Telefone IP com interface Ethernet.', ports: endPorts },
  smartphone: { label: 'Smartphone', model: 'NL-Mobile 5', category: 'end', description: 'Dispositivo móvel apenas wireless.', ports: [{ name: 'Wlan0', wireless: true }] },
  tablet: { label: 'Tablet', model: 'NL-Tab 8', category: 'end', description: 'Tablet com interface wireless.', ports: [{ name: 'Wlan0', wireless: true }] },
  ipcam: { label: 'Câmara IP', model: 'NL-Cam 4K', category: 'end', description: 'Câmara de videovigilância por Ethernet.', ports: endPorts },
  iot: { label: 'Sensor IoT', model: 'NL-IoT 01', category: 'end', description: 'Sensor inteligente wireless.', ports: [{ name: 'Wlan0', wireless: true }] },

  router: { label: 'Router', model: 'NL-Router 2900', category: 'router', description: 'Router de 4 interfaces Gigabit com CLI, rotas e NAT.', ports: routerPorts(4) },
  switch: { label: 'Switch', model: 'NL-Switch 2960', category: 'switch', description: 'Switch de 8 portas com VLANs e trunks.', ports: switchPorts(8) },
  multilayer_switch: { label: 'Switch multicamada', model: 'NL-L3 3560', category: 'switch', description: 'Switch de 8 portas com funções L3.', ports: switchPorts(8), layer3: true },
  hub: { label: 'Hub', model: 'NL-Hub 4', category: 'switch', description: 'Concentrador de 4 portas sem VLANs.', ports: switchPorts(4, 'Port ') },
  access_point: { label: 'Access Point', model: 'NL-AP 1200', category: 'ap', description: 'Ponto de acesso com SSID, segurança e canal.', ports: [{ name: 'Eth0', wireless: false }] },
  modem: { label: 'Modem', model: 'NL-DSL 500', category: 'router', description: 'Modem de acesso com duas interfaces.', ports: routerPorts(2) },
  firewall: { label: 'Firewall', model: 'NL-FW 700', category: 'router', description: 'Firewall com ACL, NAT e filtragem.', ports: routerPorts(4) },
  wireless_router: { label: 'Router wireless', model: 'NL-Home 400', category: 'router', description: 'Router doméstico com 4 portas LAN e wireless.', ports: [...routerPorts(4), { name: 'Wlan0', wireless: true }] },

  repeater: { label: 'Repetidor', model: 'NL-Repeat 10', category: 'switch', description: 'Repetidor que estende o alcance do sinal.', ports: [{ name: 'Eth0', wireless: false }, { name: 'Wlan0', wireless: true }] },
  bridge: { label: 'Bridge', model: 'NL-Bridge 20', category: 'switch', description: 'Ponte que une dois segmentos.', ports: [{ name: 'Eth0', wireless: false }, { name: 'Eth1', wireless: false }] },
  controller: { label: 'Controlador de rede', model: 'NL-Controller 1', category: 'switch', description: 'Controlador de access points.', ports: switchPorts(4) },
}

export const DEVICE_GROUPS = [
  { title: 'Dispositivos finais', types: ['pc', 'notebook', 'server', 'printer', 'ipphone', 'smartphone', 'tablet', 'ipcam'] },
  { title: 'Equipamentos de rede', types: ['router', 'switch', 'multilayer_switch', 'hub', 'access_point', 'modem', 'firewall', 'wireless_router'] },
  { title: 'Dispositivos adicionais', types: ['repeater', 'bridge', 'controller', 'iot'] },
]

export const CABLE_TYPES = {
  straight: { label: 'Ethernet direto', short: 'Direto', color: '#2563eb' },
  crossover: { label: 'Ethernet cruzado', short: 'Cruzado', color: '#0ea5e9' },
  fiber: { label: 'Fibra ótica', short: 'Fibra', color: '#f59e0b' },
  serial: { label: 'Cabo serial', short: 'Serial', color: '#a855f7' },
  console: { label: 'Cabo de consola', short: 'Consola', color: '#64748b' },
  wireless: { label: 'Ligação wireless', short: 'Wireless', color: '#22c55e' },
}

export const categoryOf = (deviceOrType) => {
  const type = typeof deviceOrType === 'string' ? deviceOrType : deviceOrType?.type
  return DEVICE_CATALOG[type]?.category ?? 'end'
}

export const labelOf = (type) => DEVICE_CATALOG[type]?.label ?? type
export const portsOf = (type) => DEVICE_CATALOG[type]?.ports ?? []
export const hasWireless = (type) => portsOf(type).some((port) => port.wireless)

export const prefixOf = (type) => {
  const map = {
    pc: 'PC', notebook: 'NB', server: 'SRV', printer: 'IMP', ipphone: 'TEL',
    smartphone: 'CEL', tablet: 'TAB', ipcam: 'CAM', iot: 'IoT', router: 'R',
    switch: 'SW', multilayer_switch: 'MLS', hub: 'HUB', access_point: 'AP',
    modem: 'MOD', firewall: 'FW', wireless_router: 'WRT', repeater: 'REP',
    bridge: 'BRG', controller: 'CTL',
  }
  return map[type] ?? 'DEV'
}

export const isNetworkDevice = (type) => ['switch', 'router', 'ap'].includes(categoryOf(type))

export const levelLabel = (level) => `Nível ${level}`
