// Catálogo de equipamentos do NETLAB ACADEMY.
// A mesma tabela existe em web/src/lib/catalog.js (não há pacote partilhado
// entre os dois contentores) — qualquer alteração tem de ser feita nos dois.
// As portas seguem a nomenclatura do Cisco Packet Tracer: `name` é usado nos
// cabos/CLI e `label` é o nome completo mostrado na interface.

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
const switchAllPorts = () => [
  ...switchPorts(24),
  port('Gig0/1', 'GigabitEthernet0/1'),
  port('Gig0/2', 'GigabitEthernet0/2'),
]

export const DEVICE_CATALOG = {
  // ---- Dispositivos finais -------------------------------------------------
  pc: {
    label: 'Computador',
    model: 'NL-Workstation 100',
    category: 'end',
    description: 'Estação de trabalho com placa Ethernet, terminal e navegador simulados.',
    ports: endPorts,
  },
  notebook: {
    label: 'Laptop',
    model: 'NL-Notebook 210',
    category: 'end',
    description: 'Computador portátil com Ethernet e interface wireless.',
    ports: wirelessPorts,
  },
  server: {
    label: 'Servidor',
    model: 'NL-Server 900',
    category: 'end',
    description: 'Servidor com serviços de DHCP, DNS, HTTP, HTTPS, FTP e e-mail.',
    ports: endPorts,
  },
  printer: {
    label: 'Impressora',
    model: 'NL-Print 55',
    category: 'end',
    description: 'Impressora de rede com endereço IP próprio.',
    ports: endPorts,
  },
  ipphone: {
    label: 'Telefone IP',
    model: 'NL-Voice 320',
    category: 'end',
    description: 'Telefone IP com uma interface Ethernet.',
    ports: endPorts,
  },
  smartphone: {
    label: 'Smartphone',
    model: 'NL-Mobile 5',
    category: 'end',
    description: 'Dispositivo móvel que se liga apenas por wireless.',
    ports: [port('Wlan0', 'Wireless0', true)],
  },
  tablet: {
    label: 'Tablet',
    model: 'NL-Tab 8',
    category: 'end',
    description: 'Tablet com interface wireless.',
    ports: [port('Wlan0', 'Wireless0', true)],
  },
  ipcam: {
    label: 'Câmara IP',
    model: 'NL-Cam 4K',
    category: 'end',
    description: 'Câmara de videovigilância ligada por Ethernet.',
    ports: endPorts,
  },
  iot: {
    label: 'Sensor IoT',
    model: 'NL-IoT 01',
    category: 'end',
    description: 'Sensor inteligente com interface wireless.',
    ports: [port('Wlan0', 'Wireless0', true)],
  },

  // ---- Equipamentos de rede -----------------------------------------------
  router: {
    label: 'Router',
    model: 'NL-Router 2900',
    category: 'router',
    description: 'Router de 4 interfaces Gigabit com CLI, rotas estáticas e NAT.',
    ports: routerPorts(4),
  },
  switch: {
    label: 'Switch',
    model: 'NL-Switch 2960',
    category: 'switch',
    description: 'Switch de 24 portas Fast Ethernet + 2 Gigabit com VLANs e portas trunk.',
    ports: switchAllPorts(),
  },
  multilayer_switch: {
    label: 'Switch multicamada',
    model: 'NL-L3 3560',
    category: 'switch',
    description: 'Switch de 24 portas com capacidade de encaminhamento IP (L3).',
    ports: switchAllPorts(),
    layer3: true,
  },
  hub: {
    label: 'Hub',
    model: 'NL-Hub 4',
    category: 'switch',
    description: 'Concentrador simples de 4 portas, sem VLANs.',
    ports: switchPorts(4, 'Port '),
  },
  access_point: {
    label: 'Access Point',
    model: 'NL-AP 1200',
    category: 'ap',
    description: 'Ponto de acesso wireless com SSID, segurança e canal configuráveis.',
    ports: [port('Eth0', 'FastEthernet0')],
  },
  modem: {
    label: 'Modem',
    model: 'NL-DSL 500',
    category: 'router',
    description: 'Modem de acesso à Internet com duas interfaces.',
    ports: routerPorts(2),
  },
  firewall: {
    label: 'Firewall',
    model: 'NL-FW 700',
    category: 'router',
    description: 'Firewall com regras ACL, NAT e filtragem de tráfego.',
    ports: routerPorts(4),
  },
  wireless_router: {
    label: 'Router wireless',
    model: 'NL-Home 400',
    category: 'router',
    description: 'Router doméstico com 4 portas LAN e rede wireless integrada.',
    ports: [...routerPorts(4), port('Wlan0', 'Wireless0', true)],
  },

  // ---- Dispositivos adicionais --------------------------------------------
  repeater: {
    label: 'Repetidor',
    model: 'NL-Repeat 10',
    category: 'switch',
    description: 'Repetidor que estende o alcance do sinal.',
    ports: [port('Eth0', 'FastEthernet0'), port('Wlan0', 'Wireless0', true)],
  },
  bridge: {
    label: 'Bridge',
    model: 'NL-Bridge 20',
    category: 'switch',
    description: 'Ponte que une dois segmentos de rede.',
    ports: [port('Eth0', 'FastEthernet0'), port('Eth1', 'FastEthernet1')],
  },
  controller: {
    label: 'Controlador de rede',
    model: 'NL-Controller 1',
    category: 'switch',
    description: 'Controlador que centraliza a gestão de access points.',
    ports: switchPorts(4),
  },
}

export const DEVICE_GROUPS = [
  {
    title: 'Dispositivos finais',
    types: ['pc', 'notebook', 'server', 'printer', 'ipphone', 'smartphone', 'tablet', 'ipcam'],
  },
  {
    title: 'Equipamentos de rede',
    types: ['router', 'switch', 'multilayer_switch', 'hub', 'access_point', 'modem', 'firewall', 'wireless_router'],
  },
  {
    title: 'Dispositivos adicionais',
    types: ['repeater', 'bridge', 'controller', 'iot'],
  },
]

export const CABLE_TYPES = {
  straight: { label: 'Ethernet direto', description: 'Cabo de cobre direto (straight-through).' },
  crossover: { label: 'Ethernet cruzado', description: 'Cabo de cobre cruzado (cross-over).' },
  fiber: { label: 'Fibra ótica', description: 'Ligação de fibra de alta velocidade.' },
  serial: { label: 'Cabo serial', description: 'Ligação serial entre routers.' },
  console: { label: 'Cabo de consola', description: 'Ligação de gestão para configuração.' },
  wireless: { label: 'Ligação wireless', description: 'Ligação sem fios a um access point.' },
}

export const isDeviceType = (type) => Object.hasOwn(DEVICE_CATALOG, type)

export const categoryOf = (deviceOrType) => {
  const type = typeof deviceOrType === 'string' ? deviceOrType : deviceOrType?.type
  return DEVICE_CATALOG[type]?.category ?? 'end'
}

export const portsOf = (type) => DEVICE_CATALOG[type]?.ports ?? []

export const labelOf = (type) => DEVICE_CATALOG[type]?.label ?? type

export const portLabel = (type, name) =>
  portsOf(type).find((entry) => entry.name === name)?.label ?? name

export const prefixOf = (type) => {
  const map = {
    pc: 'PC',
    notebook: 'NB',
    server: 'SRV',
    printer: 'IMP',
    ipphone: 'TEL',
    smartphone: 'CEL',
    tablet: 'TAB',
    ipcam: 'CAM',
    iot: 'IoT',
    router: 'R',
    switch: 'SW',
    multilayer_switch: 'MLS',
    hub: 'HUB',
    access_point: 'AP',
    modem: 'MOD',
    firewall: 'FW',
    wireless_router: 'WRT',
    repeater: 'REP',
    bridge: 'BRG',
    controller: 'CTL',
  }
  return map[type] ?? 'DEV'
}

export const isWirelessPort = (type, portName) =>
  portsOf(type).some((port) => port.name === portName && port.wireless)

export const hasWireless = (type) => portsOf(type).some((port) => port.wireless)
