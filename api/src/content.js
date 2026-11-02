// Conteúdo prático do NETLAB ACADEMY (português de Portugal).
// O currículo progressivo vive em `curriculum.js`; aqui ficam os laboratórios.

export { COURSES, MODULE_ASSESSMENTS } from './curriculum.js'

const pc = (name, x, y, extra = {}) => ({ name, type: 'pc', x, y, ...extra })
const sw = (name, x, y, extra = {}) => ({ name, type: 'switch', x, y, ...extra })

export const LABS = [
  {
    slug: 'primeira-rede',
    title: 'Laboratório 1 — Primeira rede',
    level: 1,
    objective: 'Ligar dois computadores diretamente e permitir comunicação entre eles.',
    brief: 'Dois computadores estão no mapa, ligados por um cabo. Configure endereços na mesma sub-rede e confirme com ping.',
    instructions: [
      'Clique em cada PC e configure IP, máscara e (se necessário) gateway.',
      'Use a ferramenta de cabo para ligar Eth0 a Eth0.',
      'Abra o terminal do PC0 e execute: ping <IP do PC1>.',
      'Verifique o laboratório para receber a avaliação.',
    ],
    starter: {
      devices: [pc('PC0', 30, 45), pc('PC1', 70, 45)],
      links: [{ a: 'PC0', b: 'PC1', cable: 'crossover' }],
    },
    checks: [
      { type: 'minDevices', categories: ['end'], count: 2, label: 'Dois dispositivos finais', weight: 1 },
      { type: 'allConnected', label: 'Equipamentos ligados por cabo', weight: 1 },
      { type: 'allEndHaveIp', label: 'Endereços IP configurados', weight: 2 },
      { type: 'sameSubnetEnds', label: 'Mesma sub-rede', weight: 2 },
      { type: 'pingAll', label: 'Comunicação por ping', weight: 3 },
    ],
  },
  {
    slug: 'rede-switch',
    title: 'Laboratório 2 — Rede com switch',
    level: 1,
    objective: 'Criar uma rede com quatro computadores e um switch.',
    brief: 'Um switch já liga quatro computadores. Falta o plano de endereçamento.',
    instructions: [
      'Configure IPs na mesma sub-rede nos quatro computadores.',
      'Teste a comunicação entre todos os pares com ping.',
      'Confirme as portas do switch em uso no painel do equipamento.',
    ],
    starter: {
      devices: [sw('SW0', 50, 30), pc('PC0', 20, 60), pc('PC1', 40, 60), pc('PC2', 60, 60), pc('PC3', 80, 60)],
      links: [
        { a: 'PC0', b: 'SW0' },
        { a: 'PC1', b: 'SW0' },
        { a: 'PC2', b: 'SW0' },
        { a: 'PC3', b: 'SW0' },
      ],
    },
    checks: [
      { type: 'minDevices', categories: ['end'], count: 4, label: 'Quatro computadores', weight: 1 },
      { type: 'minType', types: ['switch'], count: 1, label: 'Um switch', weight: 1 },
      { type: 'allConnected', label: 'Tudo ligado', weight: 1 },
      { type: 'allEndHaveIp', label: 'IPs configurados', weight: 2 },
      { type: 'sameSubnetEnds', label: 'Todos na mesma sub-rede', weight: 2 },
      { type: 'pingAll', label: 'Comunicação entre todos', weight: 3 },
    ],
  },
  {
    slug: 'rede-router',
    title: 'Laboratório 3 — Rede com router',
    level: 2,
    objective: 'Criar duas redes diferentes e permitir comunicação entre elas.',
    brief: 'Dois switches estão ligados a duas interfaces do router. Configure as duas redes e o gateway dos PCs.',
    instructions: [
      'Configure 192.168.10.0/24 num lado e 192.168.20.0/24 no outro.',
      'Configure as interfaces do router com .1 em cada rede.',
      'Defina o gateway dos PCs com o IP correspondente do router.',
      'Teste o ping entre redes e verifique o resultado.',
    ],
    starter: {
      devices: [
        sw('SW0', 22, 35),
        sw('SW1', 78, 35),
        { name: 'R0', type: 'router', x: 50, y: 62, ip: '192.168.10.1', mask: '255.255.255.0' },
        pc('PC0', 18, 68),
        pc('PC1', 82, 68),
      ],
      links: [
        { a: 'PC0', b: 'SW0' },
        { a: 'SW0', b: 'R0' },
        { a: 'SW1', b: 'R0' },
        { a: 'PC1', b: 'SW1' },
      ],
    },
    checks: [
      { type: 'minType', types: ['router'], count: 1, label: 'Um router', weight: 1 },
      { type: 'allEndHaveIp', label: 'PCs com IP', weight: 2 },
      { type: 'differentSubnets', label: 'Duas sub-redes distintas', weight: 2 },
      { type: 'crossNetworkPing', label: 'Comunicação entre redes', weight: 4 },
    ],
  },
  {
    slug: 'servidor-dhcp',
    title: 'Laboratório 4 — Servidor DHCP',
    level: 2,
    objective: 'Configurar um servidor para distribuir automaticamente endereços IP.',
    brief: 'O servidor já está ligado ao switch. Ative o DHCP e obtenha endereços nos clientes.',
    instructions: [
      'Abra o servidor, ative o DHCP e defina o pool 192.168.1.0/24.',
      'Indique gateway 192.168.1.1 e DNS 192.168.1.10.',
      'No terminal de cada PC, execute "ipconfig /renew".',
      'Confirme os quatro passos DORA no painel de simulação.',
    ],
    starter: {
      devices: [
        { name: 'SRV0', type: 'server', x: 50, y: 25, ip: '192.168.1.10', mask: '255.255.255.0' },
        sw('SW0', 50, 45),
        pc('PC0', 25, 70),
        pc('PC1', 75, 70),
      ],
      links: [
        { a: 'SRV0', b: 'SW0' },
        { a: 'PC0', b: 'SW0' },
        { a: 'PC1', b: 'SW0' },
      ],
    },
    checks: [
      { type: 'serviceEnabled', service: 'dhcp', label: 'Serviço DHCP ativo', weight: 3 },
      { type: 'dhcpClients', count: 2, label: 'Dois clientes com endereço DHCP', weight: 4 },
      { type: 'pingAll', label: 'Comunicação entre clientes', weight: 2 },
    ],
  },
  {
    slug: 'servidor-dns',
    title: 'Laboratório 5 — Servidor DNS',
    level: 2,
    objective: 'Configurar a resolução de nomes de domínio.',
    brief: 'Registe um nome no servidor DNS e resolva-o a partir de um cliente.',
    instructions: [
      'No servidor, ative o serviço DNS.',
      'Registe www.netlab.local → 192.168.1.10.',
      'No terminal do PC, execute: nslookup www.netlab.local.',
      'Confirme a resposta com o IP do servidor.',
    ],
    starter: {
      devices: [
        { name: 'SRV0', type: 'server', x: 50, y: 25, ip: '192.168.1.10', mask: '255.255.255.0' },
        sw('SW0', 50, 45),
        pc('PC0', 30, 70, { ip: '192.168.1.20', mask: '255.255.255.0' }),
        pc('PC1', 70, 70, { ip: '192.168.1.21', mask: '255.255.255.0' }),
      ],
      links: [
        { a: 'SRV0', b: 'SW0' },
        { a: 'PC0', b: 'SW0' },
        { a: 'PC1', b: 'SW0' },
      ],
    },
    checks: [
      { type: 'serviceEnabled', service: 'dns', label: 'Serviço DNS ativo', weight: 3 },
      { type: 'allEndHaveIp', label: 'IPs configurados', weight: 1 },
      { type: 'pingAll', label: 'Comunicação na rede', weight: 2 },
    ],
  },
  {
    slug: 'vlans',
    title: 'Laboratório 6 — VLANs',
    level: 3,
    objective: 'Separar dois departamentos em VLANs diferentes no mesmo switch.',
    brief: 'Crie a VLAN 10 e a VLAN 20, atribua duas portas a cada uma e confirme o isolamento.',
    instructions: [
      'Abra o switch e crie as VLANs 10 e 20.',
      'Atribua Fa0/1 e Fa0/2 à VLAN 10; Fa0/3 e Fa0/4 à VLAN 20.',
      'Configure IPs no mesmo espaço de endereçamento nos quatro PCs.',
      'Teste com ping: PCs da mesma VLAN comunicam; de VLANs diferentes não.',
      'Avalie para confirmar o isolamento.',
    ],
    starter: {
      devices: [sw('SW0', 50, 35), pc('PC0', 20, 65), pc('PC1', 40, 65), pc('PC2', 60, 65), pc('PC3', 80, 65)],
      links: [
        { a: 'PC0', b: 'SW0' },
        { a: 'PC1', b: 'SW0' },
        { a: 'PC2', b: 'SW0' },
        { a: 'PC3', b: 'SW0' },
      ],
    },
    checks: [
      { type: 'minType', types: ['switch'], count: 1, label: 'Um switch', weight: 1 },
      { type: 'vlanCount', count: 2, label: 'Duas VLANs criadas', weight: 2 },
      { type: 'portsInVlan', vlan: 10, label: 'Portas na VLAN 10', weight: 2 },
      { type: 'portsInVlan', vlan: 20, label: 'Portas na VLAN 20', weight: 2 },
      { type: 'pingBlocked', label: 'Isolamento entre VLANs', weight: 3 },
    ],
  },
  {
    slug: 'escritorio',
    title: 'Laboratório 7 — Escritório completo',
    level: 3,
    objective: 'Construir uma rede empresarial com computadores, servidor, switches e router.',
    brief: 'Uma rede de escritório com duas áreas, servidor central e router para o exterior simulado.',
    instructions: [
      'Configure o plano de endereçamento 192.168.10.0/24 e 192.168.20.0/24.',
      'Ligue todos os equipamentos com cabos adequados.',
      'Configure o gateway dos PCs com o router.',
      'Ative o DHCP no servidor se quiser automatizar os endereços.',
      'Confirme que todos os equipamentos comunicam.',
    ],
    starter: {
      devices: [
        { name: 'R0', type: 'router', x: 50, y: 45 },
        sw('SW0', 25, 30),
        sw('SW1', 75, 30),
        { name: 'SRV0', type: 'server', x: 50, y: 20, ip: '192.168.10.10', mask: '255.255.255.0' },
        pc('PC0', 15, 62),
        pc('PC1', 32, 62),
        pc('PC2', 68, 62),
        { name: 'IMP0', type: 'printer', x: 85, y: 62 },
      ],
      links: [
        { a: 'SRV0', b: 'SW0' },
        { a: 'PC0', b: 'SW0' },
        { a: 'PC1', b: 'SW0' },
        { a: 'SW0', b: 'R0' },
        { a: 'SW1', b: 'R0' },
        { a: 'PC2', b: 'SW1' },
        { a: 'IMP0', b: 'SW1' },
      ],
    },
    checks: [
      { type: 'minDevices', categories: ['end'], count: 5, label: 'Cinco dispositivos finais', weight: 1 },
      { type: 'minType', types: ['router'], count: 1, label: 'Router presente', weight: 1 },
      { type: 'minType', types: ['switch'], count: 2, label: 'Dois switches', weight: 1 },
      { type: 'allConnected', label: 'Tudo ligado', weight: 1 },
      { type: 'allEndHaveIp', label: 'IPs configurados', weight: 2 },
      { type: 'crossNetworkPing', label: 'Comunicação entre áreas', weight: 3 },
    ],
  },
  {
    slug: 'wifi',
    title: 'Laboratório 8 — Rede Wi-Fi',
    level: 3,
    objective: 'Configurar uma rede wireless com SSID, segurança e clientes associados.',
    brief: 'Um router wireless está ligado à rede. Defina o SSID e ligue os dispositivos sem fios.',
    instructions: [
      'Abra o router wireless e defina SSID "NETLAB-ACADEMY" com WPA2.',
      'Ligue laptop e smartphone por cabo wireless.',
      'Configure IPs na mesma sub-rede.',
      'Teste a comunicação entre os dispositivos.',
    ],
    starter: {
      devices: [
        { name: 'WRT0', type: 'wireless_router', x: 50, y: 35, ip: '192.168.0.1', mask: '255.255.255.0' },
        { name: 'NB0', type: 'notebook', x: 25, y: 68 },
        { name: 'CEL0', type: 'smartphone', x: 55, y: 68 },
        { name: 'TAB0', type: 'tablet', x: 78, y: 68 },
      ],
      links: [
        { a: 'NB0', b: 'WRT0', cable: 'wireless' },
        { a: 'CEL0', b: 'WRT0', cable: 'wireless' },
        { a: 'TAB0', b: 'WRT0', cable: 'wireless' },
      ],
    },
    checks: [
      { type: 'wirelessConfigured', label: 'SSID configurado', weight: 2 },
      { type: 'allEndHaveIp', label: 'Clientes com IP', weight: 2 },
      { type: 'pingAll', label: 'Comunicação wireless', weight: 3 },
    ],
  },
  {
    slug: 'router-estatico',
    title: 'Laboratório 9 — Routing estático',
    level: 4,
    objective: 'Ligar duas redes através de dois routers com rotas estáticas.',
    brief: 'R0, R1 e duas LANs. Sem rotas estáticas, a rede remota é inalcançável.',
    instructions: [
      'Configure as interfaces de R0 e R1 com IPs válidos.',
      'Configure um gateway comum entre os dois routers (10.0.0.0/30).',
      'Adicione rotas estáticas para as redes remotas.',
      'Configure o gateway dos PCs e teste com ping e tracert.',
    ],
    starter: {
      devices: [
        sw('SW0', 18, 40),
        sw('SW1', 82, 40),
        { name: 'R0', type: 'router', x: 38, y: 35 },
        { name: 'R1', type: 'router', x: 62, y: 35 },
        pc('PC0', 15, 70),
        pc('PC1', 85, 70),
      ],
      links: [
        { a: 'PC0', b: 'SW0' },
        { a: 'SW0', b: 'R0' },
        { a: 'R0', b: 'R1', cable: 'serial' },
        { a: 'R1', b: 'SW1' },
        { a: 'PC1', b: 'SW1' },
      ],
    },
    checks: [
      { type: 'minType', types: ['router'], count: 2, label: 'Dois routers', weight: 1 },
      { type: 'allEndHaveIp', label: 'PCs com IP', weight: 1 },
      { type: 'routeCount', count: 2, label: 'Rotas estáticas configuradas', weight: 3 },
      { type: 'crossNetworkPing', label: 'Comunicação entre redes', weight: 4 },
    ],
  },
  {
    slug: 'servidor-web',
    title: 'Laboratório 10 — Servidor web',
    level: 2,
    objective: 'Publicar um serviço HTTP numa rede local e aceder a partir de um cliente.',
    brief: 'O servidor está ligado à LAN. Ative os serviços e confirme o acesso.',
    instructions: [
      'Abra o servidor SRV0 e ative HTTP e HTTPS.',
      'Registe www.netlab.local no DNS apontando para o servidor.',
      'No PC, use o navegador simulado para abrir o serviço.',
      'Confirme a comunicação com ping.',
    ],
    starter: {
      devices: [
        { name: 'SRV0', type: 'server', x: 50, y: 25, ip: '192.168.5.10', mask: '255.255.255.0' },
        sw('SW0', 50, 45),
        pc('PC0', 30, 70, { ip: '192.168.5.20', mask: '255.255.255.0' }),
        pc('PC1', 70, 70, { ip: '192.168.5.21', mask: '255.255.255.0' }),
      ],
      links: [
        { a: 'SRV0', b: 'SW0' },
        { a: 'PC0', b: 'SW0' },
        { a: 'PC1', b: 'SW0' },
      ],
    },
    checks: [
      { type: 'serviceEnabled', service: 'http', label: 'Serviço HTTP ativo', weight: 3 },
      { type: 'serviceEnabled', service: 'dns', label: 'Serviço DNS ativo', weight: 2 },
      { type: 'pingAll', label: 'Comunicação na LAN', weight: 2 },
    ],
  },
]

export const ASSESSMENTS = []
