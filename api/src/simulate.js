const IPV4_PATTERN =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

export function isValidIpv4(value) {
  return typeof value === 'string' && IPV4_PATTERN.test(value.trim())
}

const octets = (value) => value.trim().split('.').map(Number)

export function networkOf(ip, mask) {
  if (!isValidIpv4(ip) || !isValidIpv4(mask)) return null
  const address = octets(ip)
  const maskBits = octets(mask)
  return address.map((part, index) => part & maskBits[index]).join('.')
}

function prefixLength(mask) {
  return octets(mask)
    .map((part) => part.toString(2).padStart(8, '0'))
    .join('')
    .split('')
    .filter((bit) => bit === '1').length
}

export function subnetLabel(ip, mask) {
  const network = networkOf(ip, mask)
  return network ? `${network}/${prefixLength(mask)}` : 'sub-rede indefinida'
}

function sameSubnet(ipA, maskA, ipB, maskB) {
  const netA = networkOf(ipA, maskA)
  const netB = networkOf(ipB, maskB || maskA)
  return netA !== null && netB !== null && netA === netB
}

function interfacesOf(device) {
  return [
    { ip: device.ip, mask: device.mask },
    { ip: device.ip2, mask: device.mask2 },
  ].filter((iface) => isValidIpv4(iface.ip) && isValidIpv4(iface.mask))
}

function findPath(devices, links, fromId, toId) {
  const adjacency = new Map(devices.map((device) => [device.id, []]))
  for (const link of links) {
    if (!adjacency.has(link.a_id) || !adjacency.has(link.b_id)) continue
    adjacency.get(link.a_id).push(link.b_id)
    adjacency.get(link.b_id).push(link.a_id)
  }

  const previous = new Map([[fromId, null]])
  const queue = [fromId]

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === toId) break
    for (const next of adjacency.get(current) ?? []) {
      if (previous.has(next)) continue
      previous.set(next, current)
      queue.push(next)
    }
  }

  if (!previous.has(toId)) return null

  const path = []
  for (let current = toId; current !== null; current = previous.get(current)) {
    path.unshift(current)
  }
  return path
}

function checkPcToRouter(pc, router) {
  const label = subnetLabel(pc.ip, pc.mask)
  const iface = interfacesOf(router).find((entry) =>
    sameSubnet(entry.ip, entry.mask, pc.ip, pc.mask)
  )

  if (!iface) {
    return `O ${router.name} não tem interface na sub-rede ${label} do ${pc.name}.`
  }
  if (!isValidIpv4(pc.gateway)) {
    return `${pc.name} está sem gateway padrão — use ${iface.ip} (IP do ${router.name}).`
  }
  if (pc.gateway.trim() !== iface.ip) {
    return `O gateway do ${pc.name} (${pc.gateway}) deveria ser ${iface.ip} — IP do ${router.name} em ${label}.`
  }
  return null
}

function checkRouterToRouter(routerA, routerB) {
  const compatible = interfacesOf(routerA).some((ifaceA) =>
    interfacesOf(routerB).some((ifaceB) =>
      sameSubnet(ifaceA.ip, ifaceA.mask, ifaceB.ip, ifaceB.mask)
    )
  )
  if (!compatible) {
    return `${routerA.name} e ${routerB.name} não compartilham nenhuma sub-rede — configure IPs na mesma faixa nas interfaces ligadas.`
  }
  return null
}

export function simulatePing(devices, links, fromId, toId) {
  const byId = new Map(devices.map((device) => [device.id, device]))
  const from = byId.get(fromId)
  const to = byId.get(toId)
  const log = []
  const fail = (text) => {
    log.push({ level: 'erro', text })
    return { ok: false, log }
  }

  if (!from || !to) return fail('Dispositivo não encontrado.')
  if (from.id === to.id) return fail('Escolha dois dispositivos diferentes.')
  if (from.type !== 'pc' || to.type !== 'pc') {
    return fail('O teste de ping compara dois computadores (PCs).')
  }

  const path = findPath(devices, links, from.id, to.id)
  if (!path) {
    return fail(`Não há cabo ligando ${from.name} a ${to.name}. Monte o caminho físico primeiro.`)
  }

  const hops = path.map((id) => byId.get(id))
  log.push({ level: 'info', text: `Caminho físico: ${hops.map((hop) => hop.name).join(' → ')}` })

  const missingIp = [from, to].filter(
    (device) => !isValidIpv4(device.ip) || !isValidIpv4(device.mask)
  )
  if (missingIp.length > 0) {
    return fail(`${missingIp.map((device) => device.name).join(' e ')} sem IP ou máscara válidos.`)
  }

  // Switches only repeat frames, so routing decisions happen between the rest.
  const logical = hops.filter((device) => device.type !== 'switch')

  if (logical.length === 2) {
    if (!sameSubnet(from.ip, from.mask, to.ip, to.mask)) {
      return fail(
        `${from.name} e ${to.name} estão em sub-redes diferentes — coloque um roteador entre eles.`
      )
    }
    log.push({
      level: 'ok',
      text: `Mesma sub-rede ${subnetLabel(from.ip, from.mask)}: o switch entregou os quadros direto.`,
    })
    log.push({ level: 'ok', text: `Resposta de ${to.name} recebida.` })
    return { ok: true, log }
  }

  for (let index = 0; index < logical.length - 1; index += 1) {
    const current = logical[index]
    const next = logical[index + 1]

    if (current.type === 'pc' && next.type === 'router') {
      const problem = checkPcToRouter(current, next)
      if (problem) return fail(problem)
      log.push({
        level: 'ok',
        text: `${current.name} (${current.ip}) usa o gateway ${current.gateway} do ${next.name}.`,
      })
    } else if (current.type === 'router' && next.type === 'pc') {
      const problem = checkPcToRouter(next, current)
      if (problem) return fail(problem)
      log.push({
        level: 'ok',
        text: `${next.name} (${next.ip}) usa o gateway ${next.gateway} do ${current.name}.`,
      })
    } else if (current.type === 'router' && next.type === 'router') {
      const problem = checkRouterToRouter(current, next)
      if (problem) return fail(problem)
      log.push({
        level: 'ok',
        text: `${current.name} e ${next.name} estão na mesma sub-rede.`,
      })
    }
  }

  log.push({
    level: 'ok',
    text: `Resposta de ${to.name} (${to.ip}) recebida em ${logical.length} saltos.`,
  })
  return { ok: true, log }
}
