// Cópia de api/src/catalog.js — manter os dois em sincronia.
// As portas seguem a nomenclatura do Cisco Packet Tracer: o `name` é usado nos
// cabos/CLI e o `label` é o nome completo mostrado na interface.

const port = (name, label = name, wireless = false) => ({ name, label, wireless })

const ranged = (prefix, count, start = 1) =>
  Array.from({ length: count }, (_, index) => start + index)

const endPorts = [port('Eth0', 'FastEthernet0')]
const wirelessPorts = [
  port('Eth0', 'FastEthernet0'),
  port('Wlan0', 'Wireless0', true),
]
const switchPorts = (count, prefix = 'Fa0/') =>
  ranged(prefix, count).map((index) => port(`${prefix}${index}`, `FastEthernet0/${index}`))
const routerPorts = (count) =>
  ranged('Gig0/', count, 0).map((index) => port(`Gig0/${index}`, `GigabitEthernet0/${index}`))

export const DEVICE_CATALOG = {
  pc: { label: 'Computador', model: 'NL-Workstation 100', category: 'end', description: 'Estação de trabalho com placa Ethernet, terminal e navegador simulados.', ports: endPorts },
  notebook: { label: 'Laptop', model: 'NL-Notebook 210', category: 'end', description: 'Portátil com Ethernet e interface wireless.', ports: wirelessPorts },
  server: { label: 'Servidor', model: 'NL-Server 900', category: 'end', description: 'Servidor com DHCP, DNS, HTTP, HTTPS, FTP e e-mail.', ports: endPorts },
  printer: { label: 'Impressora', model: 'NL-Print 55', category: 'end', description: 'Impressora de rede com IP próprio.', ports: endPorts },
  ipphone: { label: 'Telefone IP', model: 'NL-Voice 320', category: 'end', description: 'Telefone IP com interface Ethernet.', ports: endPorts },
  smartphone: { label: 'Smartphone', model: 'NL-Mobile 5', category: 'end', description: 'Dispositivo móvel apenas wireless.', ports: [port('Wlan0', 'Wireless0', true)] },
  tablet: { label: 'Tablet', model: 'NL-Tab 8', category: 'end', description: 'Tablet com interface wireless.', ports: [port('Wlan0', 'Wireless0', true)] },
  ipcam: { label: 'Câmara IP', model: 'NL-Cam 4K', category: 'end', description: 'Câmara de videovigilância por Ethernet.', ports: endPorts },
  iot: { label: 'Sensor IoT', model: 'NL-IoT 01', category: 'end', description: 'Sensor inteligente wireless.', ports: [port('Wlan0', 'Wireless0', true)] },

  router: { label: 'Router', model: 'NL-Router 2900', category: 'router', description: 'Router de 4 interfaces Gigabit com CLI, rotas e NAT.', ports: routerPorts(4) },
  switch: { label: 'Switch', model: 'NL-Switch 2960', category: 'switch', description: 'Switch de 24 portas Fast Ethernet + 2 Gigabit com VLANs e trunks.', ports: [...switchPorts(24), port('Gig0/1', 'GigabitEthernet0/1'), port('Gig0/2', 'GigabitEthernet0/2')] },
  multilayer_switch: { label: 'Switch multicamada', model: 'NL-L3 3560', category: 'switch', description: 'Switch de 24 portas com funções L3.', ports: [...switchPorts(24), port('Gig0/1', 'GigabitEthernet0/1'), port('Gig0/2', 'GigabitEthernet0/2')], layer3: true },
  hub: { label: 'Hub', model: 'NL-Hub 4', category: 'switch', description: 'Concentrador de 4 portas sem VLANs.', ports: switchPorts(4, 'Port ') },
  access_point: { label: 'Access Point', model: 'NL-AP 1200', category: 'ap', description: 'Ponto de acesso com SSID, segurança e canal.', ports: [port('Eth0', 'FastEthernet0'), port('Wlan0', 'Wireless0', true)] },
  modem: { label: 'Modem', model: 'NL-DSL 500', category: 'router', description: 'Modem de acesso com duas interfaces.', ports: routerPorts(2) },
  firewall: { label: 'Firewall', model: 'NL-FW 700', category: 'router', description: 'Firewall com ACL, NAT e filtragem.', ports: routerPorts(4) },
  wireless_router: { label: 'Router wireless', model: 'NL-Home 400', category: 'router', description: 'Router doméstico com 4 portas LAN e wireless.', ports: [...routerPorts(4), port('Wlan0', 'Wireless0', true)] },

  repeater: { label: 'Repetidor', model: 'NL-Repeat 10', category: 'switch', description: 'Repetidor que estende o alcance do sinal.', ports: [port('Eth0', 'FastEthernet0'), port('Wlan0', 'Wireless0', true)] },
  bridge: { label: 'Bridge', model: 'NL-Bridge 20', category: 'switch', description: 'Ponte que une dois segmentos.', ports: [port('Eth0', 'FastEthernet0'), port('Eth1', 'FastEthernet1')] },
  controller: { label: 'Controlador de rede', model: 'NL-Controller 1', category: 'switch', description: 'Controlador de access points.', ports: switchPorts(4) },
}

export const DEVICE_GROUPS = [
  { title: 'Dispositivos finais', types: ['pc', 'notebook', 'server', 'printer', 'ipphone', 'smartphone', 'tablet', 'ipcam'] },
  { title: 'Equipamentos de rede', types: ['router', 'switch', 'multilayer_switch', 'hub', 'access_point', 'modem', 'firewall', 'wireless_router'] },
  { title: 'Dispositivos adicionais', types: ['repeater', 'bridge', 'controller', 'iot'] },
]

// Cores e traço inspirados na convenção do Cisco Packet Tracer:
// direto = preto contínuo, cruzado = azul tracejado, fibra = laranja,
// serial = vermelho, consola = azul-claro, wireless = verde tracejado.
export const CABLE_TYPES = {
  straight: { label: 'Ethernet direto', short: 'Direto', color: '#1f2937', dash: null, media: 'cobre' },
  crossover: { label: 'Ethernet cruzado', short: 'Cruzado', color: '#2563eb', dash: '7 5', media: 'cobre' },
  fiber: { label: 'Fibra ótica', short: 'Fibra', color: '#f97316', dash: null, media: 'fibra' },
  serial: { label: 'Cabo serial', short: 'Serial', color: '#dc2626', dash: null, media: 'serial' },
  console: { label: 'Cabo de consola', short: 'Consola', color: '#06b6d4', dash: null, media: 'consola' },
  wireless: { label: 'Ligação wireless', short: 'Wireless', color: '#16a34a', dash: '2 2', media: 'rádio' },
}

export const categoryOf = (deviceOrType) => {
  const type = typeof deviceOrType === 'string' ? deviceOrType : deviceOrType?.type
  return DEVICE_CATALOG[type]?.category ?? 'end'
}

export const labelOf = (type) => DEVICE_CATALOG[type]?.label ?? type
export const portsOf = (type) => DEVICE_CATALOG[type]?.ports ?? []
export const hasWireless = (type) => portsOf(type).some((port) => port.wireless)

/** Nome completo da interface (ex.: Gig0/0 → GigabitEthernet0/0). */
export const portLabel = (type, name) =>
  portsOf(type).find((entry) => entry.name === name)?.label ?? name

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
