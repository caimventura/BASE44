import { categoryOf, portsOf } from '../catalog.js'
import { normalizeConfig } from './config.js'
import { macOf } from './ip.js'

/** Constrói o grafo físico a partir dos dispositivos e cabos guardados. */
export function buildTopology(devices, links) {
  const normalized = devices.map((device) => ({
    ...device,
    powered: device.powered !== false,
    config: normalizeConfig(device.type, device.config),
  }))
  const byId = new Map(normalized.map((device) => [device.id, device]))
  const adjacency = new Map(normalized.map((device) => [device.id, []]))

  for (const link of links) {
    if (!byId.has(link.a_id) || !byId.has(link.b_id)) continue
    const portA = link.a_port ?? firstFreePort(byId.get(link.a_id), adjacency)
    const portB = link.b_port ?? firstFreePort(byId.get(link.b_id), adjacency)
    adjacency.get(link.a_id).push({
      linkId: link.id,
      deviceId: link.b_id,
      port: portA,
      peerPort: portB,
      cable: link.cable ?? 'straight',
    })
    adjacency.get(link.b_id).push({
      linkId: link.id,
      deviceId: link.a_id,
      port: portB,
      peerPort: portA,
      cable: link.cable ?? 'straight',
    })
  }

  return { devices: normalized, byId, links, adjacency }
}

function firstFreePort(device, adjacency) {
  const used = new Set((adjacency.get(device.id) ?? []).map((entry) => entry.port))
  return portsOf(device.type).find((port) => !used.has(port.name))?.name ?? 'Eth0'
}

export const isLanDevice = (device) => ['switch', 'ap'].includes(categoryOf(device))

export const edgeTo = (topology, deviceId, peerId) =>
  (topology.adjacency.get(deviceId) ?? []).find((edge) => edge.deviceId === peerId) ?? null

export const portState = (device, portName) =>
  (device.config?.interfaces ?? []).find((iface) => iface.name === portName) ?? null

export const portIsUp = (device, portName) => {
  const iface = portState(device, portName)
  return iface ? iface.status !== 'down' : true
}

export const supportsVlans = (device) => ['switch', 'multilayer_switch'].includes(device.type)

export function vlanOf(device, portName) {
  if (!supportsVlans(device)) return { mode: 'access', vlan: 1, allowed: null }
  const iface = portState(device, portName)
  if (!iface) return { mode: 'access', vlan: 1, allowed: null }
  if (iface.mode === 'trunk') {
    const raw = String(iface.trunkVlans ?? '').trim()
    const allowed =
      !raw || raw.toLowerCase() === 'all'
        ? null
        : new Set(
            raw
              .split(',')
              .flatMap((chunk) => {
                const [from, to] = chunk.split('-').map((part) => Number(part.trim()))
                if (!Number.isFinite(from)) return []
                const end = Number.isFinite(to) ? to : from
                return Array.from({ length: Math.max(0, end - from + 1) }, (_, index) => from + index)
              })
              .filter((value) => Number.isFinite(value))
          )
    return { mode: 'trunk', vlan: null, allowed }
  }
  return { mode: 'access', vlan: Number(iface.vlan ?? 1), allowed: null }
}

/** VLANs compatíveis entre duas portas do mesmo switch. */
function vlansCompatible(ingress, egress) {
  if (ingress.mode === 'access' && egress.mode === 'access') {
    return ingress.vlan === egress.vlan
  }
  const accessSide = ingress.mode === 'access' ? ingress : egress
  const trunkSide = ingress.mode === 'trunk' ? ingress : egress
  if (!trunkSide.allowed) return true
  if (accessSide.mode === 'trunk') {
    return [...trunkSide.allowed].some((vlan) => accessSide.allowed?.has(vlan) ?? true)
  }
  return trunkSide.allowed.has(accessSide.vlan)
}

/**
 * Caminho através de equipamentos de camada 2 (switches, APs, hubs).
 * Devolve a lista de dispositivos, ou null quando não há ligação física.
 */
export function l2Path(topology, fromId, toId) {
  if (fromId === toId) return [fromId]
  const previous = new Map([[fromId, null]])
  const queue = [fromId]

  while (queue.length > 0) {
    const current = queue.shift()
    for (const edge of topology.adjacency.get(current) ?? []) {
      if (previous.has(edge.deviceId)) continue
      const peer = topology.byId.get(edge.deviceId)
      if (!peer) continue
      previous.set(edge.deviceId, current)
      if (edge.deviceId === toId) {
        const path = []
        for (let node = toId; node !== null; node = previous.get(node)) path.unshift(node)
        return path
      }
      // Um dispositivo final não repassa tráfego.
      if (isLanDevice(peer)) queue.push(edge.deviceId)
    }
  }
  return null
}

/** Caminho físico completo (sem olhar à camada), só para mensagens de erro. */
export function physicalPath(topology, fromId, toId) {
  const previous = new Map([[fromId, null]])
  const queue = [fromId]
  while (queue.length > 0) {
    const current = queue.shift()
    for (const edge of topology.adjacency.get(current) ?? []) {
      if (previous.has(edge.deviceId)) continue
      previous.set(edge.deviceId, current)
      if (edge.deviceId === toId) {
        const path = []
        for (let node = toId; node !== null; node = previous.get(node)) path.unshift(node)
        return path
      }
      queue.push(edge.deviceId)
    }
  }
  return null
}

/** Valida portas e VLANs ao longo de um segmento de camada 2. */
export function inspectSegment(topology, deviceIds) {
  for (let index = 0; index < deviceIds.length; index += 1) {
    const device = topology.byId.get(deviceIds[index])
    if (!device) continue
    if (!device.powered) {
      return { error: `${device.name} está desligado — ligue o equipamento para continuar.`, code: 'power', deviceId: device.id }
    }

    const next = deviceIds[index + 1]
    const previous = deviceIds[index - 1]
    if (next !== undefined) {
      const edge = edgeTo(topology, device.id, next)
      if (edge && !portIsUp(device, edge.port)) {
        return {
          error: `A interface ${edge.port} do ${device.name} está desligada (shutdown).`,
          code: 'link-down',
          deviceId: device.id,
        }
      }
      if (edge?.cable === 'wireless') {
        const peer = topology.byId.get(next)
        const host = [device, peer].find((entry) => ['access_point', 'wireless_router'].includes(entry.type))
        if (host && !host.config.wireless?.ssid) {
          return {
            error: `O ${host.name} está sem SSID configurado — ninguém consegue associar-se à rede sem fios.`,
            code: 'wireless',
            deviceId: host.id,
          }
        }
      }
    }

    if (previous !== undefined && next !== undefined && supportsVlans(device)) {
      const ingressEdge = edgeTo(topology, device.id, previous)
      const egressEdge = edgeTo(topology, device.id, next)
      if (ingressEdge && egressEdge) {
        const ingress = vlanOf(device, ingressEdge.port)
        const egress = vlanOf(device, egressEdge.port)
        if (!vlansCompatible(ingress, egress)) {
          const label = (vlan) => (vlan.mode === 'trunk' ? 'trunk' : `VLAN ${vlan.vlan}`)
          return {
            error: `VLAN incompatível no ${device.name}: ${ingressEdge.port} (${label(ingress)}) e ${egressEdge.port} (${label(egress)}) não pertencem à mesma VLAN.`,
            code: 'vlan',
            deviceId: device.id,
          }
        }
      }
    }
  }
  return null
}

/** Junta segmentos sem repetir o dispositivo de ligação. */
export function mergePath(target, segment) {
  for (const id of segment) {
    if (target[target.length - 1] !== id) target.push(id)
  }
  return target
}

/** Procura um dispositivo com o IP indicado dentro do domínio L2 de origem. */
export function findHostInLan(topology, startId, ip) {
  const visited = new Set([startId])
  const queue = [startId]
  const matches = (device, id) =>
    id !== startId &&
    device.config.interfaces.some((iface) => iface.ip === ip && iface.status !== 'down')

  while (queue.length > 0) {
    const currentId = queue.shift()
    for (const edge of topology.adjacency.get(currentId) ?? []) {
      if (visited.has(edge.deviceId)) continue
      visited.add(edge.deviceId)
      const peer = topology.byId.get(edge.deviceId)
      if (!peer) continue
      // Um vizinho pode ser o próprio next-hop (router) ou um switch pelo qual
      // se continua a procurar dentro do mesmo segmento.
      if (matches(peer, peer.id)) return peer
      if (isLanDevice(peer)) queue.push(edge.deviceId)
    }
  }
  return null
}

/** Todos os equipamentos no mesmo domínio de difusão (para DHCP/DNS). */
export function l2Devices(topology, startId) {
  const visited = new Set([startId])
  const queue = [startId]
  const found = []
  while (queue.length > 0) {
    const currentId = queue.shift()
    for (const edge of topology.adjacency.get(currentId) ?? []) {
      if (visited.has(edge.deviceId)) continue
      visited.add(edge.deviceId)
      const peer = topology.byId.get(edge.deviceId)
      if (!peer) continue
      found.push(peer)
      if (isLanDevice(peer)) queue.push(edge.deviceId)
    }
  }
  return found
}

/** Hosts visíveis no mesmo domínio de difusão (para ARP e descoberta). */
export function lanHosts(topology, startId) {
  const found = []
  const visited = new Set([startId])
  const queue = [startId]
  while (queue.length > 0) {
    const currentId = queue.shift()
    for (const edge of topology.adjacency.get(currentId) ?? []) {
      if (visited.has(edge.deviceId)) continue
      visited.add(edge.deviceId)
      const peer = topology.byId.get(edge.deviceId)
      if (!peer) continue
      if (isLanDevice(peer)) {
        queue.push(edge.deviceId)
        continue
      }
      const iface = peer.config.interfaces.find((entry) => entry.ip && entry.status !== 'down')
      if (iface) {
        const path = l2Path(topology, startId, peer.id)
        const problem = path ? inspectSegment(topology, path) : { error: 'sem caminho' }
        if (!problem) {
          found.push({
            deviceId: peer.id,
            name: peer.name,
            ip: iface.ip,
            mask: iface.mask,
            mac: macOf(peer.id, iface.name),
          })
        }
      }
    }
  }
  return found
}
