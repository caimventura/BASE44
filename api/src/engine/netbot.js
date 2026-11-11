import { DEVICE_CATALOG } from '../catalog.js'
import { buildTopology, isLanDevice, l2Devices } from './topology.js'
import {
  intToIp,
  ipToInt,
  isValidIpv4,
  isValidMask,
  networkOf,
  prefixLength,
  subnetLabel,
} from './ip.js'
import { activeIpInterface } from './config.js'
import { simulatePing } from './ping.js'

const list = (items) => items.map((item) => `• ${item}`).join('\n')
const isEnd = (device) => DEVICE_CATALOG[device.type]?.category === 'end'
const ends = (topology) => topology.devices.filter(isEnd)
const routersOf = (topology) => topology.devices.filter((device) => ['router', 'firewall', 'modem'].includes(device.type))

/** Máscara por classe histórica — usada quando não há melhor informação. */
export function classMask(ip) {
  if (!isValidIpv4(ip)) return '255.255.255.0'
  const first = Number(ip.split('.')[0])
  if (first >= 1 && first <= 126) return '255.0.0.0'
  if (first >= 128 && first <= 191) return '255.255.0.0'
  return '255.255.255.0'
}

export function classOf(ip) {
  if (!isValidIpv4(ip)) return null
  const first = Number(ip.split('.')[0])
  if (first >= 1 && first <= 126) return 'A'
  if (first >= 128 && first <= 191) return 'B'
  if (first >= 192 && first <= 223) return 'C'
  if (first >= 224 && first <= 239) return 'D (multicast)'
  if (first >= 240 && first <= 255) return 'E (reservada)'
  return null
}

export const isPrivateIp = (ip) => {
  if (!isValidIpv4(ip)) return false
  const [a, b] = ip.split('.').map(Number)
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

function usedAddresses(topology) {
  const used = new Set()
  for (const device of topology.devices) {
    for (const iface of device.config.interfaces ?? []) {
      if (isValidIpv4(iface.ip)) used.add(iface.ip)
    }
  }
  return used
}

/** Rede a usar para um equipamento: segue o segmento real antes de inventar. */
export function suggestedNetwork(topology, device) {
  const own = activeIpInterface(device)
  if (own && isValidIpv4(own.ip) && isValidMask(own.mask)) {
    return { network: networkOf(own.ip, own.mask), mask: own.mask, source: `${device.name} já tem ${subnetLabel(own.ip, own.mask)}` }
  }
  const segment = l2Devices(topology, device.id)
  for (const peer of segment) {
    const iface = activeIpInterface(peer)
    if (iface && isValidIpv4(iface.ip) && isValidMask(iface.mask)) {
      return { network: networkOf(iface.ip, iface.mask), mask: iface.mask, source: `segue a rede de ${peer.name}` }
    }
    for (const entry of peer.config.interfaces ?? []) {
      if (isValidIpv4(entry.ip) && isValidMask(entry.mask)) {
        return { network: networkOf(entry.ip, entry.mask), mask: entry.mask, source: `segue a rede configurada no ${peer.name}` }
      }
    }
  }
  return { network: '192.168.1.0', mask: '255.255.255.0', source: 'rede local de exemplo' }
}

/** Gateway real do segmento, se existir um router com IP na mesma rede. */
export function gatewayFor(topology, device, network, mask) {
  const segment = l2Devices(topology, device.id)
  for (const peer of segment) {
    if (!['router', 'firewall', 'modem', 'wireless_router', 'multilayer_switch'].includes(peer.type)) continue
    for (const entry of peer.config.interfaces ?? []) {
      if (isValidIpv4(entry.ip) && isValidMask(entry.mask) && networkOf(entry.ip, entry.mask) === networkOf(network, mask)) {
        return { ip: entry.ip, device: peer.name }
      }
    }
  }
  return null
}

/** Primeiro endereço livre a partir de ``.10`` (evita rede, broadcast, gateway e usados). */
export function freeHost(topology, network, mask, avoid = []) {
  const used = usedAddresses(topology)
  const avoidSet = new Set(avoid.filter(Boolean))
  const base = ipToInt(networkOf(network, mask))
  const prefix = prefixLength(mask)
  const size = 2 ** (32 - prefix)
  const first = prefix >= 30 ? 1 : 10
  for (let offset = first; offset < size - 1; offset += 1) {
    const candidate = intToIp(base + offset)
    if (used.has(candidate) || avoidSet.has(candidate)) continue
    return candidate
  }
  return null
}

/** Alvo de uma pergunta: nome explícito, depois o equipamento selecionado. */
export function resolveTarget(topology, question, selectedDeviceId) {
  const text = String(question ?? '')
  const mentioned = topology.devices
    .filter((device) => new RegExp(`\\b${device.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text))
    .sort((a, b) => b.name.length - a.name.length)
  if (mentioned.length > 0) return mentioned[0]
  const selected = Number(selectedDeviceId)
  if (Number.isInteger(selected) && selected > 0) {
    const device = topology.byId.get(selected)
    if (device) return device
  }
  if (/esta máquina|esta maquina|este pc|este computador|deste equipamento/i.test(text)) {
    const firstEnd = ends(topology)[0]
    if (firstEnd) return firstEnd
  }
  return null
}

function interfaceName(device) {
  const iface = device.config.interfaces?.find((entry) => entry.wireless) ?? device.config.interfaces?.[0]
  return iface?.name ?? 'Eth0'
}

function addressAction(device, { ip, mask, gateway, dns, note }) {
  return {
    kind: 'applyAddress',
    deviceId: device.id,
    deviceName: device.name,
    interface: interfaceName(device),
    ip,
    mask,
    gateway: gateway ?? '',
    dns: dns ?? '',
    note: note ?? '',
  }
}

function ipSuggestion(topology, device) {
  const { network, mask } = suggestedNetwork(topology, device)
  const gateway = gatewayFor(topology, device, network, mask)
  const ip = freeHost(topology, network, mask, [gateway?.ip])
  return { ip, mask, network, gateway: gateway?.ip ?? '', gatewayDevice: gateway?.device ?? '', dns: gateway ? '8.8.8.8' : '' }
}

function formatAddressBlock(device, values) {
  const lines = [
    `${device.name}:`,
    `IP: ${values.ip ?? '—'}`,
    `Máscara: ${values.mask ?? '—'}`,
  ]
  if (values.gateway) lines.push(`Gateway: ${values.gateway}`)
  if (values.dns) lines.push(`DNS: ${values.dns}`)
  if (!values.gateway) lines.push('Gateway: não é necessário nesta rede local')
  return lines.join('\n')
}

function dhcpAnswer(topology, server, offered) {
  if (!server) {
    return {
      answer: [
        'Neste laboratório não existe nenhum servidor com DHCP ativo — por isso nenhum computador recebe endereço automaticamente.',
        '',
        'Para montar o serviço:',
        '1. Adiciona um servidor e liga-o ao mesmo switch dos clientes.',
        '2. Abre as configurações → Serviços → ativa DHCP.',
        '3. Define o pool:',
        '   • Rede: 192.168.1.0',
        '   • Máscara: 255.255.255.0',
        '   • Primeiro endereço: 192.168.1.100',
        '   • Último endereço: 192.168.1.150',
        '   • Gateway: 192.168.1.1',
        '   • DNS: 8.8.8.8',
        '',
        'Depois, no computador, escolhe "Obter IP por DHCP". Sem esse servidor, o pedido falha — e é isso que deve acontecer.',
      ].join('\n'),
      suggestions: ['Adiciona um servidor e ativa o DHCP', 'Como funciona o processo DORA?', 'Dá-me um IP para o PC0'],
      actions: [],
    }
  }
  const pool = server.config.services.dhcp.pool
  return {
    answer: [
      `O servidor DHCP ativo é ${server.name}.`,
      `Pool atual: ${pool.start || '—'} a ${pool.end || '—'}, máscara ${pool.mask || '—'}${pool.gateway ? `, gateway ${pool.gateway}` : ''}.`,
      '',
      offered
        ? `${offered.name} ainda não tem IP. Clica em "Obter IP por DHCP" e vais ver os quatro passos DORA.`
        : 'Nos computadores, escolhe "Obter IP por DHCP" para receber endereço, máscara, gateway e DNS.',
      '',
      'DORA: Discover (procura), Offer (oferta), Request (pedido) e Acknowledge (confirmação).',
    ].join('\n'),
    suggestions: ['Dá-me um IP para o PC0', 'Porque é que o meu ping falha?', 'Explica o processo DORA'],
    actions: [],
  }
}

/** Diagnóstico detalhado, mas devolve apenas o problema mais importante. */
function diagnosisAnswer(topology, question, target) {
  const candidates = ends(topology)
  const mentioned = candidates.filter((device) =>
    new RegExp(`\\b${device.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(String(question ?? ''))
  )
  const pair =
    mentioned.length >= 2
      ? [mentioned[0], mentioned[1]]
      : target && target.id
        ? [target, candidates.find((device) => device.id !== target.id) ?? candidates[1]]
        : [candidates[0], candidates[1]]

  if (!pair[0] || !pair[1]) {
    return {
      answer: 'Preciso de dois equipamentos finais na topologia para testar a comunicação. Adiciona dois computadores e liga-os.',
      suggestions: ['Adiciona dois computadores e um switch', 'Dá-me um IP para o PC0'],
      actions: [],
    }
  }

  const [from, to] = pair
  const result = simulatePing(topology.devices, topology.links, from.id, to.id)

  if (result.ok) {
    return {
      answer: [
        `Testei ${from.name} → ${to.name} e a comunicação funciona (${result.latencyMs} ms).`,
        '',
        `Caminho: ${result.path.map((id) => topology.byId.get(id)?.name).filter(Boolean).join(' → ')}.`,
      ].join('\n'),
      suggestions: ['Como configuro duas redes com router?', 'Explica a máscara de sub-rede'],
      actions: [],
    }
  }

  const causes = {
    'no-ip': 'sem endereço IPv4 o equipamento não tem identidade na rede: não consegue enviar nem responder a um ping.',
    mask: 'sem uma máscara válida não é possível saber que endereços são vizinhos, por isso a sub-rede fica indefinida.',
    gateway: 'o destino está noutra sub-rede e não há gateway padrão para sair da rede local.',
    'link-down': 'a interface tem cabo mas está desligada (shutdown) e não transmite.',
    'no-cable': 'não existe caminho físico entre a origem e o destino.',
    vlan: 'as portas do switch estão em VLANs diferentes, por isso o quadro não atravessa o segmento.',
    route: 'o router não tem nenhuma rota que alcance a rede de destino.',
    subnet: 'a máscara ou o gateway tratam o destino como local quando ele está noutro segmento.',
    power: 'um dos equipamentos está desligado.',
    loop: 'existe um ciclo de encaminhamento entre routers.',
  }
  const cause = causes[result.code] ?? 'a configuração atual impede que o pacote chegue ao destino.'
  const deviceId = result.code === 'no-ip' || result.code === 'mask' || result.code === 'gateway' ? from.id : null
  const owner = deviceId ? topology.byId.get(deviceId) : null
  const example = (() => {
    if (!owner) return ''
    const values = ipSuggestion(topology, owner)
    const block = formatAddressBlock(owner, values)
    return `\nExemplo de configuração correta:\n${block}`
  })()

  const more = []
  const otherProblems = candidates.filter((device) => !activeIpInterface(device) && device.id !== from.id && device.id !== to.id)

  return {
    answer: [
      `Problem: ${result.reason}`,
      owner ? `Onde: ${owner.name}.` : `Onde: entre ${from.name} e ${to.name}.`,
      `Porquê: ${cause}`,
      `Como corrigir: ${result.hint || 'corrige a configuração indicada e volta a testar.'}`,
      example,
      otherProblems.length > 0
        ? `\nHá mais ${otherProblems.length} equipamento(s) sem IP (${otherProblems.map((d) => d.name).join(', ')}). Queres que analise esses também?`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
    suggestions: [
      'Dá-me um IP para esta máquina',
      'Como configuro duas redes com router?',
      otherProblems.length > 0 ? 'Quais os outros problemas?' : 'Explica a máscara de sub-rede',
    ],
    actions: owner && result.code === 'no-ip' ? [addressAction(owner, ipSuggestion(topology, owner))] : [],
  }
}

/** NETBOT: responde à pergunta feita, com dados reais do laboratório. */
export function answerNetbot({ question, devices, links, selectedDeviceId }) {
  const topology = buildTopology(devices, links)
  const text = String(question ?? '').trim()
  const lower = text.toLowerCase()
  const target = resolveTarget(topology, text, selectedDeviceId)
  const allEnds = ends(topology)

  if (!text) {
    return {
      answer: 'Olá! Pergunta o que precisas — por exemplo, um IP para um equipamento, a máscara de um endereço ou porque falha um ping.',
      suggestions: ['Dá-me um IP para o PC0', 'Qual é a máscara para 192.168.1.10?', 'Porque é que o meu ping falha?'],
      actions: [],
    }
  }

  // 1. Pedido de diagnóstico
  if (/porque|porquê|por que|falha|não consigo|nao consigo|erro|não funciona|nao funciona|problema/.test(lower)) {
    return diagnosisAnswer(topology, text, target)
  }

  // 2. Pedido de IP para um equipamento
  if (/\bip\b|endereço|endereco/.test(lower) && /d[aá]-me|da-me|que ip|qual ip|um ip|atribui|sugere|para o|para a/.test(lower)) {
    if (!target) {
      return {
        answer: `Diz-me para que equipamento queres o endereço (por exemplo: "Dá-me um IP para o ${allEnds[0]?.name ?? 'PC0'}"). Se selecionares um equipamento no mapa, eu uso esse.`,
        suggestions: [`Dá-me um IP para o ${allEnds[0]?.name ?? 'PC0'}`, 'Como configuro o PC0 e o PC1?'],
        actions: [],
      }
    }
    const values = ipSuggestion(topology, target)
    if (!values.ip) {
      return {
        answer: `Não há endereços livres na rede ${values.network}/${prefixLength(values.mask)}. Escolhe outra rede ou liberta endereços.`,
        suggestions: [],
        actions: [],
      }
    }
    const line = formatAddressBlock(target, values)
    const cls = classOf(values.ip)
    return {
      answer: [
        `Claro! Coloca estes valores no ${target.name}:`,
        '',
        line,
        '',
        `Este endereço pertence a uma rede privada${cls ? ` (classe ${cls.replace(' (multicast)', '').replace(' (reservada)', '')} no modelo tradicional)` : ''}.`,
        values.gateway ? `O gateway ${values.gateway} é o router deste segmento.` : 'Como não há outro equipamento fora desta rede, o gateway não é necessário.',
      ].join('\n'),
      suggestions: [`Configurar ${target.name} e outro PC`, 'Porque é que o meu ping falha?', 'Como configuro DHCP?'],
      actions: [addressAction(target, values)],
    }
  }

  // 3. Pedido de máscara para um IP concreto
  const ipMatch = text.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/)
  if (/m[aá]scara|prefixo|\/\d{1,2}\b/.test(lower) && ipMatch) {
    const ip = ipMatch[1]
    if (!isValidIpv4(ip)) {
      return {
        answer: `O endereço "${ip}" não é um IPv4 válido: cada octeto tem de estar entre 0 e 255.`,
        suggestions: ['Qual é a máscara para 192.168.1.10?'],
        actions: [],
      }
    }
    const mask = classMask(ip)
    const prefix = prefixLength(mask)
    const network = networkOf(ip, mask)
    const hostPart = ip.slice(network.length + 1) || String(ipToInt(ip) - ipToInt(network))
    return {
      answer: [
        `A máscara mais comum para esta rede é ${mask} (/${prefix}).`,
        '',
        `Com ela, a rede será ${network} e ${ip} fica como host (${hostPart}).`,
        '',
        `Isso significa que os dispositivos entre ${network} e ${subnetLabel(intToIp(ipToInt(network) + 2 ** (32 - prefix) - 2), mask)} podem comunicar diretamente na rede local, desde que as ligações e restantes configurações estejam corretas.`,
      ].join('\n'),
      suggestions: target ? [`Dá-me um IP para o ${target.name}`] : ['Dá-me um IP para o PC0', 'Explica a operação AND'],
      actions: target && isValidIpv4(ip)
        ? [addressAction(target, { ip, mask, gateway: '', dns: '' })]
        : [],
    }
  }

  // 4. Configuração de dois computadores
  if (/configurar|prepara|p[oõ]e|colocar/.test(lower) && allEnds.length >= 2 && !/dhcp|dns|vlan|router|rota/.test(lower)) {
    const mentionedEnds = allEnds.filter((device) =>
      new RegExp(`\\b${device.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
    )
    const pair = mentionedEnds.length >= 2 ? mentionedEnds.slice(0, 2) : allEnds.slice(0, 2)
    const [from, to] = pair
    const { network, mask } = suggestedNetwork(topology, from)
    const gateway = gatewayFor(topology, from, network, mask)
    const first = freeHost(topology, network, mask, [gateway?.ip])
    const second = freeHost(topology, network, mask, [gateway?.ip, first])
    const valuesA = { ip: first, mask, gateway: gateway?.ip ?? '', dns: gateway ? '8.8.8.8' : '' }
    const valuesB = { ip: second, mask, gateway: gateway?.ip ?? '', dns: gateway ? '8.8.8.8' : '' }
    return {
      answer: [
        `Vamos configurar os dois computadores na mesma rede (${network}/${prefixLength(mask)}).`,
        '',
        formatAddressBlock(from, valuesA),
        '',
        formatAddressBlock(to, valuesB),
        '',
        gateway
          ? `O gateway ${gateway.ip} é a interface do ${gateway.device} nesta rede.`
          : 'Gateway: não é necessário para comunicar apenas entre estes dois computadores na mesma sub-rede.',
        '',
        'Depois de configurar, executa no terminal:',
        `ping ${to.name === from.name ? '—' : valuesB.ip}`,
        '',
        'Se estiverem ligados corretamente e as interfaces estiverem ativas, obtêm resposta.',
      ].join('\n'),
      suggestions: ['Porque é que o meu ping falha?', 'Como configuro DHCP?'],
      actions: [addressAction(from, valuesA), addressAction(to, valuesB)],
    }
  }

  // 5. DHCP
  if (/dhcp|dora|endere[cç]o autom[aá]tico/.test(lower)) {
    const server = topology.devices.find((device) => device.config.services?.dhcp?.enabled)
    const client = allEnds.find((device) => !activeIpInterface(device)) ?? allEnds[0]
    return dhcpAnswer(topology, server, client)
  }

  // 6. DNS
  if (/dns|nslookup|nome de dom[ií]nio|dom[ií]nio/.test(lower)) {
    const server = topology.devices.find((device) => device.config.services?.dns?.enabled)
    if (!server) {
      return {
        answer: [
          'Não há servidor DNS ativo neste laboratório.',
          '',
          'Para configurar:',
          '1. Liga um servidor ao mesmo switch dos clientes.',
          '2. Ativa o serviço DNS nas configurações do servidor.',
          '3. Registe um nome, por exemplo www.netlab.local → 192.168.1.10.',
          '4. No cliente, indica esse servidor como DNS e testa com: nslookup www.netlab.local',
        ].join('\n'),
        suggestions: ['Como configuro DHCP?', 'Dá-me um IP para o PC0'],
        actions: [],
      }
    }
    const records = server.config.services.dns.records ?? []
    return {
      answer: [
        `Servidor DNS ativo: ${server.name}.`,
        records.length ? `Registos:\n${list(records.map((record) => `${record.name} → ${record.ip}`))}` : 'Ainda não tem registos configurados.',
        '',
        'No cliente, configura este servidor como DNS e testa com nslookup <nome>.',
      ].join('\n'),
      suggestions: ['Adiciona o registo www.netlab.local'],
      actions: [],
    }
  }

  // 7. VLANs
  if (/vlan|trunk|isolamento/.test(lower)) {
    const vlanDevices = topology.devices.filter((device) => (device.config.vlans ?? []).length > 1)
    if (vlanDevices.length === 0) {
      return {
        answer: [
          'Este laboratório ainda não tem VLANs (só a VLAN 1, a predefinida).',
          '',
          'Num switch: separador VLANs → cria a VLAN 10 e a VLAN 20 → associa portas a cada uma.',
          'Equipamentos em VLANs diferentes não comunicam sem um router com subinterfaces.',
        ].join('\n'),
        suggestions: ['Explica o que é uma VLAN', 'Como configuro um trunk?'],
        actions: [],
      }
    }
    const lines = vlanDevices.map((device) => {
      const vlans = device.config.vlans.map((vlan) => {
        const ports = device.config.interfaces
          .filter((iface) => iface.mode !== 'trunk' && Number(iface.vlan ?? 1) === Number(vlan.id))
          .map((iface) => iface.name)
        return `VLAN ${vlan.id} (${vlan.name || 'sem nome'}): ${ports.length ? ports.join(', ') : 'sem portas'}`
      })
      return `${device.name}:\n  ${vlans.join('\n  ')}`
    })
    return {
      answer: ['VLANs configuradas:', '', ...lines].join('\n'),
      suggestions: ['Porque é que o meu ping falha?'],
      actions: [],
    }
  }

  // 8. Rotas e routers
  if (/rota|router|encaminhamento|gateway/.test(lower) && !/gateway padr[aã]o é/.test(lower)) {
    const routers = routersOf(topology)
    if (routers.length === 0) {
      return {
        answer: [
          'Não há routers neste laboratório. Sem router só existe comunicação dentro da mesma sub-rede — o switch não liga redes diferentes.',
          '',
          'Para ligar duas redes: adiciona um router, dá-lhe um IP em cada rede e configura o gateway dos computadores.',
        ].join('\n'),
        suggestions: ['Como configuro duas redes com router?'],
        actions: [],
      }
    }
    const lines = routers.map((router) => {
      const ifaces = router.config.interfaces
        .filter((iface) => isValidIpv4(iface.ip))
        .map((iface) => `${iface.name}: ${iface.ip}/${prefixLength(iface.mask)}`)
      const routes = (router.config.routes ?? []).map((route) => `${route.network}/${prefixLength(route.mask)} via ${route.nextHop}`)
      return `${router.name} — interfaces: ${ifaces.join(' | ') || 'nenhuma'} · rotas: ${routes.join(' | ') || 'nenhuma'}`
    })
    return {
      answer: ['Encaminhamento atual:', '', ...lines].join('\n'),
      suggestions: ['Porque é que o meu ping falha?'],
      actions: [],
    }
  }

  // 9. Conceito: máscara, IP ou classes
  if (/m[aá]scara|sub-rede|subrede|cidr|classe/.test(lower)) {
    return {
      answer: [
        target
          ? `${target.name} está configurado com ${(() => {
              const iface = activeIpInterface(target)
              return iface ? `${iface.ip} ${iface.mask}` : 'nenhum endereço IP'
            })()}.`
          : 'A máscara define que parte do endereço é rede e que parte é dispositivo.',
        '',
        'Com /24 (255.255.255.0): os três primeiros octetos são rede e o último é o host.',
        'Exemplo: 192.168.1.10 / 255.255.255.0 → rede 192.168.1.0, host .10.',
        '',
        'A máscara tem de ter bits 1 contíguos: 255.255.255.0 é válida; 255.0.255.0 não é.',
      ].join('\n'),
      suggestions: ['Qual é a máscara para 192.168.1.10?', 'Dá-me um IP para o PC0'],
      actions: [],
    }
  }

  // 10. Sem intenção reconhecida — pergunta curta, sem relatório
  return {
    answer: target
      ? `Estou a ver o ${target.name}, mas não percebi o que queres. Queres um IP para ele, a máscara, ou ajuda a resolver um ping que falha?`
      : 'Não percebi bem a pergunta. Queres um IP, a máscara de um endereço, configurar DHCP ou perceber porque falha um ping?',
    suggestions: ['Dá-me um IP para o PC0', 'Qual é a máscara para 192.168.1.10?', 'Porque é que o meu ping falha?'],
    actions: [],
  }
}

/** Lista de problemas reais — usada apenas quando é pedido um diagnóstico completo. */
export function diagnose(topology) {
  const issues = []
  for (const device of topology.devices) {
    if ((topology.adjacency.get(device.id) ?? []).length === 0) {
      issues.push({ severity: 'error', deviceId: device.id, text: `${device.name} não tem nenhum cabo ligado.`, hint: 'Liga o equipamento com a ferramenta Cabo.' })
    }
    if (!device.powered) {
      issues.push({ severity: 'warn', deviceId: device.id, text: `${device.name} está desligado.`, hint: 'Liga o equipamento.' })
    }
    if (isEnd(device) && !activeIpInterface(device)) {
      issues.push({ severity: 'error', deviceId: device.id, text: `${device.name} não tem endereço IP ativo.`, hint: 'Configura IP e máscara, ou pede um endereço por DHCP.' })
    }
    const iface = activeIpInterface(device)
    if (iface && iface.mask && !isValidMask(iface.mask)) {
      issues.push({ severity: 'error', deviceId: device.id, text: `${device.name} tem a máscara "${iface.mask}" inválida.`, hint: 'Uma máscara válida tem bits 1 contíguos, por exemplo 255.255.255.0.' })
    }
  }
  return issues
}

export { isLanDevice }
