import { DEVICE_CATALOG } from '../catalog.js'
import { buildTopology, isLanDevice } from './topology.js'
import { isValidIpv4, isValidMask, macOf, networkOf, prefixLength, subnetLabel } from './ip.js'
import { activeIpInterface } from './config.js'
import { simulatePing } from './ping.js'

const list = (items) => items.map((item) => `• ${item}`).join('\n')

/** Diagnóstico automático da topologia — cada item é um problema real detetado. */
export function diagnose(topology) {
  const issues = []
  const ends = topology.devices.filter((device) => DEVICE_CATALOG[device.type]?.category === 'end')
  const routers = topology.devices.filter((device) => ['router', 'firewall', 'modem'].includes(device.type))
  const switches = topology.devices.filter((device) => isLanDevice(device))

  for (const device of topology.devices) {
    const edges = topology.adjacency.get(device.id) ?? []
    if (edges.length === 0) {
      issues.push({
        severity: 'error',
        deviceId: device.id,
        text: `${device.name} não tem nenhum cabo ligado.`,
        hint: 'Use a ferramenta de cabo para ligar o equipamento à topologia.',
      })
    }
    if (!device.powered) {
      issues.push({
        severity: 'warn',
        deviceId: device.id,
        text: `${device.name} está desligado.`,
        hint: 'Ligue o equipamento no painel de configuração.',
      })
    }
    const downPorts = device.config.interfaces.filter(
      (iface) => iface.status === 'down' && edges.some((edge) => edge.port === iface.name)
    )
    if (downPorts.length > 0) {
      issues.push({
        severity: 'error',
        deviceId: device.id,
        text: `${device.name}: interface(s) ${downPorts.map((iface) => iface.name).join(', ')} desligada(s) mas com cabo.`,
        hint: 'Execute "no shutdown" na interface ou ative-a no painel de configuração.',
      })
    }
  }

  const withoutIp = ends.filter((device) => !activeIpInterface(device))
  if (withoutIp.length > 0) {
    issues.push({
      severity: 'error',
      text: `${withoutIp.map((device) => device.name).join(', ')} sem endereço IP ativo.`,
      hint: 'Configure um IP estático ou ative o DHCP no cliente.',
    })
  }

  const seen = new Map()
  for (const device of topology.devices) {
    for (const iface of device.config.interfaces) {
      if (!isValidIpv4(iface.ip)) continue
      if (seen.has(iface.ip)) {
        issues.push({
          severity: 'error',
          text: `O endereço ${iface.ip} está duplicado entre ${seen.get(iface.ip)} e ${device.name}.`,
          hint: 'Cada interface ativa deve ter um IP único dentro da rede.',
        })
      } else {
        seen.set(iface.ip, device.name)
      }
    }
  }

  for (const device of topology.devices) {
    const iface = device.config.interfaces.find((entry) => entry.ip)
    if (iface && !isValidMask(iface.mask)) {
      issues.push({
        severity: 'error',
        deviceId: device.id,
        text: `${device.name} tem a máscara "${iface.mask || '(vazia)'}" inválida.`,
        hint: 'Uma máscara válida tem bits a 1 contíguos, por exemplo 255.255.255.0.',
      })
    }
  }

  for (const device of ends) {
    const iface = activeIpInterface(device)
    if (!iface) continue
    const hasRouter = routers.length > 0
    if (hasRouter && !isValidIpv4(iface.gateway)) {
      issues.push({
        severity: 'warn',
        deviceId: device.id,
        text: `${device.name} não tem gateway padrão, mas existem routers na topologia.`,
        hint: 'Se o destino estiver noutra rede, o gateway é obrigatório.',
      })
    }
    if (switches.length > 0) {
      const peers = ends.filter(
        (peer) => peer.id !== device.id && activeIpInterface(peer) && absoluteNetwork(peer) === absoluteNetwork(device)
      )
      if (peers.length === 0) {
        issues.push({
          severity: 'warn',
          deviceId: device.id,
          text: `${device.name} (${subnetLabel(iface.ip, iface.mask)}) está sozinho na sua sub-rede.`,
          hint: 'Confirme a máscara ou atribua um IP na mesma sub-rede aos restantes equipamentos.',
        })
      }
    }
  }

  for (const device of routers) {
    const connected = device.config.interfaces.filter((iface) => isValidIpv4(iface.ip) && iface.status !== 'down')
    if (connected.length === 0) {
      issues.push({
        severity: 'error',
        deviceId: device.id,
        text: `${device.name} não tem interfaces IP ativas.`,
        hint: 'Configure IPs nas interfaces ligadas a cada rede.',
      })
    }
    if (connected.length === 1 && device.config.routes.length === 0) {
      issues.push({
        severity: 'warn',
        deviceId: device.id,
        text: `${device.name} tem uma única interface IP e nenhuma rota estática.`,
        hint: 'Para ligar duas redes precisa de IP nas duas interfaces ou rotas estáticas.',
      })
    }
  }

  for (const device of topology.devices) {
    if (device.config.services?.dhcp?.enabled) {
      const pool = device.config.services.dhcp.pool
      if (!isValidIpv4(pool.start) || !isValidIpv4(pool.end) || !isValidMask(pool.mask)) {
        issues.push({
          severity: 'error',
          deviceId: device.id,
          text: `O pool DHCP do ${device.name} está incompleto.`,
          hint: 'Preencha rede, máscara, primeiro e último endereço do intervalo.',
        })
      }
    }
    if (device.config.wireless?.ssid === '' && ['access_point', 'wireless_router'].includes(device.type)) {
      issues.push({
        severity: 'warn',
        deviceId: device.id,
        text: `${device.name} está sem SSID.`,
        hint: 'Defina o nome da rede sem fios (SSID) para permitir associações.',
      })
    }
  }

  return issues
}

const absoluteNetwork = (device) => {
  const iface = activeIpInterface(device)
  return iface ? `${networkOf(iface.ip, iface.mask)}/${prefixLength(iface.mask)}` : null
}

function describeDevice(device) {
  const iface = activeIpInterface(device)
  const model = DEVICE_CATALOG[device.type]
  const links = device.__links ?? 0
  const base = `${device.name} (${model?.label ?? device.type}, ${model?.model ?? 'modelo NL'})`
  if (!iface) return `${base} — sem IP ativo, ${links} cabo(s) ligado(s).`
  return `${base} — ${iface.ip}/${prefixLength(iface.mask)}${iface.gateway ? `, gateway ${iface.gateway}` : ''}, ${links} cabo(s).`
}

/** NETBOT: respostas determinísticas, calculadas a partir do laboratório real. */
export function answerNetbot({ question, devices, links }) {
  const topology = buildTopology(devices, links)
  const text = String(question ?? '').toLowerCase()
  const issues = diagnose(topology)
  for (const device of topology.devices) {
    device.__links = (topology.adjacency.get(device.id) ?? []).length
  }

  const mentioned = topology.devices.filter((device) =>
    new RegExp(`\\b${device.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(question ?? '')
  )
  const ends = topology.devices.filter((device) => DEVICE_CATALOG[device.type]?.category === 'end')

  const suggestions = []
  const wantsPing = /ping|comunicar|comunicação|alcançar|conectar|ligar-se|não consigo|nao consigo|falha/.test(text)

  if (wantsPing && ends.length >= 2) {
    const pair =
      mentioned.length >= 2
        ? [mentioned[0], mentioned[1]]
        : [ends[0], ends[1]]
    const [from, to] = pair
    const result = simulatePing(topology.devices, topology.links, from.id, to.id)
    if (result.ok) {
      suggestions.push(
        `Testei agora ${from.name} → ${to.name}: a comunicação funciona (${result.latencyMs} ms, ${result.path.length} equipamentos no caminho).`
      )
      suggestions.push('Se o seu terminal mostra falha, confirme o IP de destino exatamente como está configurado no equipamento.')
      return {
        answer: [
          `Analisei o laboratório: ${from.name} consegue alcançar ${to.name}.`,
          '',
          result.events.map((event) => `• ${event.text}`).join('\n'),
          '',
          'Resumo do caminho: ' + result.path.map((id) => topology.byId.get(id)?.name).filter(Boolean).join(' → '),
        ].join('\n'),
        suggestions,
        issues,
      }
    }

    const candidates = issues
      .filter((issue) => issue.deviceId === from.id || issue.deviceId === to.id || !issue.deviceId)
      .slice(0, 3)
      .map((issue) => issue.text)

    return {
      answer: [
        `Testei ${from.name} → ${to.name} e o pacote NÃO chegou.`,
        '',
        `Motivo detetado: ${result.reason}`,
        result.hint ? `Como resolver: ${result.hint}` : '',
        candidates.length > 0 ? `\nOutros pontos a verificar:\n${list(candidates)}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      suggestions: [
        ...(result.hint ? [result.hint] : []),
        'Confirme a configuração no painel de cada equipamento e volte a testar com ping.',
      ],
      issues,
    }
  }

  if (/vlan|segment|departamento|isol/.test(text)) {
    const vlanDevices = topology.devices.filter((device) => (device.config.vlans ?? []).length > 1)
    if (vlanDevices.length === 0) {
      return {
        answer:
          'Não encontrei VLANs configuradas neste laboratório. Num switch, crie a VLAN no separador "VLANs" e atribua as portas a essa VLAN. Portas em VLANs diferentes não comunicam sem um router (router-on-a-stick).',
        suggestions: ['Crie duas VLANs e associe duas portas a cada uma.', 'Ligue um router ao switch numa porta trunk para encaminhar entre VLANs.'],
        issues,
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
      answer: [
        'VLANs encontradas no laboratório:',
        '',
        ...lines,
        '',
        'Equipamentos em VLANs diferentes não comunicam diretamente: precisam de um router com subinterfaces (uma por VLAN) e uma porta trunk no switch.',
      ].join('\n'),
      suggestions: ['Teste com ping entre um computador de cada VLAN: a falha por VLAN é o comportamento esperado sem encaminhamento.', 'Para inter-VLAN, configure subinterfaces no router e a porta do switch como trunk.'],
      issues,
    }
  }

  if (/dhcp|endereço automático|endereco automatico|dora/.test(text)) {
    const server = topology.devices.find((device) => device.config.services?.dhcp?.enabled)
    if (!server) {
      return {
        answer:
          'Não existe nenhum servidor DHCP ativo no laboratório. Abra um servidor, ative o serviço DHCP e defina o intervalo de endereços. Depois, no computador, execute "ipconfig /renew" no terminal.',
        suggestions: ['Ative o DHCP num servidor ligado ao mesmo switch que os clientes.', 'Configure o gateway do pool com o IP do router.'],
        issues,
      }
    }
    const pool = server.config.services.dhcp.pool
    return {
      answer: [
        `Servidor DHCP: ${server.name}.`,
        `Intervalo: ${pool.start || '—'} a ${pool.end || '—'}, máscara ${pool.mask || '—'}, gateway ${pool.gateway || '—'}.`,
        '',
        'O processo é DORA: Discover (cliente procura), Offer (servidor oferece), Request (cliente pede) e Acknowledge (servidor confirma). Pode observar os quatro passos no painel de simulação quando pede um endereço.',
      ].join('\n'),
      suggestions: ['Use "ipconfig /renew" no terminal do cliente e veja o resultado em Eventos.'],
      issues,
    }
  }

  if (/dns|nome|domínio|dominio|nslookup/.test(text)) {
    const server = topology.devices.find((device) => device.config.services?.dns?.enabled)
    if (!server) {
      return {
        answer:
          'Não há servidor DNS ativo. Ative o serviço DNS num servidor e registe pares nome → IP. O cliente só resolve nomes se estiver no mesmo segmento desse servidor.',
        suggestions: ['Registe, por exemplo, www.netlab.local → IP do servidor web.'],
        issues,
      }
    }
    const records = server.config.services.dns.records ?? []
    return {
      answer: [
        `Servidor DNS: ${server.name}.`,
        records.length
          ? `Registos:\n${list(records.map((record) => `${record.name} → ${record.ip}`))}`
          : 'O servidor não tem registos configurados.',
        '',
        'No terminal do cliente, use "nslookup nome" para testar a resolução.',
      ].join('\n'),
      suggestions: ['Confirme que o nome pesquisado está exatamente igual ao registo.'],
      issues,
    }
  }

  if (/router|rota|encaminhamento|gateway/.test(text)) {
    const routers = topology.devices.filter((device) => ['router', 'firewall', 'modem'].includes(device.type))
    if (routers.length === 0) {
      return {
        answer:
          'Não existe router neste laboratório. Sem router, só há comunicação dentro da mesma sub-rede (o switch apenas repete quadros). Adicione um router e configure uma interface por rede.',
        suggestions: ['Adicione um router ao mapa.', 'Configure o gateway dos PCs com o IP da interface do router.'],
        issues,
      }
    }
    const lines = routers.map((router) => {
      const ifaces = router.config.interfaces
        .filter((iface) => iface.ip)
        .map((iface) => `${iface.name}: ${iface.ip}/${prefixLength(iface.mask)}`)
      const routes = router.config.routes.map(
        (route) => `${route.network}/${prefixLength(route.mask)} via ${route.nextHop}`
      )
      return `${router.name}:\n  Interfaces: ${ifaces.join(' | ') || 'nenhuma'}\n  Rotas estáticas: ${routes.join(' | ') || 'nenhuma'}`
    })
    return {
      answer: [
        'Configuração de encaminhamento encontrada:',
        '',
        ...lines,
        '',
        'Para atravessar duas redes, cada PC precisa do gateway correto e cada router precisa de conhecer a rede remota (rota estática).',
      ].join('\n'),
      suggestions: ['Teste com "tracert" para ver por que salto o pacote para.'],
      issues,
    }
  }

  if (/ip|máscara|mascara|sub-rede|subrede|endereço|endereco/.test(text)) {
    const lines = topology.devices
      .filter((device) => device.config.interfaces.some((iface) => iface.ip))
      .map((device) => {
        const iface = activeIpInterface(device)
        return `${device.name}: ${iface.ip}/${prefixLength(iface.mask)}${iface.gateway ? `, gateway ${iface.gateway}` : ''}`
      })
    return {
      answer: [
        'Endereçamento atual do laboratório:',
        '',
        lines.length ? list(lines) : '• Nenhum equipamento tem IP configurado.',
        '',
        'Dois equipamentos comunicam diretamente se tiverem a mesma rede (IP e máscara compatíveis). Caso contrário precisam de um router.',
      ].join('\n'),
      suggestions: ['Verifique se todos os IPs da mesma LAN partilham a mesma máscara.'],
      issues,
    }
  }

  const summary = topology.devices.map((device) => `• ${describeDevice(device)}`).join('\n') || '• O laboratório está vazio.'
  return {
    answer: [
      'Analisei o laboratório atual:',
      '',
      summary,
      '',
      issues.length
        ? `Encontrei ${issues.length} ponto(s) a melhorar:\n${list(issues.slice(0, 6).map((issue) => issue.text))}`
        : 'Não encontrei problemas de configuração evidentes.',
    ].join('\n'),
    suggestions: issues.slice(0, 3).map((issue) => issue.hint),
    issues,
  }
}

export { macOf, isLanDevice }
