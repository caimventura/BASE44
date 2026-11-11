import { DEVICE_CATALOG } from '../catalog.js'
import { buildTopology, isLanDevice } from './topology.js'
import { activeIpInterface, normalizeConfig } from './config.js'
import { isValidIpv4, networkOf, prefixLength } from './ip.js'
import { simulatePing } from './ping.js'

const endDevices = (topology) =>
  topology.devices.filter((device) => DEVICE_CATALOG[device.type]?.category === 'end')

const pingPairs = (topology, devices) => {
  const pairs = []
  for (let a = 0; a < devices.length; a += 1) {
    for (let b = a + 1; b < devices.length; b += 1) pairs.push([devices[a], devices[b]])
  }
  return pairs
}

function runCheck(check, topology, rawDevices, rawLinks) {
  const ends = endDevices(topology).filter((device) => activeIpInterface(device))
  const switches = topology.devices.filter((device) => isLanDevice(device))
  const routers = topology.devices.filter((device) => ['router', 'firewall', 'modem'].includes(device.type))

  switch (check.type) {
    case 'minDevices': {
      const pool = topology.devices.filter((device) =>
        (check.categories ?? [DEVICE_CATALOG[device.type]?.category]).includes(
          DEVICE_CATALOG[device.type]?.category
        )
      )
      const ok = pool.length >= (check.count ?? 1)
      return {
        passed: ok,
        detail: `${pool.length} de ${check.count} equipamento(s) esperados.`,
        hint: ok ? '' : `Adicione ${check.count - pool.length} equipamento(s) à topologia.`,
      }
    }
    case 'minType': {
      const pool = topology.devices.filter((device) => (check.types ?? []).includes(device.type))
      const ok = pool.length >= (check.count ?? 1)
      return {
        passed: ok,
        detail: `${pool.length} de ${check.count} equipamento(s) do tipo pedido.`,
        hint: ok ? '' : `Adicione ${check.count - pool.length} equipamento(s) do tipo indicado.`,
      }
    }
    case 'allConnected': {
      const isolated = topology.devices.filter((device) => (topology.adjacency.get(device.id) ?? []).length === 0)
      return {
        passed: isolated.length === 0 && topology.devices.length > 0,
        detail: isolated.length === 0 ? 'Todos os equipamentos têm cabo.' : `${isolated.length} equipamento(s) sem cabo.`,
        hint: isolated.length ? `Ligue com cabo: ${isolated.map((device) => device.name).join(', ')}.` : '',
      }
    }
    case 'allEndHaveIp': {
      const without = endDevices(topology).filter((device) => !activeIpInterface(device))
      return {
        passed: without.length === 0 && endDevices(topology).length > 0,
        detail: without.length === 0 ? 'Todos os dispositivos finais têm IP ativo.' : `Sem IP: ${without.map((device) => device.name).join(', ')}.`,
        hint: without.length ? 'Configure IP e máscara nos dispositivos finais (ou peça DHCP).' : '',
      }
    }
    case 'mask': {
      const wrong = ends.filter((device) => activeIpInterface(device)?.mask !== check.mask)
      return {
        passed: wrong.length === 0 && ends.length > 0,
        detail: wrong.length === 0 ? `Todos usam a máscara ${check.mask}.` : `Máscara diferente: ${wrong.map((device) => device.name).join(', ')}.`,
        hint: wrong.length ? `Use a máscara ${check.mask} nos dispositivos finais.` : '',
      }
    }
    case 'sameSubnetEnds': {
      const networks = new Set(ends.map((device) => {
        const iface = activeIpInterface(device)
        return `${networkOf(iface.ip, iface.mask)}/${prefixLength(iface.mask)}`
      }))
      const ok = networks.size === 1 && ends.length >= 2
      return {
        passed: ok,
        detail: ok ? `Todos na rede ${[...networks][0]}.` : `Redes encontradas: ${[...networks].join(', ') || 'nenhuma'}.`,
        hint: ok ? '' : 'Coloque todos os computadores na mesma sub-rede, com máscara igual.',
      }
    }
    case 'differentSubnets': {
      const networks = new Set(ends.map((device) => {
        const iface = activeIpInterface(device)
        return networkOf(iface.ip, iface.mask)
      }))
      return {
        passed: networks.size >= 2,
        detail: `${networks.size} sub-rede(s) configurada(s).`,
        hint: networks.size >= 2 ? '' : 'Configure os equipamentos em duas sub-redes diferentes.',
      }
    }
    case 'pingAll': {
      const pairs = pingPairs(topology, ends)
      if (pairs.length === 0) {
        return { passed: false, detail: 'Sem dispositivos finais configurados para testar.', hint: 'Configure IPs nos dispositivos.' }
      }
      const failures = pairs.filter(([a, b]) => !simulatePing(rawDevices, rawLinks, a.id, b.id).ok)
      if (failures.length === 0) {
        return { passed: true, detail: `Comunicação confirmada entre ${pairs.length} par(es).`, hint: '' }
      }
      const [a, b] = failures[0]
      return {
        passed: false,
        detail: `${failures.length} par(es) sem comunicação. Primeiro: ${a.name} → ${b.name}.`,
        hint: simulatePing(rawDevices, rawLinks, a.id, b.id).reason,
      }
    }
    case 'crossNetworkPing': {
      const pairs = []
      for (const a of ends) {
        for (const b of ends) {
          const ifaceA = activeIpInterface(a)
          const ifaceB = activeIpInterface(b)
          if (!ifaceA || !ifaceB) continue
          if (networkOf(ifaceA.ip, ifaceA.mask) !== networkOf(ifaceB.ip, ifaceB.mask)) pairs.push([a, b])
        }
      }
      if (pairs.length === 0) {
        return { passed: false, detail: 'Não há equipamentos em redes diferentes.', hint: 'Configure duas sub-redes distintas e um router entre elas.' }
      }
      const failures = pairs.filter(([a, b]) => !simulatePing(rawDevices, rawLinks, a.id, b.id).ok)
      return {
        passed: failures.length === 0,
        detail:
          failures.length === 0
            ? `Comunicação entre redes confirmada (${pairs.length} par(es)).`
            : `${failures.length} par(es) entre redes sem comunicação.`,
        hint: failures.length
          ? simulatePing(rawDevices, rawLinks, failures[0][0].id, failures[0][1].id).reason
          : '',
      }
    }
    case 'pingBlocked': {
      const pairs = pingPairs(topology, ends)
      const blocked = pairs.filter(([a, b]) => !simulatePing(rawDevices, rawLinks, a.id, b.id).ok)
      return {
        passed: blocked.length > 0,
        detail:
          blocked.length > 0
            ? `Isolamento confirmado: ${blocked.length} par(es) não comunicam.`
            : 'Todos os equipamentos comunicam — as VLANs não estão a isolar nada.',
        hint: blocked.length ? '' : 'Atribua as portas do switch a VLANs diferentes.',
      }
    }
    case 'vlanCount': {
      const maxVlans = Math.max(0, ...switches.map((device) => (device.config.vlans ?? []).length))
      return {
        passed: maxVlans >= (check.count ?? 2),
        detail: `${maxVlans} VLAN(s) configurada(s) (mínimo ${check.count ?? 2}).`,
        hint: maxVlans >= (check.count ?? 2) ? '' : 'Crie as VLANs no separador do switch.',
      }
    }
    case 'portsInVlan': {
      const ok = switches.some((device) =>
        device.config.interfaces.some(
          (iface) => iface.mode !== 'trunk' && Number(iface.vlan ?? 1) === Number(check.vlan)
        )
      )
      return {
        passed: ok,
        detail: ok ? `Existe pelo menos uma porta na VLAN ${check.vlan}.` : `Nenhuma porta atribuída à VLAN ${check.vlan}.`,
        hint: ok ? '' : `Atribua portas do switch à VLAN ${check.vlan}.`,
      }
    }
    case 'serviceEnabled': {
      const ok = topology.devices.some((device) => device.config.services?.[check.service]?.enabled)
      return {
        passed: ok,
        detail: ok ? `Serviço ${check.service.toUpperCase()} ativo.` : `Serviço ${check.service.toUpperCase()} inativo.`,
        hint: ok ? '' : `Ative o serviço ${check.service.toUpperCase()} no servidor.`,
      }
    }
    case 'dhcpClients': {
      const clients = ends.filter((device) =>
        device.config.interfaces.some((iface) => iface.dhcp && isValidIpv4(iface.ip))
      )
      return {
        passed: clients.length >= (check.count ?? 1),
        detail: `${clients.length} cliente(s) com endereço obtido por DHCP.`,
        hint: clients.length >= (check.count ?? 1) ? '' : 'No terminal do cliente, execute "ipconfig /renew".',
      }
    }
    case 'routeCount': {
      const total = routers.reduce((sum, device) => sum + (device.config.routes ?? []).length, 0)
      return {
        passed: total >= (check.count ?? 1),
        detail: `${total} rota(s) estática(s) configurada(s).`,
        hint: total >= (check.count ?? 1) ? '' : 'Adicione rotas estáticas nos routers (ip route).',
      }
    }
    case 'wirelessConfigured': {
      const ok = topology.devices.some(
        (device) => ['access_point', 'wireless_router'].includes(device.type) && device.config.wireless?.ssid
      )
      return {
        passed: ok,
        detail: ok ? 'Rede wireless com SSID definido.' : 'Nenhum SSID configurado.',
        hint: ok ? '' : 'Defina o SSID num access point ou router wireless.',
      }
    }
    default:
      return { passed: false, detail: `Critério "${check.type}" não reconhecido pelo avaliador.`, hint: '' }
  }
}

export function evaluateLab(lab, devices, links) {
  const topology = buildTopology(devices, links)
  const checks = (lab.checks ?? []).map((check) => {
    const outcome = runCheck(check, topology, devices, links)
    return {
      label: check.label ?? check.type,
      weight: check.weight ?? 1,
      ...outcome,
    }
  })

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0) || 1
  const passedWeight = checks.filter((check) => check.passed).reduce((sum, check) => sum + check.weight, 0)
  const maxScore = lab.points ?? 20
  const score = Math.round((passedWeight / totalWeight) * maxScore * 10) / 10

  return {
    score,
    maxScore,
    percentage: Math.round((passedWeight / totalWeight) * 100),
    checks,
    errors: checks.filter((check) => !check.passed).map((check) => check.detail),
    recommendations: checks.filter((check) => !check.passed && check.hint).map((check) => check.hint),
    passed: checks.every((check) => check.passed),
  }
}

/** Cria a configuração inicial de um dispositivo a partir de um laboratório modelo. */
export function starterConfig(device) {
  const config = normalizeConfig(device.type, {})
  const iface = config.interfaces[0]
  if (device.ip) {
    iface.ip = device.ip
    iface.mask = device.mask ?? '255.255.255.0'
    iface.gateway = device.gateway ?? ''
  }
  if (device.dhcp) iface.dhcp = true
  if (device.hostname) config.hostname = device.hostname
  if (device.services) config.services = { ...config.services, ...device.services }
  if (device.ssid) config.wireless = { ...config.wireless, ssid: device.ssid, security: 'wpa2', password: device.wifiPassword ?? '' }
  if (device.routes) config.routes = device.routes
  if (device.vlans) config.vlans = device.vlans
  if (device.ifaceVlans) {
    for (const [port, vlan] of Object.entries(device.ifaceVlans)) {
      const entry = config.interfaces.find((candidate) => candidate.name === port)
      if (entry) entry.vlan = vlan
    }
  }
  if (device.extraInterfaces) {
    config.interfaces.push(...device.extraInterfaces.map((entry) => ({ ...entry, wireless: false })))
  }
  return config
}
