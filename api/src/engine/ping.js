import { categoryOf } from '../catalog.js'
import {
  isValidIpv4,
  isValidMask,
  macOf,
  networkOf,
  prefixLength,
  sameSubnet,
  stableJitter,
  subnetLabel,
} from './ip.js'
import { activeIpInterface } from './config.js'
import {
  buildTopology,
  edgeTo,
  findHostInLan,
  inspectSegment,
  isLanDevice,
  l2Path,
  lanHosts,
  mergePath,
  physicalPath,
} from './topology.js'

export const MAX_HOPS = 18

export function routingTable(device) {
  const connected = device.config.interfaces
    .filter((iface) => isValidIpv4(iface.ip) && isValidMask(iface.mask) && iface.status !== 'down')
    .map((iface) => ({
      kind: 'connected',
      network: networkOf(iface.ip, iface.mask),
      mask: iface.mask,
      prefix: prefixLength(iface.mask),
      iface,
    }))

  const statics = device.config.routes
    .filter((route) => isValidIpv4(route?.network) && isValidMask(route?.mask))
    .map((route) => ({
      kind: 'static',
      network: networkOf(route.network, route.mask),
      mask: route.mask,
      prefix: prefixLength(route.mask),
      nextHop: route.nextHop,
    }))

  return { connected, statics }
}

export function lookupRoute(device, dstIp) {
  const { connected, statics } = routingTable(device)
  const matches = []
  for (const route of connected) {
    if (networkOf(dstIp, route.mask) === route.network) matches.push(route)
  }
  for (const route of statics) {
    if (networkOf(dstIp, route.mask) === route.network) matches.push(route)
  }
  if (matches.length === 0) return null
  matches.sort((a, b) => {
    if (b.prefix !== a.prefix) return b.prefix - a.prefix
    if (a.kind === b.kind) return 0
    return a.kind === 'connected' ? -1 : 1
  })
  return matches[0]
}

function decide(topology, device, dstIp, dstMask) {
  const category = categoryOf(device)

  if (category === 'end') {
    const iface = device.config.interfaces.find(
      (entry) => isValidIpv4(entry.ip) && entry.status !== 'down'
    )
    if (!iface) {
      const down = device.config.interfaces.find(
        (entry) => entry.ip && entry.status === 'down'
      )
      if (down) {
        return {
          error: `A interface ${down.name} do ${device.name} está desligada (shutdown).`,
          code: 'link-down',
          hint: 'Execute "no shutdown" na interface ou ative-a no painel de configuração.',
        }
      }
      return {
        error: `${device.name} não tem endereço IP ativo — configure o IP na interface.`,
        code: 'no-ip',
        hint: 'Abra as configurações do equipamento e defina IP e máscara (ou peça um endereço por DHCP).',
      }
    }
    if (!isValidMask(iface.mask)) {
      return {
        error: iface.mask
          ? `A máscara "${iface.mask}" do ${device.name} não é válida: os bits de rede têm de ser contínuos.`
          : `${device.name} tem IP mas não tem máscara — sem ela não sabe qual é a sua sub-rede.`,
        code: 'mask',
        hint: `${device.name}: define a máscara 255.255.255.0 (ou /24).`,
      }
    }
    if (sameSubnet(iface.ip, iface.mask, dstIp, dstMask)) {
      return { local: true, iface }
    }
    if (!isValidIpv4(iface.gateway)) {
      return {
        error: `${device.name} está na sub-rede ${subnetLabel(iface.ip, iface.mask)} e o destino está noutra rede, mas não tem gateway padrão.`,
        code: 'gateway',
        hint: 'Configure o gateway com o IP da interface do router ligada a este segmento.',
      }
    }
    return { nextHop: iface.gateway, iface }
  }

  const route = lookupRoute(device, dstIp)
  if (!route) {
    return {
      error: `${device.name} não tem rota para ${dstIp} — falta de rota.`,
      code: 'route',
      hint: `Adicione uma rota estática ou ligue uma interface do ${device.name} à rede de destino.`,
    }
  }
  if (route.kind === 'connected') {
    return { local: true, iface: route.iface }
  }
  if (!isValidIpv4(route.nextHop)) {
    return {
      error: `A rota estática para ${route.network}/${route.prefix} do ${device.name} não tem um next-hop válido.`,
      code: 'route',
      hint: 'Indique o IP do router vizinho como next-hop da rota.',
    }
  }
  return { nextHop: route.nextHop, iface: route.iface ?? null }
}

function segmentNarrative(topology, segment, events, fromId, dstIp) {
  for (let index = 1; index < segment.length - 1; index += 1) {
    const device = topology.byId.get(segment[index])
    if (!device) continue
    const ingress = edgeTo(topology, device.id, segment[index - 1])
    const egress = edgeTo(topology, device.id, segment[index + 1])
    if (isLanDevice(device)) {
      const target = egress ? `pela porta ${egress.port}` : 'para o segmento local'
      events.push({
        deviceId: device.id,
        level: 'info',
        text: `O ${device.name} recebe o quadro${ingress ? ` em ${ingress.port}` : ''} e encaminha ${target}.`,
      })
    } else {
      events.push({
        deviceId: device.id,
        level: 'info',
        text: `${device.name} encaminha o pacote para ${dstIp}${egress ? ` pela interface ${egress.port}` : ''}.`,
      })
    }
  }
}

export function simulatePing(rawDevices, rawLinks, fromId, toId) {
  const topology = buildTopology(rawDevices, rawLinks)
  const from = topology.byId.get(fromId)
  const to = topology.byId.get(toId)
  const events = []
  const hops = []

  const fail = (message, code = 'error', hint = '') => {
    events.push({ level: 'erro', text: message })
    return { ok: false, code, reason: message, hint, events, hops, path: [], returnPath: [] }
  }

  if (!from || !to) return fail('Equipamento não encontrado no laboratório.', 'not-found')
  if (from.id === to.id) return fail('Escolha dois equipamentos diferentes.', 'same-device')

  events.push({
    deviceId: from.id,
    level: 'info',
    text: `${from.name} prepara um pacote ICMP (Echo Request).`,
  })

  if (!from.powered) return fail(`${from.name} está desligado.`, 'power')
  if (!to.powered) return fail(`${to.name} está desligado.`, 'power')

  const path = physicalPath(topology, from.id, to.id)
  if (!path) {
    return fail(
      `Não existe nenhum cabo ligando ${from.name} a ${to.name}.`,
      'no-cable',
      'Use a ferramenta de cabo para ligar os equipamentos (ou verifique as portas livres).'
    )
  }

  const srcIface = activeIpInterface(from)
  if (!srcIface) {
    const down = from.config.interfaces.find((entry) => entry.ip && entry.status === 'down')
    if (down) {
      return fail(
        `A interface ${down.name} do ${from.name} está desligada (shutdown).`,
        'link-down',
        'Execute "no shutdown" na interface ou ative-a no painel de configuração.'
      )
    }
    return fail(
      `${from.name} não tem endereço IP ativo — configure o IP na interface.`,
      'no-ip',
      'Abra as configurações do equipamento e defina IP e máscara (ou peça um endereço por DHCP).'
    )
  }
  if (!isValidMask(srcIface.mask)) {
    return fail(
      srcIface.mask
        ? `A máscara "${srcIface.mask}" do ${from.name} não é válida: os bits de rede têm de ser contínuos (ex.: 255.255.255.0).`
        : `${from.name} tem IP mas não tem máscara — sem ela não sabe qual é a sua sub-rede.`,
      'mask',
      `${from.name}: define a máscara 255.255.255.0 (ou /24) e volta a testar.`
    )
  }

  const dstIface = activeIpInterface(to)
  if (!dstIface) {
    return fail(
      `${to.name} não tem endereço IP ativo — o destino não pode responder.`,
      'no-ip',
      `Configure um IP válido no ${to.name}.`
    )
  }
  if (!isValidMask(dstIface.mask)) {
    return fail(
      dstIface.mask
        ? `A máscara "${dstIface.mask}" do ${to.name} não é válida: os bits de rede têm de ser contínuos.`
        : `${to.name} tem IP mas não tem máscara, por isso o destino não consegue responder.`,
      'mask',
      `${to.name}: define a máscara 255.255.255.0 (ou /24).`
    )
  }

  const dstIp = dstIface.ip
  const dstMask = dstIface.mask
  events.push({
    deviceId: from.id,
    level: 'info',
    text: `Destino: ${dstIp} (${to.name}). A origem ${srcIface.ip}/${prefixLength(srcIface.mask)} está em ${subnetLabel(srcIface.ip, srcIface.mask)}.`,
  })

  const routeDevices = [from.id]
  const visitedRouters = new Set([from.id])
  let current = from

  for (let step = 0; step < MAX_HOPS; step += 1) {
    if (current.id === to.id) break
    const decision = decide(topology, current, dstIp, dstMask)
    if (decision.error) return fail(decision.error, decision.code, decision.hint)

    if (decision.local) {
      const segment = l2Path(topology, current.id, to.id)
      if (!segment) {
        const physical = physicalPath(topology, current.id, to.id)
        if (physical) {
          return fail(
            `O ${to.name} não está no mesmo segmento que ${current.name}, mas a configuração trata o destino como local.`,
            'subnet',
            'Corrija a máscara de sub-rede ou o gateway: os dois equipamentos estão fisicamente ligados a segmentos diferentes.'
          )
        }
        return fail(
          `A rede de destino não está ligada ao ${current.name} — o pacote não encontra caminho.`,
          'route'
        )
      }
      const problem = inspectSegment(topology, segment)
      if (problem) return fail(problem.error, problem.code)
      mergePath(routeDevices, segment)

      if (segment.length === 2) {
        hops.push({ deviceId: current.id, name: current.name, action: 'entrega local' })
      }
      segmentNarrative(topology, segment, events, from.id, dstIp)
      hops.push({ deviceId: to.id, name: to.name, action: 'recebe e responde' })
      events.push({
        deviceId: to.id,
        level: 'ok',
        text: `${to.name} recebe o Echo Request e devolve o Echo Reply.`,
      })
      break
    }

    // Encaminhamento para o próximo salto
    const nextDevice = findHostInLan(topology, current.id, decision.nextHop)
    if (current.id === from.id) {
      if (nextDevice) {
        const gatewayIface = nextDevice.config.interfaces.find(
          (entry) => entry.ip === decision.nextHop
        )
        events.push({
          deviceId: from.id,
          level: 'info',
          text: `ARP: ${from.name} resolve o gateway ${decision.nextHop} → ${macOf(nextDevice.id, gatewayIface?.name ?? 'Eth0')} e envia o quadro para ${nextDevice.name}.`,
        })
      }
    }
    if (!nextDevice) {
      return fail(
        `${current.name} aponta para ${decision.nextHop}, mas nenhum equipamento com esse IP está no segmento local.`,
        'gateway',
        'O gateway ou next-hop não existe na rede local. Confirme o IP configurado no router e as ligações do segmento.'
      )
    }
    if (visitedRouters.has(nextDevice.id) && nextDevice.id !== to.id) {
      return fail(
        `Detetado um ciclo de encaminhamento entre ${current.name} e ${nextDevice.name}.`,
        'loop'
      )
    }

    const segment = l2Path(topology, current.id, nextDevice.id)
    if (!segment) {
      return fail(
        `${current.name} e ${nextDevice.name} não estão ligados pelo mesmo segmento físico.`,
        'no-cable'
      )
    }
    const problem = inspectSegment(topology, segment)
    if (problem) return fail(problem.error, problem.code)
    mergePath(routeDevices, segment)
    segmentNarrative(topology, segment, events, from.id, dstIp)

    if (categoryOf(current) === 'end') {
      events.push({
        deviceId: current.id,
        level: 'info',
        text: `O destino está fora da sub-rede local: ${current.name} envia o pacote ao gateway ${decision.nextHop}.`,
      })
    } else {
      events.push({
        deviceId: current.id,
        level: 'info',
        text: `${current.name} consulta a tabela de rotas e encaminha para ${decision.nextHop}.`,
      })
    }
    hops.push({
      deviceId: current.id,
      name: current.name,
      action: `encaminha para ${decision.nextHop}`,
      nextHop: decision.nextHop,
    })

    visitedRouters.add(nextDevice.id)
    current = nextDevice
  }

  if (routeDevices[routeDevices.length - 1] !== to.id) {
    return fail(
      `O pacote não chegou a ${to.name}: limite de saltos atingido.`,
      'ttl',
      'Verifique as rotas e possíveis ciclos entre routers.'
    )
  }

  const routerCount = routeDevices.filter((id) => categoryOf(topology.byId.get(id)) === 'router').length
  const latencyMs = 1 + stableJitter(from.id, to.id) + Math.min(routerCount, 3)
  const ttl = 128 - Math.max(0, routerCount - 1)
  const arp = lanHosts(topology, from.id)



  const packet = {
    protocol: 'ICMP',
    type: 'Echo Request',
    srcIp: srcIface.ip,
    dstIp,
    srcMac: macOf(from.id, srcIface.name),
    dstMac: macOf(to.id, dstIface.name),
    ttl,
    status: 'entregue',
    nextHop: hops[0]?.nextHop ?? dstIp,
  }

  return {
    ok: true,
    protocol: 'ICMP',
    path: routeDevices,
    returnPath: [...routeDevices].reverse(),
    hops,
    events,
    latencyMs,
    ttl,
    packet,
    arp,
    summary: `Resposta de ${dstIp}: tempo=${latencyMs}ms TTL=${ttl}`,
    routeLabel: `${from.name} → ${to.name}`,
  }
}

/** Rota completa em unidades L3, usada por tracert. */
export function simulateTraceroute(devices, links, fromId, toId) {
  const result = simulatePing(devices, links, fromId, toId)
  if (!result.ok) return result
  const topology = buildTopology(devices, links)
  const l3 = result.path
    .map((id) => topology.byId.get(id))
    .filter((device) => device && categoryOf(device) !== 'switch' && categoryOf(device) !== 'ap')
  const hops = l3.map((device, index) => {
    const iface = activeIpInterface(device)
    return {
      hop: index + 1,
      name: device.name,
      ip: iface?.ip ?? '—',
      latencyMs: 1 + stableJitter(fromId, device.id) + index,
    }
  })
  return { ...result, hops }
}
