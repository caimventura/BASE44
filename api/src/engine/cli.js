import { DEVICE_CATALOG, categoryOf } from '../catalog.js'
import { isValidIpv4, isValidMask, macOf, networkOf, prefixLength } from './ip.js'
import { activeIpInterface } from './config.js'
import { buildTopology, edgeTo, lanHosts, l2Path, portState } from './topology.js'
import { lookupRoute, routingTable, simulatePing, simulateTraceroute } from './ping.js'
import { requestDhcp, resolveDns } from './services.js'

const nameOf = (device) => device.config?.hostname?.trim() || device.name

export function promptFor(device, mode) {
  const name = device ? nameOf(device) : 'NETLAB'
  if (mode === 'priv') return `${name}#`
  if (mode === 'config') return `${name}(config)#`
  if (mode === 'config-if') return `${name}(config-if)#`
  return `${name}>`
}

const dottedMac = (device, port) => macOf(device.id, port).replace(/:/g, '').toLowerCase().replace(/(.{4})/g, '$1.').replace(/\.$/, '')

const validModes = new Set(['user', 'priv', 'config', 'config-if'])

const HELP = [
  'Comandos suportados (simulador educativo, inspirado em CLI de rede):',
  '  enable                     entra no modo privilegiado',
  '  configure terminal         entra no modo de configuração global',
  '  hostname NOME              define o nome do equipamento',
  '  interface NOME             entra na configuração da interface',
  '  ip address IP MASCARA      define o endereço da interface',
  '  no shutdown / shutdown     ativa / desativa a interface',
  '  switchport mode access|trunk',
  '  switchport access vlan N   associa a porta à VLAN',
  '  ip route REDE MASCARA NEXT adiciona rota estática',
  '  show ip interface brief    resumo das interfaces',
  '  show ip route              tabela de encaminhamento',
  '  show vlan brief | show mac address-table | show interfaces',
  '  show running-config | show startup-config',
  '  ping IP | write memory | end | exit',
].join('\n')

export function runCli({ devices, links, deviceId, command, mode: incomingMode }) {
  const topology = buildTopology(devices, links)
  const device = topology.byId.get(deviceId)
  let mode = validModes.has(incomingMode) ? incomingMode : 'user'
  const changed = { value: false }

  if (!device) {
    return { output: '% Equipamento não encontrado.', mode: 'user', prompt: 'NETLAB>', changed: false }
  }

  const config = device.config
  const finish = (output) => ({
    output,
    mode,
    prompt: promptFor(device, mode),
    changed: changed.value,
    config: changed.value ? config : undefined,
  })

  if (categoryOf(device) === 'end') {
    return { ...runPcTerminal({ topology, device, raw: String(command ?? '') }), mode: 'user', prompt: promptFor(device, 'user') }
  }

  if (['hub', 'bridge', 'repeater', 'controller'].includes(device.type)) {
    return finish(
      `% O ${DEVICE_CATALOG[device.type].label} não tem CLI configurável neste simulador. Utilize o painel de configuração.`
    )
  }

  const raw = String(command ?? '').trim()
  if (!raw) return finish('')
  const words = raw.split(/\s+/)
  const key = (index) => (words[index] ?? '').toLowerCase()
  const rest = (index) => words.slice(index).join(' ')

  const showPing = (targetIp) => {
    const target = topology.devices.find((entry) =>
      entry.config.interfaces.some((iface) => iface.ip === targetIp)
    )
    if (!target) {
      return `% Nenhum equipamento do laboratório tem o endereço ${targetIp}.`
    }
    const result = simulatePing(devices, links, device.id, target.id)
    if (!result.ok) {
      return [
        `Type escape sequence to abort.`,
        `Sending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:`,
        '.....',
        `% ${result.reason}`,
        result.hint ? `% Sugestão: ${result.hint}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    }
    return [
      'Type escape sequence to abort.',
      `Sending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:`,
      '!!!!!',
      `Success rate is 100 percent (5/5), round-trip min/avg/max = ${result.latencyMs}/${result.latencyMs + 1}/${result.latencyMs + 2} ms`,
    ].join('\n')
  }

  const renderInterfaces = () => {
    const lines = ['Interface              IP-Address      OK? Method  Status                Protocol']
    for (const iface of config.interfaces) {
      const method = iface.dhcp ? 'DHCP' : iface.ip ? 'manual' : 'unset'
      const status = iface.status === 'down' ? 'administratively down' : 'up'
      const protocol = iface.status === 'down' ? 'down' : 'up'
      lines.push(
        `${iface.name.padEnd(22)} ${(iface.ip || 'unassigned').padEnd(15)} ${iface.ip ? 'YES' : 'NO '}  ${method.padEnd(7)} ${status.padEnd(21)} ${protocol}`
      )
    }
    return lines.join('\n')
  }

  const renderRoutes = () => {
    const { connected, statics } = routingTable(device)
    const lines = [
      'Codes: C - connected, S - static, S* - default',
      'Gateway of last resort ' +
        (statics.find((route) => route.prefix === 0) ? 'is set' : 'is not set'),
    ]
    for (const route of connected) {
      lines.push(
        `C    ${route.network}/${route.prefix} is directly connected, ${route.iface.name}`
      )
    }
    for (const route of statics) {
      lines.push(
        `${route.prefix === 0 ? 'S*' : 'S '}   ${route.network}/${route.prefix} [1/0] via ${route.nextHop}`
      )
    }
    if (connected.length === 0 && statics.length === 0) {
      lines.push('% Nenhuma rota configurada — a tabela está vazia.')
    }
    return lines.join('\n')
  }

  const renderRunning = () => {
    const lines = ['Building configuration...', '', 'Current configuration:', '!', `hostname ${nameOf(device)}`]
    if (device.type === 'switch' || device.type === 'multilayer_switch') {
      for (const vlan of config.vlans) {
        if (Number(vlan.id) === 1) continue
        lines.push(`vlan ${vlan.id}`, ` name ${vlan.name || `VLAN${vlan.id}`}`)
      }
    }
    lines.push('!')
    for (const iface of config.interfaces) {
      if (!iface.ip && !iface.status && !iface.mode) continue
      lines.push(`interface ${iface.name}`)
      if (iface.ip) lines.push(` ip address ${iface.ip} ${iface.mask || '255.255.255.0'}`)
      if (config.nat && iface.natRole) lines.push(` ip nat ${iface.natRole}`)
      if (iface.status === 'down') lines.push(' shutdown')
      else lines.push(' no shutdown')
      if (device.type === 'switch' || device.type === 'multilayer_switch' || device.type === 'access_point') {
        if (iface.mode === 'trunk') {
          lines.push(' switchport mode trunk')
          if (iface.trunkVlans) lines.push(` switchport trunk allowed vlan ${iface.trunkVlans}`)
        } else if (iface.vlan && Number(iface.vlan) !== 1) {
          lines.push(' switchport mode access')
          lines.push(` switchport access vlan ${iface.vlan}`)
        }
      }
      lines.push('!')
    }
    for (const route of config.routes) {
      if (route.network && route.mask) lines.push(`ip route ${route.network} ${route.mask} ${route.nextHop || ''}`.trim())
    }
    lines.push('end')
    return lines.join('\n')
  }

  const renderStartup = () => {
    if (!config.startup) {
      return '% startup-config não existe. Use "write memory" para guardar a configuração atual.'
    }
    const lines = ['Using saved configuration:', '', `hostname ${config.startup.hostname || nameOf(device)}`]
    for (const iface of config.startup.interfaces ?? []) {
      if (!iface.ip && iface.status !== 'down') continue
      lines.push(`interface ${iface.name}`)
      if (iface.ip) lines.push(` ip address ${iface.ip} ${iface.mask}`)
      if (iface.status === 'down') lines.push(' shutdown')
    }
    for (const route of config.startup.routes ?? []) {
      lines.push(`ip route ${route.network} ${route.mask} ${route.nextHop}`)
    }
    lines.push('end')
    return lines.join('\n')
  }

  const renderVlans = () => {
    if (!['switch', 'multilayer_switch'].includes(device.type)) {
      return '% Este equipamento não suporta VLANs.'
    }
    const lines = ['VLAN Name                             Status    Ports', '---- -------------------------------- --------- -------------------------------']
    for (const vlan of config.vlans) {
      const ports = config.interfaces
        .filter((iface) => iface.mode !== 'trunk' && Number(iface.vlan ?? 1) === Number(vlan.id))
        .map((iface) => iface.name)
      lines.push(
        `${String(vlan.id).padEnd(4)} ${String(vlan.name || 'default').padEnd(32)} active    ${ports.join(', ') || '—'}`
      )
    }
    const trunks = config.interfaces.filter((iface) => iface.mode === 'trunk').map((iface) => iface.name)
    if (trunks.length > 0) lines.push('', `Portas trunk: ${trunks.join(', ')}`)
    return lines.join('\n')
  }

  const renderMacTable = () => {
    if (!['switch', 'multilayer_switch'].includes(device.type)) {
      return '% Este equipamento não mantém tabela MAC.'
    }
    const lines = ['Mac Address Table', '', 'Vlan    Mac Address       Type        Ports', '----    -----------       --------    -----']
    for (const edge of topology.adjacency.get(device.id) ?? []) {
      const peer = topology.byId.get(edge.deviceId)
      if (!peer) continue
      const iface = peer.config.interfaces[0]
      const vlan = portState(device, edge.port)?.mode === 'trunk' ? 'trunk' : portState(device, edge.port)?.vlan ?? 1
      lines.push(`${String(vlan).padEnd(8)}${macOf(peer.id, iface?.name ?? 'Eth0').replace(/:/g, '-').toLowerCase()}    DYNAMIC     ${edge.port}`)
    }
    if (lines.length === 4) lines.push('% Nenhum endereço MAC aprendido — ligue equipamentos a este switch.')
    return lines.join('\n')
  }

  const renderInterfacesDetail = (target) => {
    const list = target
      ? config.interfaces.filter((iface) => iface.name.toLowerCase() === target.toLowerCase())
      : config.interfaces
    if (list.length === 0) return `% Interface ${target} não existe neste equipamento.`
    return list
      .map((iface) => {
        const state = iface.status === 'down' ? 'administratively down' : 'up'
        const lineProtocol = iface.status === 'down' ? 'down' : 'up'
        const address = iface.ip ? `${iface.ip}/${prefixLength(iface.mask || '255.255.255.0')}` : 'unassigned'
        return [
          `${iface.name} is ${state}, line protocol is ${lineProtocol}`,
          `  Hardware is NL virtual Ethernet, address is ${dottedMac(device, iface.name)}`,
          `  Internet address is ${address}`,
          `  MTU 1500 bytes, BW ${iface.speed === 'auto' ? '1000000' : iface.speed} Kbit, DLY 10 usec`,
          `  Duplex ${iface.duplex ?? 'auto'}, Speed ${iface.speed ?? 'auto'}`,
        ].join('\n')
      })
      .join('\n!\n')
  }

  const showCommand = () => {
    const joined = words.map((word) => word.toLowerCase()).join(' ')
    if (mode === 'user' && joined.includes('running-config')) {
      return '% Autorização necessária. Execute "enable" primeiro.'
    }
    if (joined === 'show ip interface brief' || joined === 'show ip int brief') return renderInterfaces()
    if (joined === 'show running-config') return renderRunning()
    if (joined === 'show startup-config') return renderStartup()
    if (joined === 'show interfaces' || joined === 'show ip interface') return renderInterfacesDetail()
    if (joined.startsWith('show interfaces ')) return renderInterfacesDetail(words[2])
    if (joined === 'show vlan brief') return renderVlans()
    if (joined === 'show mac address-table') return renderMacTable()
    if (joined === 'show ip route') return renderRoutes()
    if (joined === 'show arp' || joined === 'show ip arp') {
      const hosts = lanHosts(topology, device.id)
      if (hosts.length === 0) return '% Nenhuma entrada ARP — não há vizinhos ativos no segmento.'
      return ['Protocol  Address          Age  Hardware Addr   Type  Interface']
        .concat(hosts.map((host) => `Internet  ${host.ip.padEnd(16)} 2    ${macOf(host.deviceId, 'Eth0').replace(/:/g, '.')}  ARPA  ${host.name}`))
        .join('\n')
    }
    if (joined === 'show version') {
      const model = DEVICE_CATALOG[device.type]
      return [
        `NETLAB ACADEMY — ${model.label} ${model.model}`,
        'Simulador educativo de redes. Não executa software de equipamentos reais.',
        `Nome atual: ${nameOf(device)}`,
        `Interfaces: ${config.interfaces.length}`,
      ].join('\n')
    }
    return `% Comando "show ${words.slice(1).join(' ')}" não suportado neste simulador.`
  }

  const command_ = words.map((word) => word.toLowerCase())

  if (mode === 'user') {
    if (command_[0] === 'enable') {
      mode = 'priv'
      return finish('')
    }
    if (command_[0] === 'exit' || command_[0] === 'quit') return finish('')
    if (command_[0] === 'ping') return finish(showPing(words[1] ?? ''))
    if (command_[0] === 'show') return finish(showCommand())
    if (command_[0] === 'help' || command_[0] === '?') return finish(HELP)
    return finish(`% Invalid input detected at '^' marker.`)
  }

  if (mode === 'priv') {
    if (command_[0] === 'disable') {
      mode = 'user'
      return finish('')
    }
    if (command_[0] === 'configure' && (key(1) === 'terminal' || key(1) === 't')) {
      mode = 'config'
      return finish('Enter configuration commands, one per line. End with CNTL/Z.')
    }
    if (command_[0] === 'show') return finish(showCommand())
    if (command_[0] === 'ping') return finish(showPing(words[1] ?? ''))
    if (command_[0] === 'write' && key(1) === 'memory') {
      config.startup = {
        hostname: nameOf(device),
        interfaces: config.interfaces.map((iface) => ({ ...iface })),
        routes: config.routes.map((route) => ({ ...route })),
        vlans: config.vlans.map((vlan) => ({ ...vlan })),
        savedAt: new Date().toISOString(),
      }
      changed.value = true
      return finish('Building configuration...\n[OK] Configuração guardada em startup-config.')
    }
    if (command_[0] === 'exit') {
      mode = 'user'
      return finish('')
    }
    if (command_[0] === 'end') return finish('')
    if (command_[0] === 'reload') {
      return finish('% Reinício do equipamento não é simulado — use "write memory" para guardar a configuração.')
    }
    if (command_[0] === 'help' || command_[0] === '?') return finish(HELP)
    return finish(`% Invalid input detected at '^' marker.`)
  }

  if (mode === 'config') {
    if (command_[0] === 'hostname') {
      const name = words.slice(1).join(' ').trim()
      if (!name) return finish('% Indique um nome: hostname R1')
      config.hostname = name
      changed.value = true
      return finish('')
    }
    if (command_[0] === 'interface') {
      const requested = words.slice(1).join(' ').trim()
      const iface =
        config.interfaces.find((entry) => entry.name.toLowerCase() === requested.toLowerCase()) ??
        config.interfaces.find((entry) => entry.name.toLowerCase().startsWith(requested.toLowerCase()))
      if (!iface) {
        return finish(`% Interface "${requested}" não existe. Interfaces: ${config.interfaces.map((entry) => entry.name).join(', ')}`)
      }
      config.cliInterface = iface.name
      // a interface ativa faz parte da sessão de CLI: tem de ficar guardada
      // para o pedido seguinte saber onde aplicar "ip address" / "shutdown".
      changed.value = true
      mode = 'config-if'
      return finish('')
    }
    if (command_[0] === 'ip' && key(1) === 'route') {
      const network = words[2]
      const mask = words[3]
      const nextHop = words[4]
      if (!isValidIpv4(network) || !isValidMask(mask) || !isValidIpv4(nextHop)) {
        return finish('% Sintaxe: ip route REDE MASCARA NEXT-HOP (endereços IPv4 válidos).')
      }
      const exists = config.routes.some(
        (route) => route.network === network && route.mask === mask
      )
      if (exists) return finish('% Já existe uma rota para essa rede. Remova-a com "no ip route".')
      config.routes.push({ network, mask, nextHop })
      changed.value = true
      return finish('')
    }
    if (command_[0] === 'no' && key(1) === 'ip' && key(2) === 'route') {
      const before = config.routes.length
      config.routes = config.routes.filter(
        (route) => !(route.network === words[3] && route.mask === words[4])
      )
      changed.value = config.routes.length !== before
      return finish(changed.value ? '' : '% Rota não encontrada.')
    }
    if (command_[0] === 'vlan') {
      const id = Number(words[1])
      if (!Number.isInteger(id) || id < 1 || id > 4094) return finish('% VLAN inválida (1–4094).')
      if (!config.vlans.some((vlan) => Number(vlan.id) === id)) {
        config.vlans.push({ id, name: `VLAN${id}` })
        changed.value = true
      }
      config.cliVlan = id
      changed.value = true
      return finish('')
    }
    if (command_[0] === 'no' && key(1) === 'vlan') {
      const id = Number(words[2])
      if (id === 1) return finish('% A VLAN 1 não pode ser removida.')
      config.vlans = config.vlans.filter((vlan) => Number(vlan.id) !== id)
      config.interfaces.forEach((iface) => {
        if (Number(iface.vlan) === id) iface.vlan = 1
      })
      changed.value = true
      return finish('')
    }
    if (command_[0] === 'name' && config.cliVlan) {
      const vlan = config.vlans.find((entry) => Number(entry.id) === Number(config.cliVlan))
      if (vlan) {
        vlan.name = words.slice(1).join(' ')
        changed.value = true
      }
      return finish('')
    }
    if (command_[0] === 'exit') {
      mode = 'priv'
      return finish('')
    }
    if (command_[0] === 'end') {
      mode = 'priv'
      return finish('')
    }
    if (command_[0] === 'do') {
      mode = 'priv'
      const output = showCommand()
      mode = 'config'
      return finish(output)
    }
    if (command_[0] === 'help' || command_[0] === '?') return finish(HELP)
    return finish(`% Invalid input detected at '^' marker.`)
  }

  // ---- modo de configuração de interface -----------------------------------
  const iface = config.interfaces.find((entry) => entry.name === config.cliInterface)
  if (!iface) {
    mode = 'config'
    return finish('% Nenhuma interface selecionada. Use "interface NOME".')
  }

  if (command_[0] === 'ip' && key(1) === 'address') {
    if (key(2) === 'dhcp') {
      iface.dhcp = true
      changed.value = true
      return finish('')
    }
    const ip = words[2]
    const mask = words[3]
    if (!isValidIpv4(ip) || !isValidMask(mask)) {
      return finish('% Endereço ou máscara inválidos. Sintaxe: ip address 192.168.1.1 255.255.255.0')
    }
    iface.ip = ip
    iface.mask = mask
    iface.dhcp = false
    changed.value = true
    return finish('')
  }
  if (command_[0] === 'no' && key(1) === 'ip' && key(2) === 'address') {
    iface.ip = ''
    iface.mask = ''
    iface.dhcp = false
    changed.value = true
    return finish('')
  }
  if (command_[0] === 'ip' && key(1) === 'nat') {
    if (key(2) === 'inside' || key(2) === 'outside') {
      iface.natRole = key(2)
      config.nat = config.interfaces.some((entry) => entry.natRole === 'outside')
      changed.value = true
      return finish('')
    }
    return finish('% Sintaxe: ip nat inside | ip nat outside')
  }
  if (command_[0] === 'no' && key(1) === 'shutdown') {
    iface.status = 'up'
    changed.value = true
    return finish('')
  }
  if (command_[0] === 'shutdown') {
    iface.status = 'down'
    changed.value = true
    return finish('')
  }
  if (command_[0] === 'description') {
    iface.description = words.slice(1).join(' ')
    changed.value = true
    return finish('')
  }
  if (command_[0] === 'switchport' && key(1) === 'mode') {
    if (!['access', 'trunk'].includes(key(2))) return finish('% Sintaxe: switchport mode access | trunk')
    iface.mode = key(2)
    changed.value = true
    return finish('')
  }
  if (command_[0] === 'switchport' && key(1) === 'access' && key(2) === 'vlan') {
    const vlan = Number(words[3])
    if (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094) return finish('% VLAN inválida.')
    iface.vlan = vlan
    iface.mode = 'access'
    if (!config.vlans.some((entry) => Number(entry.id) === vlan)) {
      config.vlans.push({ id: vlan, name: `VLAN${vlan}` })
    }
    changed.value = true
    return finish('')
  }
  if (command_[0] === 'switchport' && key(1) === 'trunk' && key(2) === 'allowed' && key(3) === 'vlan') {
    iface.mode = 'trunk'
    iface.trunkVlans = words.slice(4).join(',')
    changed.value = true
    return finish('')
  }
  if (command_[0] === 'speed') {
    iface.speed = words[1] ?? 'auto'
    changed.value = true
    return finish('')
  }
  if (command_[0] === 'duplex') {
    iface.duplex = words[1] ?? 'auto'
    changed.value = true
    return finish('')
  }
  if (command_[0] === 'exit') {
    mode = 'config'
    config.cliInterface = null
    return finish('')
  }
  if (command_[0] === 'end') {
    mode = 'priv'
    config.cliInterface = null
    return finish('')
  }
  if (command_[0] === 'help' || command_[0] === '?') return finish(HELP)
  return finish(`% Invalid input detected at '^' marker.`)
}

// ---- terminal de computadores ---------------------------------------------

function runPcTerminal({ topology, device, raw }) {
  const changed = { value: false }
  const config = device.config
  const interface_ = config.interfaces.find((iface) => iface.wireless && iface.ip) ?? config.interfaces[0]
  const words = raw.trim().split(/\s+/)
  const command = (words[0] ?? '').toLowerCase()
  const finish = (output) => ({ output, changed: changed.value, config: changed.value ? config : undefined })

  if (!raw.trim()) return finish('')

  if (command === 'cls' || command === 'clear') return finish('')

  if (command === 'help' || command === '?') {
    return finish(
      [
        'Comandos disponíveis:',
        '  ipconfig            configuração IP da interface',
        '  ipconfig /all       configuração detalhada',
        '  ipconfig /renew     pede um endereço por DHCP',
        '  ping <IP>           testa a comunicação',
        '  tracert <IP>        mostra o caminho até ao destino',
        '  nslookup <nome>     consulta o servidor DNS',
        '  arp -a              tabela ARP',
        '  cls                 limpa o ecrã',
      ].join('\n')
    )
  }

  if (command === 'ipconfig') {
    if ((words[1] ?? '').toLowerCase() === '/renew') {
      const result = requestDhcp(topology.devices, topology.links, device.id)
      if (!result.ok) {
        return finish(`DHCP: ${result.reason}${result.hint ? `\nSugestão: ${result.hint}` : ''}`)
      }
      // requestDhcp trabalha sobre uma cópia normalizada da topologia: a lease
      // tem de ser aplicada à configuração desta sessão para ser guardada.
      const leased =
        (result.lease &&
          config.interfaces.find((entry) => entry.name === result.interface)) ??
        interface_
      if (result.lease && leased) {
        leased.ip = result.lease.ip
        leased.mask = result.lease.mask
        leased.gateway = result.lease.gateway
        leased.dhcp = true
        leased.status = 'up'
      }
      changed.value = true
      return finish(
        `DHCP: ${result.summary}\n` +
          result.events.map((event) => `  ${event.text}`).join('\n')
      )
    }
    if (!interface_ || !interface_.ip) {
      return finish(
        'Windows IP Configuration\n\n   Media State . . . . . . . . . . . : Media disconnected\n   Nenhum endereço IP atribuído. Use "ipconfig /renew" ou configure um IP estático.'
      )
    }
    const detailed = (words[1] ?? '').toLowerCase() === '/all'
    const lines = [
      'Windows IP Configuration',
      '',
      `   Host Name . . . . . . . . . . . . : ${(config.hostname || device.name).toLowerCase()}`,
      `   DNS Server . . . . . . . . . . . : ${config.dns || interface_.gateway || 'não configurado'}`,
      '',
      `Ethernet adapter ${interface_.name}:`,
      '',
      `   Physical Address. . . . . . . . . : ${macOf(device.id, interface_.name).replace(/:/g, '-')}`,
      `   IPv4 Address. . . . . . . . . . . : ${interface_.ip}`,
      `   Subnet Mask . . . . . . . . . . . : ${interface_.mask || 'não configurada'}`,
      `   Default Gateway . . . . . . . . . : ${interface_.gateway || 'não configurado'}`,
    ]
    if (detailed) {
      lines.push(
        `   DHCP Enabled. . . . . . . . . . . : ${interface_.dhcp ? 'Yes' : 'No'}`,
        `   Lease obtained. . . . . . . . . . : ${interface_.dhcp ? 'simulado (24h)' : 'n/a'}`,
        `   Network . . . . . . . . . . . . . : ${interface_.ip && interface_.mask ? `${networkOf(interface_.ip, interface_.mask)}/${prefixLength(interface_.mask)}` : 'n/a'}`
      )
    }
    return finish(lines.join('\n'))
  }

  if (command === 'ping') {
    const targetIp = words[1] ?? ''
    const target = topology.devices.find((entry) =>
      entry.config.interfaces.some((iface) => iface.ip === targetIp)
    )
    if (!target) {
      return finish(
        `A enviar 4 pacotes para ${targetIp}:\nDestino inalcançável: nenhum equipamento do laboratório tem este IP.`
      )
    }
    const result = simulatePing(topology.devices, topology.links, device.id, target.id)
    if (!result.ok) {
      return finish(
        [
          `A enviar 4 pacotes para ${targetIp}:`,
          '    ...',
          '    ...',
          '    ...',
          '    ...',
          '',
          `Destino inalcançável: ${result.reason}`,
          result.hint ? `Sugestão: ${result.hint}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      )
    }
    const lines = [`A enviar 4 pacotes para ${targetIp}:`, '']
    for (let index = 0; index < 4; index += 1) {
      lines.push(
        `Resposta de ${targetIp}: bytes=32 tempo=${result.latencyMs + index}ms TTL=${result.ttl}`
      )
    }
    lines.push(
      '',
      `Estatísticas: 4 enviados, 4 recebidos, 0 perdidos (0% de perda).`,
      result.hint || ''
    )
    return finish(lines.filter((line) => line !== undefined).join('\n'))
  }

  if (command === 'tracert' || command === 'traceroute') {
    const targetIp = words[1] ?? ''
    const target = topology.devices.find((entry) =>
      entry.config.interfaces.some((iface) => iface.ip === targetIp)
    )
    if (!target) return finish(`Não foi possível resolver o destino ${targetIp}.`)
    const result = simulateTraceroute(topology.devices, topology.links, device.id, target.id)
    if (!result.ok) return finish(`Destino inalcançável: ${result.reason}`)
    const lines = [`Rota até ${targetIp} (máximo de 30 saltos):`, '']
    for (const hop of result.hops) {
      lines.push(
        `  ${String(hop.hop).padStart(2)}    ${String(hop.latencyMs).padStart(3)} ms    ${hop.ip}    ${hop.name}`
      )
    }
    return finish(lines.join('\n'))
  }

  if (command === 'nslookup') {
    const name = words[1] ?? ''
    const result = resolveDns(topology.devices, topology.links, device.id, name)
    if (!result.ok) {
      return finish(
        [`Servidor DNS: ${result.server ?? 'não encontrado'}`, `Falha: ${result.reason}`, result.hint ? `Sugestão: ${result.hint}` : '']
          .filter(Boolean)
          .join('\n')
      )
    }
    return finish(
      [
        `Servidor DNS: ${result.server}`,
        `Nome:    ${result.name}`,
        `Endereço: ${result.ip}`,
      ].join('\n')
    )
  }

  if (command === 'arp') {
    const hosts = lanHosts(topology, device.id)
    if (hosts.length === 0) {
      return finish('Nenhuma entrada ARP — não há vizinhos ativos no segmento local.')
    }
    return finish(
      ['Interface: ' + (interface_?.ip ?? '—'), '  Endereço IP         Endereço físico       Tipo']
        .concat(
          hosts.map(
            (host) => `  ${host.ip.padEnd(19)} ${macOf(host.deviceId, 'Eth0').replace(/:/g, '-')}   dinâmico`
          )
        )
        .join('\n')
    )
  }

  if (command === 'hostname' || command === 'whoami') {
    return finish(config.hostname || device.name)
  }

  return finish(
    `'${words[0]}' não é reconhecido como um comando. Escreva "help" para ver os comandos disponíveis.`
  )
}

export { lanHosts, l2Path, edgeTo, activeIpInterface, lookupRoute }
