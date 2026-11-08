import { categoryOf } from '../catalog.js'
import { activeIpInterface } from './config.js'
import { isValidIpv4, macOf } from './ip.js'
import { simulatePing } from './ping.js'
import { buildTopology } from './topology.js'

/**
 * PDU (Protocol Data Unit) — ferramenta de simulação inspirada no Cisco Packet
 * Tracer. O PDU simples é um ICMP Echo (ping). O PDU complexo permite escolher
 * o protocolo de aplicação, TTL, tamanho e número de sequência e devolve o
 * detalhe do pacote camada a camada.
 */

const PROTOCOLS = {
  icmp: { label: 'ICMP', layer4: 'ICMP', type: 'Echo Request', port: null, service: null },
  http: { label: 'HTTP', layer4: 'TCP', type: 'GET /', port: 80, service: 'http' },
  https: { label: 'HTTPS', layer4: 'TCP', type: 'TLS ClientHello', port: 443, service: 'https' },
  ftp: { label: 'FTP', layer4: 'TCP', type: 'USER anonymous', port: 21, service: 'ftp' },
  dns: { label: 'DNS', layer4: 'UDP', type: 'Standard query', port: 53, service: 'dns' },
}

const clamp = (value, min, max, fallback) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(Math.max(Math.round(number), min), max)
}

function serviceAnswer(topology, device, protocol, hostname) {
  const key = PROTOCOLS[protocol].service
  if (!key) return { ok: true, text: 'Echo Reply recebido.' }
  const services = device.config.services ?? {}

  if (key === 'dns') {
    const enabled = Boolean(services.dns?.enabled)
    if (!enabled) {
      return {
        ok: false,
        reason: `O serviço DNS não está ativo no ${device.name}.`,
        hint: `Ative o serviço DNS no ${device.name} e registe o nome que quer resolver.`,
      }
    }
    const records = services.dns?.records ?? []
    const wanted = String(hostname ?? '').trim()
    if (wanted) {
      const record = records.find((entry) => String(entry.name).toLowerCase() === wanted.toLowerCase())
      if (!record) {
        return {
          ok: false,
          reason: `O ${device.name} respondeu NXDOMAIN: "${wanted}" não está registado.`,
          hint: 'Acrescente o registo DNS no separador do servidor.',
        }
      }
      return { ok: true, text: `${wanted} → ${record.ip} (resposta do ${device.name}).` }
    }
    if (records.length === 0) {
      return {
        ok: false,
        reason: `O ${device.name} não tem nenhum registo DNS.`,
        hint: 'Registe pelo menos um nome no servidor DNS.',
      }
    }
    return { ok: true, text: `${records[0].name} → ${records[0].ip} (resposta do ${device.name}).` }
  }

  if (!services[key]?.enabled) {
    return {
      ok: false,
      reason: `O serviço ${PROTOCOLS[protocol].label} não está ativo no ${device.name}.`,
      hint: `Ative o serviço ${PROTOCOLS[protocol].label} no equipamento de destino.`,
    }
  }
  return { ok: true, text: `O ${device.name} respondeu ao pedido ${PROTOCOLS[protocol].label}.` }
}

function buildLayers({ protocol, source, destination, srcIface, dstIface, packet, pathCables }) {
  const spec = PROTOCOLS[protocol]
  const layers = [
    {
      layer: 7,
      name: 'Aplicação',
      detail:
        protocol === 'icmp'
          ? 'ICMP Echo Request — mensagem de diagnóstico, sem porta de aplicação.'
          : `${spec.label} · ${spec.type}${packet.hostname ? ` · ${packet.hostname}` : ''}`,
    },
    {
      layer: 4,
      name: 'Transporte',
      detail:
        protocol === 'icmp'
          ? 'ICMP sobre IP (não usa TCP nem UDP).'
          : `${spec.layer4} · origem ${packet.srcPort} → destino ${packet.dstPort}`,
    },
    {
      layer: 3,
      name: 'Rede',
      detail: `IPv4 ${packet.srcIp} → ${packet.dstIp} · TTL ${packet.ttl} · protocolo ${spec.label}`,
    },
    {
      layer: 2,
      name: 'Ligação de dados',
      detail: `Ethernet · MAC origem ${packet.srcMac} → MAC destino ${packet.dstMac}`,
    },
    {
      layer: 1,
      name: 'Física',
      detail: pathCables.length > 0 ? `Cabos: ${[...new Set(pathCables)].join(', ')}` : 'Sem ligações físicas.',
    },
  ]
  void source
  void destination
  void srcIface
  void dstIface
  return layers
}

export function simulatePdu(rawDevices, rawLinks, request = {}) {
  const from = Number(request.from)
  const to = Number(request.to)
  const protocol = PROTOCOLS[request.protocol] ? request.protocol : 'icmp'
  const spec = PROTOCOLS[protocol]
  const ttl = clamp(request.ttl, 1, 255, 128)
  const size = clamp(request.size, 32, 1500, protocol === 'icmp' ? 64 : 512)
  const sequence = clamp(request.sequence, 0, 9999, 1)
  const srcPort = clamp(request.srcPort, 1024, 65535, 1025)
  const dstPort = clamp(request.dstPort, 1, 65535, spec.port ?? 0)
  const hostname = String(request.hostname ?? '').trim()
  const simple = request.kind !== 'complex'

  const topology = buildTopology(rawDevices, rawLinks)
  const source = topology.byId.get(from)
  const destination = topology.byId.get(to)

  const fail = (reason, hint = '', code = 'pdu') => ({
    ok: false,
    kind: simple ? 'simple' : 'complex',
    protocol,
    code,
    reason,
    hint,
    summary: `PDU ${spec.label}: ${reason}`,
    events: [{ level: 'erro', text: reason }],
    path: [],
    hops: [],
    packet: null,
    layers: [],
  })

  if (!source || !destination) return fail('Escolha a origem e o destino do PDU.', '', 'not-found')
  if (source.id === destination.id) return fail('A origem e o destino têm de ser equipamentos diferentes.')

  const ping = simulatePing(rawDevices, rawLinks, from, to)
  if (!ping.ok) {
    return {
      ok: false,
      kind: simple ? 'simple' : 'complex',
      protocol,
      code: ping.code,
      reason: ping.reason,
      hint: ping.hint,
      summary: `PDU ${spec.label} interrompido: ${ping.reason}`,
      events: ping.events,
      path: [],
      hops: [],
      packet: null,
      layers: [],
    }
  }

  const routerCount = ping.path.filter((id) => categoryOf(topology.byId.get(id)) === 'router').length
  if (!simple && ttl <= routerCount) {
    const routers = ping.path.filter((id) => categoryOf(topology.byId.get(id)) === 'router')
    const device = topology.byId.get(routers[Math.max(0, Math.min(ttl - 1, routers.length - 1))])
    return {
      ok: false,
      kind: 'complex',
      protocol,
      code: 'ttl',
      reason: `O TTL (${ttl}) expirou antes de chegar ao destino${device ? ` — último salto: ${device.name}` : ''}.`,
      hint: `Aumente o TTL para pelo menos ${routerCount + 1} ou verifique ciclos de encaminhamento.`,
      summary: `PDU ${spec.label}: TTL expirado.`,
      events: [
        ...ping.events,
        { level: 'erro', text: `ICMP Time Exceeded devolvido ao ${source.name} (TTL ${ttl}).` },
      ],
      path: ping.path,
      hops: ping.hops,
      packet: null,
      layers: [],
    }
  }

  const answer = categoryOf(destination) === 'end' || destination.config.services
    ? serviceAnswer(topology, destination, protocol, hostname)
    : { ok: false, reason: `${destination.name} não é um equipamento que responda a pedidos ${spec.label}.`, hint: 'Escolha um servidor como destino.' }
  if (!answer.ok) {
    return {
      ok: false,
      kind: simple ? 'simple' : 'complex',
      protocol,
      code: 'service',
      reason: answer.reason,
      hint: answer.hint,
      summary: `PDU ${spec.label} sem resposta: ${answer.reason}`,
      events: [...ping.events, { level: 'erro', text: answer.reason }],
      path: ping.path,
      hops: ping.hops,
      packet: null,
      layers: [],
    }
  }

  const srcIface = activeIpInterface(source)
  const dstIface = activeIpInterface(destination)
  const packet = {
    ...ping.packet,
    protocol: spec.label,
    type: spec.type,
    srcIp: ping.packet.srcIp,
    dstIp: ping.packet.dstIp,
    srcMac: macOf(source.id, srcIface?.name ?? 'Eth0'),
    dstMac: ping.packet.dstMac,
    ttl,
    size,
    sequence,
    srcPort: protocol === 'icmp' ? null : srcPort,
    dstPort: protocol === 'icmp' ? null : dstPort,
    hostname: hostname || null,
    status: 'entregue',
    simple,
  }

  const pathCables = []
  for (let index = 0; index < ping.path.length - 1; index += 1) {
    const a = topology.byId.get(ping.path[index])
    const b = topology.byId.get(ping.path[index + 1])
    const edge = (topology.adjacency.get(a?.id) ?? []).find((entry) => entry.deviceId === b?.id)
    if (edge?.cable) pathCables.push(edge.cable)
  }
  void dstIface

  return {
    ok: true,
    kind: simple ? 'simple' : 'complex',
    protocol,
    summary: `PDU ${spec.label} entregue a ${destination.name} (${ping.packet.dstIp}) em ${ping.latencyMs} ms.`,
    answer: answer.text,
    latencyMs: ping.latencyMs,
    path: ping.path,
    returnPath: ping.returnPath,
    hops: ping.hops,
    events: [
      ...ping.events,
      { deviceId: destination.id, level: 'ok', text: answer.text },
    ],
    packet,
    layers: buildLayers({
      protocol,
      source,
      destination,
      srcIface,
      dstIface,
      packet,
      pathCables,
    }),
  }
}

export const PDU_PROTOCOLS = Object.entries(PROTOCOLS).map(([key, value]) => ({
  key,
  label: value.label,
  layer4: value.layer4,
  port: value.port,
}))
