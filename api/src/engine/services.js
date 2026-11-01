import { isValidIpv4, isValidMask, ipToInt, intToIp, networkOf, sameSubnet, macOf } from './ip.js'
import { buildTopology, l2Devices } from './topology.js'

const validPool = (pool) =>
  Boolean(
    pool &&
      isValidIpv4(pool.network) &&
      isValidMask(pool.mask) &&
      isValidIpv4(pool.start) &&
      isValidIpv4(pool.end) &&
      ipToInt(pool.start) <= ipToInt(pool.end) &&
      networkOf(pool.start, pool.mask) === networkOf(pool.network, pool.mask) &&
      networkOf(pool.end, pool.mask) === networkOf(pool.network, pool.mask)
  )

function findDhcpServer(topology, client) {
  return l2Devices(topology, client.id).find(
    (device) => device.config.services?.dhcp?.enabled && validPool(device.config.services.dhcp.pool)
  )
}

export function usedIps(topology) {
  const used = new Set()
  for (const device of topology.devices) {
    for (const iface of device.config.interfaces) {
      if (isValidIpv4(iface.ip)) used.add(iface.ip)
    }
  }
  return used
}

/** Processo DORA completo sobre a topologia real. */
export function requestDhcp(rawDevices, rawLinks, clientId) {
  const topology = buildTopology(rawDevices, rawLinks)
  const client = topology.byId.get(clientId)
  const events = []
  const fail = (message, hint = '') => {
    events.push({ level: 'erro', text: message })
    return { ok: false, reason: message, hint, events }
  }

  if (!client) return fail('Equipamento não encontrado.')
  if (!client.powered) return fail(`${client.name} está desligado.`)

  const iface =
    client.config.interfaces.find((entry) => entry.wireless) ?? client.config.interfaces[0]
  if (!iface) return fail(`${client.name} não tem interfaces de rede.`)

  const server = findDhcpServer(topology, client)
  if (!server) {
    return fail(
      `Nenhum servidor DHCP ativo no domínio de difusão do ${client.name}.`,
      'Ative o serviço DHCP num servidor ligado ao mesmo switch e configure um intervalo válido.'
    )
  }

  const pool = server.config.services.dhcp.pool
  if (!sameSubnet(pool.network, pool.mask, pool.start, pool.mask)) {
    return fail(`O intervalo do servidor ${server.name} não pertence à rede ${pool.network}.`)
  }
  if (!sameSubnet(pool.network, pool.mask, pool.gateway || pool.start, pool.mask)) {
    return fail(`O gateway do servidor ${server.name} não pertence à rede ${pool.network}.`)
  }

  const used = usedIps(topology)
  let candidate = null
  for (let value = ipToInt(pool.start); value <= ipToInt(pool.end); value += 1) {
    const ip = intToIp(value)
    if (ip === pool.gateway) continue
    if (used.has(ip)) continue
    candidate = ip
    break
  }
  if (!candidate) {
    return fail(
      `O servidor ${server.name} não tem endereços livres no intervalo ${pool.start}–${pool.end}.`,
      'Aumente o intervalo do pool ou liberte endereços.'
    )
  }

  events.push({
    deviceId: client.id,
    level: 'info',
    text: `DHCP DISCOVER — ${client.name} envia o pedido em broadcast.`,
  })
  events.push({
    deviceId: server.id,
    level: 'info',
    text: `DHCP OFFER — ${server.name} oferece ${candidate}/${pool.mask}.`,
  })
  events.push({
    deviceId: client.id,
    level: 'info',
    text: `DHCP REQUEST — ${client.name} pede formalmente o endereço ${candidate}.`,
  })
  events.push({
    deviceId: server.id,
    level: 'ok',
    text: `DHCP ACK — ${server.name} confirma a atribuição (gateway ${pool.gateway || '—'}, DNS ${pool.dns || '—'}).`,
  })

  iface.ip = candidate
  iface.mask = pool.mask
  iface.gateway = pool.gateway || ''
  iface.dhcp = true

  return {
    ok: true,
    events,
    lease: {
      ip: candidate,
      mask: pool.mask,
      gateway: pool.gateway || '',
      dns: pool.dns || '',
      server: server.name,
      duration: '24h',
    },
    config: client.config,
    deviceId: client.id,
    interface: iface.name,
    summary: `${client.name} recebeu ${candidate}/${pool.mask} por DHCP do ${server.name}.`,
  }
}

export function resolveDns(rawDevices, rawLinks, clientId, name) {
  const topology = buildTopology(rawDevices, rawLinks)
  const client = topology.byId.get(clientId)
  const events = []
  if (!client) return { ok: false, reason: 'Equipamento não encontrado.', events }

  const domain = String(name ?? '').trim()
  if (!domain) return { ok: false, reason: 'Indique um nome de domínio.', events }

  const server = l2Devices(topology, client.id).find(
    (device) => device.config.services?.dns?.enabled
  )
  if (!server) {
    events.push({ level: 'erro', text: `Nenhum servidor DNS ativo no segmento do ${client.name}.` })
    return {
      ok: false,
      reason: `Nenhum servidor DNS ativo no segmento do ${client.name}.`,
      hint: 'Ative o serviço DNS num servidor e registe o nome de domínio.',
      events,
    }
  }

  const record = (server.config.services.dns.records ?? []).find(
    (entry) => String(entry.name).toLowerCase() === domain.toLowerCase()
  )
  const iface = client.config.interfaces.find((entry) => entry.ip)
  events.push({
    deviceId: client.id,
    level: 'info',
    text: `O ${client.name} envia a consulta DNS de "${domain}" para o ${server.name}.`,
  })

  if (!record || !isValidIpv4(record.ip)) {
    events.push({
      deviceId: server.id,
      level: 'erro',
      text: `O servidor ${server.name} respondeu NXDOMAIN: "${domain}" não está registado.`,
    })
    return {
      ok: false,
      reason: `O servidor ${server.name} não tem o registo "${domain}".`,
      hint: 'Adicione o registo DNS no separador do servidor.',
      events,
    }
  }

  events.push({
    deviceId: server.id,
    level: 'ok',
    text: `${server.name} respondeu ${record.ip} para "${domain}".`,
  })
  return {
    ok: true,
    name: domain,
    ip: record.ip,
    server: server.name,
    clientIp: iface?.ip ?? '',
    clientMac: macOf(client.id, iface?.name ?? 'Eth0'),
    events,
    summary: `${domain} → ${record.ip} (servidor ${server.name})`,
  }
}

/** Serviços disponíveis num servidor — usado pelo navegador simulado. */
export function resolveService(rawDevices, rawLinks, clientId, hostname, service) {
  const topology = buildTopology(rawDevices, rawLinks)
  const client = topology.byId.get(clientId)
  if (!client) return { ok: false, reason: 'Equipamento não encontrado.' }

  const key = String(service ?? 'http').toLowerCase()
  const host = l2Devices(topology, client.id).find(
    (device) =>
      device.config.services?.[key]?.enabled &&
      (String(device.config.hostname || device.name).toLowerCase() === String(hostname).toLowerCase() ||
        (device.config.services?.dns?.enabled &&
          (device.config.services.dns.records ?? []).some(
            (record) =>
              String(record.name).toLowerCase() === String(hostname).toLowerCase() &&
              record.ip === device.config.interfaces.find((entry) => entry.ip)?.ip
          )))
  )

  if (!host) {
    return {
      ok: false,
      reason: `Não foi possível abrir ${key}://${hostname}: nenhum serviço ${key.toUpperCase()} ativo e alcançável no segmento.`,
    }
  }

  return {
    ok: true,
    service: key,
    server: host.name,
    content: `${host.name} — serviço ${key.toUpperCase()} simulado pelo NETLAB ACADEMY.`,
  }
}
