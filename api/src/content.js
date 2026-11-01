// Conteúdo educativo do NETLAB ACADEMY (português de Portugal).
// É semeado na base de dados de forma idempotente no arranque da API.

export const COURSES = [
  {
    slug: 'fundamentos',
    title: 'Fundamentos de redes',
    level: 1,
    icon: 'network',
    description: 'O que é uma rede, tipos de rede, topologias, IP, máscaras, MAC e protocolos básicos.',
    lessons: [
      {
        slug: 'o-que-e-uma-rede',
        title: 'O que é uma rede de computadores?',
        minutes: 8,
        summary: 'Conceitos base de comunicação entre equipamentos.',
        content: [
          {
            type: 'text',
            title: 'Definição',
            text: 'Uma rede de computadores é um conjunto de equipamentos ligados entre si que partilham recursos e informação. Para comunicar, cada equipamento precisa de um identificador (endereço) e de um caminho físico ou sem fios até ao destino.',
          },
          {
            type: 'list',
            title: 'Elementos essenciais',
            items: [
              'Dispositivos finais: computadores, servidores, impressoras, telefones e sensores.',
              'Equipamentos de rede: switches, routers, access points e firewalls.',
              'Meios de transmissão: cobre, fibra ótica e wireless.',
              'Protocolos: regras que definem como os dados são enviados e interpretados.',
            ],
          },
          {
            type: 'note',
            title: 'No simulador',
            text: 'Cada equipamento que adiciona ao mapa tem interfaces de rede. Um cabo só transporta dados se ambas as interfaces estiverem ativas.',
          },
        ],
        quiz: [
          {
            question: 'Qual destes equipamentos é um dispositivo final?',
            options: ['Switch', 'Router', 'Servidor', 'Access point'],
            answer: 2,
          },
          {
            question: 'O que permite que dois equipamentos se identifiquem na rede?',
            options: ['O endereço de rede (IP ou MAC)', 'A cor do cabo', 'O tamanho do ecrã', 'A marca do equipamento'],
            answer: 0,
          },
        ],
      },
      {
        slug: 'lan-man-wan',
        title: 'LAN, MAN e WAN',
        minutes: 9,
        summary: 'A escala geográfica das redes e o papel da Internet.',
        content: [
          {
            type: 'list',
            title: 'Três escalas',
            items: [
              'LAN (Local Area Network): uma sala, um edifício ou um campus. Latência baixa e débitos altos.',
              'MAN (Metropolitan Area Network): cobre uma cidade, ligando várias LANs.',
              'WAN (Wide Area Network): liga cidades ou países. A Internet é a maior WAN.',
            ],
          },
          {
            type: 'text',
            title: 'Internet e intranet',
            text: 'A Internet é a rede pública mundial. Uma intranet é uma rede privada com os mesmos protocolos, acessível apenas dentro de uma organização. Uma extranet expõe parte da intranet a parceiros autorizados.',
          },
          {
            type: 'note',
            title: 'Prática',
            text: 'No laboratório "Rede com router" constrói duas LANs separadas e liga-as com um router — o mesmo princípio que liga uma rede doméstica ao resto da Internet.',
          },
        ],
        quiz: [
          { question: 'Uma rede que liga duas cidades é uma…', options: ['LAN', 'WAN', 'VLAN', 'PAN'], answer: 1 },
        ],
      },
      {
        slug: 'ip-mascaras-mac',
        title: 'Endereços IP, máscaras e MAC',
        minutes: 12,
        summary: 'Como identificar um equipamento e a sua rede.',
        content: [
          {
            type: 'text',
            title: 'Endereço IPv4',
            text: 'Um endereço IPv4 tem 32 bits escritos em quatro números decimais (por exemplo 192.168.1.10). É composto pela parte de rede e pela parte de host; a máscara indica onde termina uma e começa a outra.',
          },
          {
            type: 'list',
            title: 'Máscaras usuais',
            items: [
              '255.255.255.0 (/24): 254 endereços utilizáveis.',
              '255.255.0.0 (/16): 65 534 endereços utilizáveis.',
              '255.255.255.192 (/26): 62 endereços utilizáveis.',
            ],
          },
          {
            type: 'text',
            title: 'Endereço MAC',
            text: 'O MAC é um identificador físico de 48 bits gravado na interface, como 00:1A:2B:01:02:03. Os switches usam MAC para entregar quadros dentro da LAN; os routers usam IP para atravessar redes.',
          },
          {
            type: 'note',
            title: 'Regra prática',
            text: 'Dois equipamentos comunicam diretamente se, aplicando a máscara, o resultado for o mesmo endereço de rede. Caso contrário precisam de um gateway.',
          },
        ],
        quiz: [
          { question: 'Com IP 192.168.1.10 e máscara 255.255.255.0, qual é a rede?', options: ['192.168.1.0', '192.168.0.0', '192.168.1.10', '255.255.255.0'], answer: 0 },
          { question: 'O endereço MAC é usado principalmente por…', options: ['Routers entre redes', 'Switches dentro da LAN', 'Servidores DNS', 'Firewalls de Internet'], answer: 1 },
        ],
      },
    ],
  },
  {
    slug: 'equipamentos',
    title: 'Equipamentos de rede',
    level: 2,
    icon: 'router',
    description: 'Função de computadores, switches, routers, servidores, access points, firewalls e modems.',
    lessons: [
      {
        slug: 'switches-e-hubs',
        title: 'Switches e hubs',
        minutes: 10,
        summary: 'Comutação de quadros versus repetição de sinal.',
        content: [
          {
            type: 'text',
            title: 'Switch',
            text: 'Um switch aprende em que porta está cada endereço MAC e envia o quadro apenas para a porta correta. Esta tabela MAC é construída automaticamente à medida que os quadros chegam.',
          },
          {
            type: 'text',
            title: 'Hub',
            text: 'Um hub repete o sinal para todas as portas, criando colisões e um único domínio de colisão. Hoje é usado sobretudo para estudo.',
          },
          {
            type: 'note',
            title: 'No simulador',
            text: 'Abra um switch e consulte a tabela MAC: as entradas são derivadas dos equipamentos realmente ligados a cada porta.',
          },
        ],
        quiz: [
          { question: 'Que tabela permite ao switch escolher a porta de saída?', options: ['Tabela ARP', 'Tabela MAC', 'Tabela de rotas', 'Tabela DNS'], answer: 1 },
        ],
      },
      {
        slug: 'routers',
        title: 'Routers e encaminhamento',
        minutes: 11,
        summary: 'Como os pacotes saltam entre redes.',
        content: [
          {
            type: 'text',
            title: 'Função',
            text: 'O router liga redes diferentes. Cada interface pertence a uma sub-rede e o router escolhe a interface de saída consultando a tabela de encaminhamento.',
          },
          {
            type: 'list',
            title: 'Tipos de rota',
            items: [
              'Ligada (connected): a rede está diretamente ligada a uma interface.',
              'Estática: configurada manualmente com um next-hop.',
              'Dinâmica: aprendida por protocolos como RIP ou OSPF.',
            ],
          },
          {
            type: 'note',
            title: 'Atenção',
            text: 'Um router só encaminha se conhecer a rede de destino. Sem rota, o pacote é descartado — e o simulador diz-lhe exatamente isso.',
          },
        ],
        quiz: [
          { question: 'O que acontece se o router não tiver rota para o destino?', options: ['Envia para todos', 'Descarta o pacote', 'Transforma em broadcast', 'Muda o IP de origem'], answer: 1 },
        ],
      },
      {
        slug: 'servidores-ap-firewall',
        title: 'Servidores, access points e firewalls',
        minutes: 10,
        summary: 'Serviços e segurança na rede.',
        content: [
          {
            type: 'list',
            title: 'Serviços típicos',
            items: [
              'DHCP: distribui endereços IP automaticamente (DORA).',
              'DNS: traduz nomes em endereços IP.',
              'HTTP/HTTPS: publica páginas web.',
              'FTP: transferência de ficheiros.',
              'E-mail: troca de mensagens.',
            ],
          },
          {
            type: 'text',
            title: 'Access point',
            text: 'Um AP liga dispositivos wireless à rede com fios. O SSID identifica a rede, e WPA2/WPA3 protegem a associação com palavra-passe.',
          },
          {
            type: 'text',
            title: 'Firewall',
            text: 'Filtra tráfego segundo regras (ACLs), autorizando ou bloqueando portas e endereços. Também pode aplicar NAT entre uma rede privada e a Internet.',
          },
        ],
        quiz: [
          { question: 'Quem distribui endereços IP automaticamente?', options: ['DNS', 'DHCP', 'FTP', 'HTTP'], answer: 1 },
        ],
      },
    ],
  },
  {
    slug: 'construcao',
    title: 'Construção de redes',
    level: 3,
    icon: 'cable',
    description: 'Ligar equipamentos, criar LANs, ligar redes e montar um escritório completo.',
    lessons: [
      {
        slug: 'primeira-ligacao',
        title: 'A primeira ligação',
        minutes: 10,
        summary: 'Dois computadores, um cabo, dois endereços.',
        content: [
          {
            type: 'list',
            title: 'Passos',
            items: [
              'Adicione dois computadores ao mapa.',
              'Ligue-os com um cabo Ethernet direto.',
              'Configure 192.168.1.10/24 num e 192.168.1.11/24 no outro.',
              'Execute ping no terminal do primeiro.',
            ],
          },
          {
            type: 'note',
            title: 'Verificação',
            text: 'Se o ping falhar, o terminal indica a causa: IP ausente, máscara inválida, cabo inexistente ou interface desligada.',
          },
        ],
        quiz: [
          { question: 'Dois PCs ligados diretamente precisam de gateway?', options: ['Sim, sempre', 'Não, se estiverem na mesma sub-rede', 'Só se usarem IPv4', 'Só com switch'], answer: 1 },
        ],
      },
      {
        slug: 'rede-com-switch',
        title: 'Criar uma LAN com switch',
        minutes: 12,
        summary: 'Partilhar um segmento entre vários equipamentos.',
        content: [
          {
            type: 'text',
            title: 'Porquê um switch',
            text: 'Um switch permite ligar vários equipamentos ao mesmo domínio de difusão. Todos devem ter IP na mesma sub-rede para comunicar diretamente.',
          },
          {
            type: 'note',
            title: 'Boa prática',
            text: 'Atribua endereços sequenciais e documente o plano de endereçamento. Use o gateway apenas se houver router.',
          },
        ],
        quiz: [
          { question: 'Quantos domínios de difusão tem um switch simples?', options: ['Um', 'Dois', 'Um por porta', 'Nenhum'], answer: 0 },
        ],
      },
      {
        slug: 'rede-com-router',
        title: 'Ligar duas redes com router',
        minutes: 14,
        summary: 'Gateways, interfaces e rotas estáticas.',
        content: [
          {
            type: 'list',
            title: 'Passos',
            items: [
              'Crie duas LANs com switches e computadores.',
              'Ligue cada switch a uma interface diferente do router.',
              'Configure um IP do router em cada sub-rede.',
              'Nos PCs, defina o gateway com esse IP.',
              'Teste o ping entre redes.',
            ],
          },
          {
            type: 'note',
            title: 'Duas redes, dois lados',
            text: 'Se usar dois routers, cada um precisa de uma rota estática para a rede remota. Sem essa rota, o pacote morre no router.',
          },
        ],
        quiz: [
          { question: 'Para que serve o gateway padrão num PC?', options: ['Para resolver nomes', 'Para sair da sub-rede local', 'Para atribuir IP', 'Para criar VLANs'], answer: 1 },
        ],
      },
    ],
  },
  {
    slug: 'configuracao',
    title: 'Configuração de equipamentos',
    level: 4,
    icon: 'terminal',
    description: 'IPv4, DHCP, DNS, switches, routers, VLANs e routing estático na CLI.',
    lessons: [
      {
        slug: 'cli-modos',
        title: 'A CLI e os seus modos',
        minutes: 12,
        summary: 'User EXEC, Privileged EXEC, Global Configuration e Interface Configuration.',
        content: [
          {
            type: 'code',
            title: 'Sequência típica',
            text: 'Router> enable\nRouter# configure terminal\nRouter(config)# hostname R1\nR1(config)# interface Gig0/0\nR1(config-if)# ip address 192.168.1.1 255.255.255.0\nR1(config-if)# no shutdown\nR1(config-if)# end\nR1# write memory',
          },
          {
            type: 'list',
            title: 'Modos',
            items: [
              'User EXEC (>): comandos de consulta simples.',
              'Privileged EXEC (#): show, ping e write memory.',
              'Global Configuration ((config)#): hostname, interfaces, rotas, VLANs.',
              'Interface Configuration ((config-if)#): IP, shutdown, switchport.',
            ],
          },
        ],
        quiz: [
          { question: 'Qual comando entra no modo privilegiado?', options: ['configure terminal', 'enable', 'exit', 'no shutdown'], answer: 1 },
        ],
      },
      {
        slug: 'vlans',
        title: 'VLANs e trunks',
        minutes: 13,
        summary: 'Separar departamentos no mesmo switch.',
        content: [
          {
            type: 'text',
            title: 'VLAN',
            text: 'Uma VLAN é uma rede lógica dentro do switch. Portas em VLANs diferentes não trocam quadros, mesmo estando no mesmo equipamento.',
          },
          {
            type: 'code',
            title: 'Configuração',
            text: 'SW1(config)# vlan 10\nSW1(config)# name Financeiro\nSW1(config)# interface Fa0/1\nSW1(config-if)# switchport mode access\nSW1(config-if)# switchport access vlan 10',
          },
          {
            type: 'note',
            title: 'Trunk',
            text: 'Uma porta trunk transporta várias VLANs entre switches ou até um router. No simulador, indique as VLANs permitidas na configuração da porta.',
          },
        ],
        quiz: [
          { question: 'Duas portas access em VLANs diferentes…', options: ['Comunicam sempre', 'Não comunicam diretamente', 'Formam um trunk', 'Precisam de DNS'], answer: 1 },
        ],
      },
      {
        slug: 'dhcp-dns',
        title: 'DHCP e DNS na prática',
        minutes: 12,
        summary: 'Automatizar endereços e nomes.',
        content: [
          {
            type: 'list',
            title: 'DHCP',
            items: [
              'Defina o pool com rede, máscara, intervalo, gateway e DNS.',
              'O cliente envia Discover; o servidor responde Offer; o cliente pede com Request; o servidor confirma com Acknowledge.',
              'No simulador, execute "ipconfig /renew" no cliente e observe os quatro passos.',
            ],
          },
          {
            type: 'list',
            title: 'DNS',
            items: [
              'Registe pares nome → IP no servidor DNS.',
              'O cliente envia a consulta e recebe o endereço correspondente.',
              'Sem registo, a resposta é NXDOMAIN.',
            ],
          },
        ],
        quiz: [
          { question: 'Qual é a ordem correta do processo DHCP?', options: ['Offer, Discover, ACK, Request', 'Discover, Offer, Request, ACK', 'Request, ACK, Discover, Offer', 'Discover, Request, Offer, ACK'], answer: 1 },
        ],
      },
    ],
  },
  {
    slug: 'administracao',
    title: 'Administração e segurança',
    level: 5,
    icon: 'shield',
    description: 'Firewall, ACL, NAT, wireless seguro, monitorização e diagnóstico.',
    lessons: [
      {
        slug: 'firewall-acl',
        title: 'Firewall e ACL',
        minutes: 11,
        summary: 'Controlar quem pode falar com quem.',
        content: [
          {
            type: 'text',
            title: 'ACL',
            text: 'Uma lista de controlo de acesso autoriza ou nega tráfego com base em endereços e portas. As regras são avaliadas por ordem e a primeira que corresponde é aplicada.',
          },
          {
            type: 'note',
            title: 'No simulador',
            text: 'O firewall permite configurar o papel de cada interface (inside/outside) e o estado do NAT. O efeito das ACLs na simulação será ampliado nas próximas versões.',
          },
        ],
        quiz: [
          { question: 'Uma ACL é avaliada…', options: ['Por ordem, até corresponder', 'Aleatoriamente', 'Só no destino', 'Apenas em IPv6'], answer: 0 },
        ],
      },
      {
        slug: 'nat',
        title: 'NAT e acesso à Internet',
        minutes: 10,
        summary: 'Traduzir endereços privados.',
        content: [
          {
            type: 'text',
            title: 'NAT',
            text: 'O NAT traduz endereços privados (por exemplo 192.168.0.0/16) em endereços públicos. É o que permite que muitos equipamentos partilhem uma ligação à Internet.',
          },
          {
            type: 'list',
            title: 'Papéis das interfaces',
            items: ['inside: rede privada.', 'outside: rede pública.', 'O router mantém a tradução ativa enquanto existir tráfego.'],
          },
        ],
        quiz: [
          { question: 'O NAT serve para…', options: ['Atribuir MACs', 'Traduzir endereços privados em públicos', 'Criar VLANs', 'Resolver nomes'], answer: 1 },
        ],
      },
      {
        slug: 'diagnostico',
        title: 'Diagnóstico de problemas',
        minutes: 12,
        summary: 'Método sistemático para encontrar a falha.',
        content: [
          {
            type: 'list',
            title: 'Ordem de verificação',
            items: [
              'Físico: existe cabo? As portas estão ativas?',
              'Endereçamento: IP, máscara e gateway corretos?',
              'Camada 2: VLAN e trunk compatíveis?',
              'Camada 3: existe rota para o destino?',
              'Serviços: DHCP/DNS ativos e alcançáveis?',
            ],
          },
          {
            type: 'note',
            title: 'NETBOT',
            text: 'O assistente analisa a topologia real e indica o motivo provável de cada falha, com a configuração concreta dos equipamentos.',
          },
        ],
        quiz: [
          { question: 'Qual verificação vem primeiro?', options: ['Rotas estáticas', 'Ligação física e estado das portas', 'Registos DNS', 'Versão do servidor'], answer: 1 },
        ],
      },
    ],
  },
]

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

export const ASSESSMENTS = [
  {
    slug: 'avaliacao-fundamentos',
    title: 'Avaliação — Fundamentos de redes',
    course: 'fundamentos',
    questions: [
      {
        question: 'Um endereço IPv4 tem quantos bits?',
        options: ['16', '32', '48', '64'],
        answer: 1,
      },
      {
        question: 'Qual equipamento separa domínios de difusão?',
        options: ['Hub', 'Switch', 'Router', 'Repetidor'],
        answer: 2,
      },
      {
        question: 'A máscara 255.255.255.0 corresponde a que prefixo?',
        options: ['/16', '/24', '/8', '/30'],
        answer: 1,
      },
      {
        question: 'Dois PCs com 192.168.1.10/24 e 192.168.2.20/24…',
        options: ['Comunicam diretamente', 'Precisam de router', 'Têm IPs duplicados', 'Estão na mesma VLAN obrigatoriamente'],
        answer: 1,
      },
      {
        question: 'O DHCP usa que sequência?',
        options: ['DORA', 'STP', 'ARP', 'NAT'],
        answer: 0,
      },
    ],
  },
  {
    slug: 'avaliacao-configuracao',
    title: 'Avaliação — Configuração',
    course: 'configuracao',
    questions: [
      {
        question: 'Qual comando mostra o resumo das interfaces?',
        options: ['show ip interface brief', 'show vlan', 'ipconfig', 'tracert'],
        answer: 0,
      },
      {
        question: 'O que faz "no shutdown" numa interface?',
        options: ['Desliga a interface', 'Ativa a interface', 'Apaga o IP', 'Reinicia o equipamento'],
        answer: 1,
      },
      {
        question: 'Uma porta trunk transporta…',
        options: ['Uma só VLAN', 'Várias VLANs', 'Apenas tráfego VoIP', 'Apenas IPv6'],
        answer: 1,
      },
      {
        question: 'Para guardar a configuração na CLI usa-se…',
        options: ['write memory', 'ping', 'enable', 'show run'],
        answer: 0,
      },
      {
        question: 'Uma rota estática é identificada por…',
        options: ['C', 'S', 'D', 'O'],
        answer: 1,
      },
    ],
  },
  {
    slug: 'avaliacao-diagnostico',
    title: 'Avaliação — Diagnóstico e segurança',
    course: 'administracao',
    questions: [
      {
        question: 'Um ping falha com "VLAN incompatível". A causa é…',
        options: ['Cabo partido', 'Portas em VLANs diferentes', 'DNS desligado', 'Sem endereço MAC'],
        answer: 1,
      },
      {
        question: 'O NAT traduz…',
        options: ['Nomes em IPs', 'MACs em IPs', 'Endereços privados em públicos', 'VLANs em trunks'],
        answer: 2,
      },
      {
        question: 'Um AP sem SSID…',
        options: ['Funciona melhor', 'Não permite associações wireless', 'Atribui IPs', 'Cria VLANs'],
        answer: 1,
      },
      {
        question: 'Qual é o primeiro passo do diagnóstico?',
        options: ['Verificar rotas', 'Verificar ligação física e portas', 'Alterar o DNS', 'Reiniciar o router'],
        answer: 1,
      },
      {
        question: 'Uma ACL aplica…',
        options: ['A primeira regra que corresponde', 'Todas as regras sempre', 'A última regra', 'Nenhuma regra'],
        answer: 0,
      },
    ],
  },
]
