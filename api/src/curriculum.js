// Currículo progressivo do NETLAB ACADEMY — do zero até à construção de redes.
// Cada lição tem explicação simples, exemplo do quotidiano e um teste com explicação.
// O campo `practice` liga a teoria ao simulador ("Aprender na prática").

const t = (title, text) => ({ type: 'text', title, text })
const l = (title, items) => ({ type: 'list', title, items })
const n = (title, text) => ({ type: 'note', title, text })
const c = (title, text) => ({ type: 'code', title, text })
const s = (title, items) => ({ type: 'steps', title, items })
const q = (question, options, answer, explanation) => ({ question, options, answer, explanation })

const pc = (name, x, y, extra = {}) => ({ name, type: 'pc', x, y, ...extra })
const sw = (name, x, y, extra = {}) => ({ name, type: 'switch', x, y, ...extra })
const router = (name, x, y, extra = {}) => ({ name, type: 'router', x, y, ...extra })
const server = (name, x, y, extra = {}) => ({ name, type: 'server', x, y, ...extra })

const practice = (title, goal, steps, starter) => ({ title, goal, steps, starter })

/* ------------------------------------------------------------------ */
/* MÓDULO 1 — Introdução às redes de computadores                      */
/* ------------------------------------------------------------------ */

const modulo1 = {
  slug: 'modulo-1-introducao-a-redes',
  title: 'Módulo 1 — Introdução às redes de computadores',
  level: 1,
  icon: 'network',
  description:
    'Começa do zero: o que é uma rede, para que serve, como os computadores falam entre si e que formas uma rede pode ter.',
  lessons: [
    {
      slug: 'o-que-e-uma-rede',
      title: 'O que é uma rede de computadores?',
      minutes: 6,
      summary: 'Uma rede é um grupo de equipamentos ligados que partilham informação.',
      content: [
        t(
          'Definição simples',
          'Uma rede de computadores é um conjunto de equipamentos ligados entre si que conseguem trocar informação. Pensa numa sala de aula: se todos falam a mesma língua e estão ao alcance da voz, conseguem comunicar. Na rede, o "alcance" vem dos cabos ou do Wi-Fi, e a "língua" são os protocolos.'
        ),
        l('Exemplos que já usas', [
          'O telefone a ligar ao Wi-Fi de casa para abrir o Instagram.',
          'A impressora da escola a receber o trabalho de vários computadores.',
          'A caixa multibanco a falar com o banco para confirmar o teu saldo.',
        ]),
        n(
          'As três peças de qualquer rede',
          '1) Dispositivos que enviam e recebem (PC, telefone, servidor). 2) Um meio por onde passam os dados (cabo ou ar). 3) Regras comuns, os protocolos, que dizem como os dados são escritos e lidos.'
        ),
        c(
          'A rede mais pequena possível',
          'PC0  ─────────  PC1\n       cabo\n\nDois computadores ligados por um cabo já formam uma rede.'
        ),
      ],
      quiz: [
        q(
          'O que faz de dois computadores uma rede?',
          ['Estarem na mesma sala', 'Estarem ligados e conseguirem trocar dados', 'Terem o mesmo ecrã', 'Terem a mesma marca'],
          1,
          'Uma rede existe quando os equipamentos estão ligados por um meio (cabo ou ar) e conseguem trocar informação com regras comuns.'
        ),
        q(
          'Qual destes NÃO é um elemento necessário para comunicar?',
          ['Um dispositivo que enviar dados', 'Um meio de transmissão', 'Regras (protocolos)', 'O mesmo sistema operativo'],
          3,
          'Sistemas operativos diferentes comunicam entre si. O que é necessário é haver um meio e protocolos comuns.'
        ),
      ],
      practice: practice(
        'Dois computadores, um cabo',
        'Liga dois computadores com um cabo direto. Ainda não há IP — é só o primeiro contacto com o simulador.',
        [
          'Abre a biblioteca de equipamentos e coloca dois computadores no mapa.',
          'Escolhe a ferramenta Cabo e liga as portas Eth0 dos dois computadores.',
          'Repara que uma ligação física ainda não é comunicação: falta configurar endereços.',
        ],
        {
          devices: [pc('PC0', 30, 55), pc('PC1', 70, 55)],
          links: [{ a: 'PC0', b: 'PC1' }],
        }
      ),
    },
    {
      slug: 'para-que-servem-as-redes',
      title: 'Para que servem as redes?',
      minutes: 6,
      summary: 'Partilhar recursos, comunicar e aceder a serviços.',
      content: [
        t(
          'A ideia central',
          'As redes existem para partilhar. Em vez de cada pessoa ter a sua impressora e a sua cópia dos ficheiros, a rede permite partilhar uma impressora, uma pasta, uma ligação à Internet ou um servidor.'
        ),
        l('O que se partilha numa rede', [
          'Hardware: impressoras, scanners, discos.',
          'Software e dados: ficheiros, páginas web, bases de dados.',
          'Serviços: correio eletrónico, DNS, DHCP, acesso à Internet.',
          'Comunicação: chamadas, mensagens, videoconferência.',
        ]),
        n(
          'No dia a dia',
          'Quando entras na plataforma da escola, o teu computador pede uma página a um servidor. Esse pedido atravessa a tua rede local, o router da escola e a Internet.'
        ),
      ],
      quiz: [
        q(
          'Qual é a principal vantagem de uma rede?',
          ['Gastar mais cabos', 'Partilhar recursos e informação', 'Ter computadores mais rápidos', 'Eliminar a necessidade de servidores'],
          1,
          'A rede permite partilhar recursos (impressoras, ficheiros, serviços) e comunicar sem duplicar equipamento.'
        ),
      ],
      practice: practice(
        'Partilhar uma impressora',
        'Uma impressora ligada ao switch serve vários computadores.',
        [
          'Coloca uma impressora e dois computadores.',
          'Liga todos a um switch.',
          'Percebe que a impressora passa a ser um recurso comum.',
        ],
        {
          devices: [sw('SW0', 50, 35), pc('PC0', 25, 65), pc('PC1', 50, 65), { name: 'IMP0', type: 'printer', x: 75, y: 65 }],
          links: [
            { a: 'PC0', b: 'SW0' },
            { a: 'PC1', b: 'SW0' },
            { a: 'IMP0', b: 'SW0' },
          ],
        }
      ),
    },
    {
      slug: 'como-os-computadores-comunicam',
      title: 'Como os computadores comunicam?',
      minutes: 7,
      summary: 'Emissor, mensagem, meio e receptor — e a ideia de endereço.',
      content: [
        t(
          'Quatro passos',
          'Para haver comunicação é preciso: um emissor (quem envia), uma mensagem (os dados), um meio (cabo ou ar) e um receptor (quem recebe). Se faltar um destes elementos, não há comunicação.'
        ),
        l('Sem endereço, o dados perdem-se', [
          'O endereço diz para onde vai a mensagem — como a morada de uma carta.',
          'Na rede, o endereço mais conhecido é o endereço IP.',
          'Também existe um endereço físico de cada placa de rede: o endereço MAC.',
        ]),
        c(
          'Enviar um pedido',
          'PC0  →  [ mensagem ]  →  meio  →  PC1\n         destino: PC1\n\nSem saber o destino, o switch não sabe por que porta enviar.'
        ),
        n('Erro comum', 'Ter o cabo ligado não significa que a comunicação funciona. É preciso endereço, máscara e, se o destino estiver noutra rede, gateway.'),
      ],
      quiz: [
        q(
          'O que indica o endereço de destino?',
          ['Quem enviou', 'Para onde a mensagem deve ir', 'O tipo de cabo', 'A velocidade da rede'],
          1,
          'O endereço de destino diz a quem pertence a mensagem; sem ele, os equipamentos não sabem onde a entregar.'
        ),
      ],
      practice: practice(
        'Cabo ligado, comunicação em falta',
        'Vê com os teus olhos que uma ligação física não basta.',
        [
          'Liga dois computadores por cabo.',
          'Sem configurar IP, executa um ping de PC0 para PC1.',
          'Lê a mensagem de erro: falta endereço IP.',
        ],
        {
          devices: [pc('PC0', 30, 55), pc('PC1', 70, 55)],
          links: [{ a: 'PC0', b: 'PC1' }],
        }
      ),
    },
    {
      slug: 'o-que-e-uma-lan',
      title: 'O que é uma LAN?',
      minutes: 6,
      summary: 'Uma rede local, dentro de um espaço pequeno.',
      content: [
        t(
          'LAN = Local Area Network',
          'Uma LAN é uma rede limitada a um espaço pequeno: uma casa, uma sala, um escritório ou uma escola. Normalmente é gerida por uma só organização e usa cabos e Wi-Fi.'
        ),
        l('Características de uma LAN', [
          'Cobertura pequena (metros a algumas centenas de metros).',
          'Velocidade alta e latência baixa.',
          'Os equipamentos estão normalmente na mesma sub-rede.',
          'Exemplo: a rede Wi-Fi de tua casa.',
        ]),
        n('No simulador', 'Uma LAN típica é um switch com vários computadores e, se precisares de sair para outra rede, um router.'),
      ],
      quiz: [
        q(
          'Qual destes é um exemplo de LAN?',
          ['A rede de computadores de uma sala de aula', 'Todas as redes do mundo ligadas', 'A rede entre Lisboa e o Porto', 'A rede de satélites'],
          0,
          'LAN é uma rede local, de curta distância, como a de uma sala ou de uma casa.'
        ),
      ],
      practice: practice(
        'Construir uma LAN',
        'Junta três computadores num switch.',
        [
          'Coloca um switch e três computadores.',
          'Liga cada computador a uma porta livre do switch.',
          'Esta é a base de quase todas as redes locais.',
        ],
        {
          devices: [sw('SW0', 50, 40), pc('PC0', 20, 70), pc('PC1', 50, 70), pc('PC2', 80, 70)],
          links: [
            { a: 'PC0', b: 'SW0' },
            { a: 'PC1', b: 'SW0' },
            { a: 'PC2', b: 'SW0' },
          ],
        }
      ),
    },
    {
      slug: 'o-que-e-uma-wan',
      title: 'O que é uma WAN?',
      minutes: 6,
      summary: 'Uma rede que liga locais distantes.',
      content: [
        t(
          'WAN = Wide Area Network',
          'Uma WAN liga redes locais que estão longe umas das outras: cidades, países ou continentes. Normalmente não é construída por uma só pessoa: usa infraestruturas de operadoras.'
        ),
        l('LAN vs WAN', [
          'LAN: pequena, rápida, barata, controlada por ti.',
          'WAN: grande, mais lenta, cara, depende de operadoras.',
          'A Internet é a maior WAN do mundo: liga milhões de LANs.',
        ]),
        c('Hierarquia simples', 'LAN (casa) → router → operadora → Internet → router → LAN (escola)'),
      ],
      quiz: [
        q(
          'A Internet é melhor descrita como…',
          ['Uma LAN gigante', 'Uma WAN que liga muitas redes', 'Um único computador', 'Um switch'],
          1,
          'A Internet é uma WAN: liga milhões de redes locais espalhadas pelo mundo.'
        ),
      ],
      practice: practice(
        'Duas LANs ligadas',
        'Duas redes locais ligadas por routers representam uma WAN.',
        [
          'Coloca dois switches, dois routers e computadores em cada lado.',
          'Liga cada switch ao seu router.',
          'Liga os dois routers entre si: é o elo da WAN.',
        ],
        {
          devices: [router('R0', 35, 45), router('R1', 65, 45), sw('SW0', 20, 55), sw('SW1', 80, 55), pc('PC0', 10, 75), pc('PC1', 30, 75), pc('PC2', 70, 75), pc('PC3', 90, 75)],
          links: [
            { a: 'PC0', b: 'SW0' },
            { a: 'PC1', b: 'SW0' },
            { a: 'SW0', b: 'R0' },
            { a: 'R0', b: 'R1' },
            { a: 'R1', b: 'SW1' },
            { a: 'PC2', b: 'SW1' },
            { a: 'PC3', b: 'SW1' },
          ],
        }
      ),
    },
    {
      slug: 'o-que-e-a-internet',
      title: 'O que é a Internet?',
      minutes: 6,
      summary: 'Uma rede de redes que fala a mesma língua: TCP/IP.',
      content: [
        t(
          'A rede das redes',
          'A Internet não é uma empresa nem um computador gigante. É um conjunto de redes de todo o mundo que aceitaram usar as mesmas regras: a família de protocolos TCP/IP.'
        ),
        l('O que precisas para entrar', [
          'Um endereço IP (público) atribuído pelo operador.',
          'Um router que ligue a tua LAN à rede do operador.',
          'Um servidor DNS para traduzir nomes em endereços.',
        ]),
        n(
          'Curiosidade útil',
          'Quando escreves netlab.pt, o teu computador pergunta a um DNS qual é o IP desse nome. Só depois consegue enviar o pedido ao servidor certo.'
        ),
      ],
      quiz: [
        q(
          'Que protocolos permitem que redes diferentes se entendam na Internet?',
          ['Apenas Bluetooth', 'TCP/IP', 'Apenas cabo coaxial', 'Nenhum, cada rede fala à sua maneira'],
          1,
          'TCP/IP é a linguagem comum da Internet; é isso que permite ligar redes diferentes.'
        ),
      ],
      practice: practice(
        'Rede local com saída',
        'Uma LAN ligada a um router que representa a Internet.',
        [
          'Cria uma LAN com switch e computadores.',
          'Liga o switch a um router.',
          'O router é a porta de saída da LAN para o exterior.',
        ],
        {
          devices: [sw('SW0', 45, 50), pc('PC0', 25, 70), pc('PC1', 45, 70), router('R0', 70, 50)],
          links: [
            { a: 'PC0', b: 'SW0' },
            { a: 'PC1', b: 'SW0' },
            { a: 'SW0', b: 'R0' },
          ],
        }
      ),
    },
    {
      slug: 'internet-vs-intranet',
      title: 'Diferença entre Internet e Intranet',
      minutes: 5,
      summary: 'Mesma tecnologia, públicos diferentes.',
      content: [
        t(
          'Intranet',
          'Uma intranet é uma rede privada que usa a mesma tecnologia da Internet (páginas, TCP/IP), mas só está acessível a quem pertence à organização. É a "Internet interna" de uma escola ou empresa.'
        ),
        l('Comparação', [
          'Internet: pública, qualquer pessoa pode aceder a serviços abertos.',
          'Intranet: privada, exige pertencer à organização (ou estar ligado à rede/VPN).',
          'Extranet: parte da intranet aberta a parceiros autorizados.',
        ]),
        n('Ideia-chave', 'A diferença não é a tecnologia — é quem pode entrar.'),
      ],
      quiz: [
        q(
          'O que distingue uma intranet da Internet?',
          ['Usa outra tecnologia', 'É privada e restrita à organização', 'Não usa IP', 'É sempre mais lenta'],
          1,
          'A intranet usa a mesma tecnologia, mas o acesso é restrito aos membros da organização.'
        ),
      ],
    },
    {
      slug: 'o-que-e-uma-topologia',
      title: 'O que é uma topologia de rede?',
      minutes: 6,
      summary: 'A forma como os equipamentos estão ligados.',
      content: [
        t(
          'Topologia',
          'Topologia é a forma (física ou lógica) como os equipamentos e as ligações estão organizados. A mesma rede pode ser desenhada de várias maneiras, com custos e comportamentos diferentes.'
        ),
        l('Porque importa', [
          'Determina o custo dos cabos e equipamentos.',
          'Determina o que acontece quando um cabo se rompe.',
          'Determina a facilidade de acrescentar novos equipamentos.',
        ]),
        c('Exemplo', 'Estrela:      PC ─ SW ─ PC\nBarramento:  PC ── PC ── PC (um só cabo partilhado)'),
      ],
      quiz: [
        q(
          'Topologia de rede é…',
          ['A cor dos cabos', 'A forma como os equipamentos estão ligados', 'A velocidade da Internet', 'O nome do router'],
          1,
          'Topologia descreve a organização das ligações entre equipamentos.'
        ),
      ],
    },
    {
      slug: 'topologias-estrela-barramento-anel-malha',
      title: 'Topologia em estrela, barramento, anel e malha',
      minutes: 8,
      summary: 'Quatro formas clássicas, com vantagens e desvantagens.',
      content: [
        t(
          'Estrela',
          'Todos os equipamentos ligam a um ponto central (switch ou hub). É a topologia mais usada: se um cabo falha, só esse equipamento fica isolado. Se o centro falhar, a rede inteira para.'
        ),
        c('Estrela', '        PC0\n         │\nPC1 ── SW0 ── PC2\n         │\n        PC3'),
        t(
          'Barramento',
          'Todos partilham um único cabo. É barata, mas uma interrupção no cabo pode derrubar toda a rede e há colisões.'
        ),
        c('Barramento', 'PC0 ──── PC1 ──── PC2 ──── PC3'),
        t('Anel', 'Cada equipamento liga ao seguinte e o último ao primeiro. Os dados circulam num anel. Uma falha pode partir o anel.'),
        c('Anel', 'PC0 ── PC1\n │       │\nPC3 ── PC2'),
        t(
          'Malha',
          'Vários caminhos entre equipamentos. É muito fiável (se um caminho falha, há alternativas), mas exige muitas ligações e é cara.'
        ),
        c('Malha', 'PC0 ── PC1\n │ ╲  ╱ │\n │  ╳   │\n │ ╱  ╲ │\nPC3 ── PC2'),
        n('No simulador', 'A topologia em estrela é a que vais construir quase sempre: computadores ligados a um switch.'),
      ],
      quiz: [
        q(
          'Qual é a principal vantagem da topologia em estrela?',
          ['Não precisa de cabos', 'Uma falha num cabo afeta apenas um equipamento', 'É sempre mais barata', 'Não precisa de switch'],
          1,
          'Em estrela, cada equipamento tem o seu próprio cabo até ao centro; uma falha fica isolada nesse ramo.'
        ),
        q(
          'Que topologia oferece mais caminhos alternativos?',
          ['Barramento', 'Anel', 'Malha', 'Estrela'],
          2,
          'A malha tem várias ligações entre os mesmos equipamentos, por isso sobrevive melhor a falhas.'
        ),
      ],
    },
  ],
}

/* ------------------------------------------------------------------ */
/* MÓDULO 2 — Conhecer os equipamentos de rede                          */
/* ------------------------------------------------------------------ */

const equipmentLesson = (slug, title, model, blocks, quizItems, practiceSpec) => ({
  slug,
  title,
  minutes: 6,
  summary: model.summary,
  content: blocks,
  quiz: quizItems,
  practice: practiceSpec,
})

const modulo2 = {
  slug: 'modulo-2-equipamentos',
  title: 'Módulo 2 — Conhecer os equipamentos de rede',
  level: 2,
  icon: 'devices',
  description:
    'Um equipamento de cada vez: o que é, para que serve, como funciona, onde é usado e em que difere dos outros.',
  lessons: [
    equipmentLesson(
      'computador',
      'Computador',
      { summary: 'O dispositivo final que cria e consome informação.' },
      [
        t('O que é?', 'Um computador é um dispositivo final: tem uma placa de rede, um sistema operativo e aplicações que geram e recebem dados.'),
        l('Para que serve?', [
          'Criar e consumir informação (navegar, enviar ficheiros, imprimir).',
          'Ser origem ou destino de quase todos os testes que vais fazer.',
        ]),
        t('Como funciona?', 'A placa de rede envia quadros pelo cabo ou pelo ar. Para comunicar em IPv4, precisa de um endereço IP e de uma máscara — sem isso não participa na rede.'),
        n('Onde é usado?', 'Em todo o lado: casa, escola, empresa. No simulador é o PC, o laptop, o telefone, o tablet.'),
        t('Diferença dos outros', 'Não encaminha tráfego de terceiros. Um computador é origem/destino, não um ponto de passagem (salvo funções especiais).'),
      ],
      [
        q('Sem endereço IP, um computador consegue fazer ping IPv4?', ['Sim, sempre', 'Não, não tem identidade na rede', 'Só se tiver cabo', 'Só se for Wi-Fi'], 1, 'Sem IP não há identidade na rede IPv4: o ping falha por falta de endereço.'),
      ],
      practice('Configurar um computador', 'Prepara o PC0 com 192.168.1.10/24.', [
        'Abre as configurações do PC0.',
        'Preenche IP 192.168.1.10 e máscara 255.255.255.0.',
        'Confirma o estado da interface.',
      ], { devices: [pc('PC0', 50, 50)], links: [] })
    ),
    equipmentLesson(
      'switch',
      'Switch',
      { summary: 'Liga equipamentos dentro da mesma rede e entrega os quadros ao destino certo.' },
      [
        t('O que é?', 'Um switch é um equipamento de rede local com várias portas. Aprende os endereços MAC dos equipamentos ligados e envia cada quadro apenas para a porta correta.'),
        l('Para que serve?', [
          'Interligar computadores, impressoras e servidores.',
          'Separar o tráfego em VLANs.',
          'Evitar colisões (ao contrário do hub).',
        ]),
        t('Como funciona?', 'Guarda uma tabela MAC → porta. Quando chega um quadro, consulta a tabela e reencaminha. Não altera endereços IP.'),
        n('Muito importante', 'Um switch NÃO atribui endereços IP. Se um computador está ligado só a um switch, continua sem IP até alguém o configurar ou até existir um servidor DHCP acessível.'),
        t('Diferença dos outros', 'O hub repete para todos; o switch entrega só ao destino. O router liga redes diferentes; o switch liga equipamentos da mesma rede.'),
      ],
      [
        q('Um switch atribui IP automaticamente?', ['Sim', 'Não, só um servidor DHCP o faz', 'Sim, se tiver cabo', 'Só se for Wi-Fi'], 1, 'O switch trabalha com MAC, não com IP. A atribuição automática é função de um servidor DHCP.'),
        q('Qual a diferença entre switch e hub?', ['O switch envia só para a porta certa', 'O hub é mais inteligente', 'Não há diferença', 'O switch não tem portas'], 0, 'O switch aprende MACs e reencaminha seletivamente; o hub repete para todas as portas.'),
      ],
      practice('LAN com switch', 'Liga três computadores a um switch.', [
        'Coloca um switch e três computadores.',
        'Liga cada PC a uma porta livre.',
        'No passo seguinte, dá IPs e testa o ping.',
      ], { devices: [sw('SW0', 50, 35), pc('PC0', 25, 65), pc('PC1', 50, 65), pc('PC2', 75, 65)], links: [{ a: 'PC0', b: 'SW0' }, { a: 'PC1', b: 'SW0' }, { a: 'PC2', b: 'SW0' }] })
    ),
    equipmentLesson(
      'router',
      'Router',
      { summary: 'Liga redes diferentes e escolhe o melhor caminho.' },
      [
        t('O que é?', 'Um router liga redes diferentes. Tem interfaces (portas) com endereços IP distintos, uma por rede, e uma tabela de rotas.'),
        l('Para que serve?', [
          'Ligar a LAN à Internet.',
          'Ligar duas sub-redes (por exemplo 192.168.1.0/24 e 192.168.2.0/24).',
          'Escolher o próximo salto de cada pacote.',
        ]),
        t('Como funciona?', 'Recebe o pacote, consulta a tabela de rotas, escolhe a rota mais específica e envia pelo próximo salto. Sem interfaces configuradas, não encaminha nada.'),
        n('Diferença dos outros', 'O switch não olha para IPs; o router decide com base no IP de destino. Um router com interfaces desligadas é apenas uma caixa ligada.'),
      ],
      [
        q('Para ligar duas sub-redes diferentes precisas de…', ['Um hub', 'Um router', 'Outro cabo', 'Nada, o switch resolve'], 1, 'Só um router (ou equipamento de camada 3) encaminha entre sub-redes diferentes.'),
        q('Um router sem interfaces IP configuradas encaminha?', ['Sim', 'Não', 'Só com cabo cruzado', 'Só à noite'], 1, 'Sem IP e interfaces ativas, o router não tem como encaminhar pacotes.'),
      ],
      practice('Router entre duas redes', 'Prepara um router para ligar duas redes.', [
        'Coloca um router entre dois switches.',
        'Configura Gig0/0 com 192.168.10.1/24 e Gig0/1 com 192.168.20.1/24.',
        'Os PCs passam a usar 192.168.10.1 / 192.168.20.1 como gateway.',
      ], { devices: [router('R0', 50, 40), sw('SW0', 25, 60), sw('SW1', 75, 60), pc('PC0', 12, 78), pc('PC1', 38, 78), pc('PC2', 62, 78), pc('PC3', 88, 78)], links: [{ a: 'PC0', b: 'SW0' }, { a: 'PC1', b: 'SW0' }, { a: 'SW0', b: 'R0' }, { a: 'R0', b: 'SW1' }, { a: 'PC2', b: 'SW1' }, { a: 'PC3', b: 'SW1' }] })
    ),
    equipmentLesson(
      'hub',
      'Hub',
      { summary: 'Repetidor antigo: envia tudo para todas as portas.' },
      [
        t('O que é?', 'O hub é um repetidor de camada física. Quando recebe dados numa porta, copia-os para todas as outras.'),
        l('Para que servia?', ['Ligar equipamentos numa LAN simples e barata.', 'Hoje é raro: foi substituído pelo switch.']),
        t('Como funciona?', 'Não aprende endereços nem decide: apenas repete. Todos partilham a mesma "conversa", por isso há colisões e menos desempenho.'),
        n('Diferença dos outros', 'O hub repete para todos; o switch entrega só ao destino. É por isso que o switch é o padrão atual.'),
      ],
      [
        q('Qual é a grande limitação de um hub?', ['Não tem portas', 'Repete os dados para todas as portas', 'Não funciona com cabos', 'Não precisa de energia'], 1, 'Ao repetir para todos, o hub desperdiça largura de banda e provoca colisões.'),
      ],
      practice('Hub vs switch', 'Compara a ligação com hub.', [
        'Coloca um hub e dois computadores.',
        'Liga-os e observa que a ligação funciona, mas sem inteligência.',
        'Troca por um switch para ver a diferença de comportamento.',
      ], { devices: [{ name: 'HUB0', type: 'hub', x: 50, y: 40 }, pc('PC0', 30, 70), pc('PC1', 70, 70)], links: [{ a: 'PC0', b: 'HUB0' }, { a: 'PC1', b: 'HUB0' }] })
    ),
    equipmentLesson(
      'servidor',
      'Servidor',
      { summary: 'Fornece serviços à rede: DHCP, DNS, web, ficheiros.' },
      [
        t('O que é?', 'Um servidor é um computador dedicado a prestar serviços a outros equipamentos, os clientes.'),
        l('Serviços típicos', ['DHCP: distribui endereços IP.', 'DNS: traduz nomes em IPs.', 'HTTP/HTTPS: páginas web.', 'FTP: ficheiros.']),
        t('Como funciona?', 'Fica ligado à rede, com IP fixo (é boa prática), e responde a pedidos dos clientes.'),
        n('No simulador', 'Ativa os serviços no separador "Serviços" e define os parâmetros. Um servidor com DHCP desligado não atribui nada.'),
      ],
      [
        q('Qual é a diferença entre servidor e cliente?', ['O servidor fornece serviços, o cliente consome', 'Não existe diferença', 'O cliente é sempre mais rápido', 'O servidor não tem IP'], 0, 'O servidor presta serviços (DHCP, DNS, web); o cliente pede e consome esses serviços.'),
      ],
      practice('Servidor com DHCP', 'Configura um servidor DHCP na LAN.', [
        'Liga um servidor ao switch.',
        'Ativa o serviço DHCP com pool 192.168.1.100–192.168.1.150.',
        'Define gateway e DNS do pool.',
      ], { devices: [server('SRV0', 50, 30), sw('SW0', 50, 55), pc('PC0', 30, 80), pc('PC1', 70, 80)], links: [{ a: 'SRV0', b: 'SW0' }, { a: 'PC0', b: 'SW0' }, { a: 'PC1', b: 'SW0' }] })
    ),
    equipmentLesson(
      'modem',
      'Modem',
      { summary: 'Converte o sinal do operador para a tua rede.' },
      [
        t('O que é?', 'O modem adapta o sinal da linha do operador (fibra, cabo, DSL) ao sinal que a tua rede entende.'),
        l('Para que serve?', ['Estabelecer a ligação com o operador.', 'Em muitos casos, acumular funções de router e Wi-Fi.']),
        t('Como funciona?', 'Modula e desmodula o sinal. Não é ele que decide as rotas dentro da tua LAN — isso é o router (mesmo que, em casa, estejam no mesmo aparelho).'),
        n('Diferença dos outros', 'O router encaminha entre redes; o modem traduz o sinal físico com o operador.'),
      ],
      [
        q('Função principal do modem?', ['Atribuir IPs', 'Adaptar o sinal do operador', 'Filtrar vírus', 'Ligar PCs entre si'], 1, 'O modem converte o sinal do operador para o formato usado pela rede local.'),
      ],
      practice('Entrada da Internet', 'Liga a rede local ao exterior.', [
        'Coloca um modem e um router.',
        'Liga o modem ao router (porta WAN/Internet).',
        'O router liga a LAN ao modem.',
      ], { devices: [{ name: 'MOD0', type: 'modem', x: 30, y: 35 }, router('R0', 55, 35), sw('SW0', 55, 60), pc('PC0', 40, 82), pc('PC1', 70, 82)], links: [{ a: 'MOD0', b: 'R0' }, { a: 'R0', b: 'SW0' }, { a: 'PC0', b: 'SW0' }, { a: 'PC1', b: 'SW0' }] })
    ),
    equipmentLesson(
      'access-point',
      'Access Point',
      { summary: 'Liga dispositivos sem fios à rede por cabo.' },
      [
        t('O que é?', 'Um access point (AP) cria uma rede sem fios (Wi-Fi) e liga-a à rede por cabo.'),
        l('Para que serve?', ['Dar acesso Wi-Fi a telemóveis, laptops e tablets.', 'Estender a rede sem passar cabos até cada equipamento.']),
        t('Como funciona?', 'Anuncia um SSID. Os clientes associam-se e o AP encaminha o tráfego para a rede com fios.'),
        n('No simulador', 'Define o SSID no AP e liga o cliente por cabo wireless.'),
      ],
      [
        q('O que é o SSID?', ['O nome da rede sem fios', 'O IP do AP', 'O tipo de cabo', 'A palavra-passe'], 0, 'SSID é o nome público da rede Wi-Fi que os clientes veem.'),
      ],
      practice('Rede Wi-Fi', 'Cria uma rede sem fios com SSID NETLAB.', [
        'Coloca um access point e um laptop.',
        'Define o SSID NETLAB no AP.',
        'Liga o laptop por cabo wireless.',
      ], { devices: [{ name: 'AP0', type: 'access_point', x: 50, y: 35, ssid: 'NETLAB' }, { name: 'NB0', type: 'notebook', x: 50, y: 70 }], links: [{ a: 'NB0', b: 'AP0', cable: 'wireless' }] })
    ),
    equipmentLesson(
      'firewall',
      'Firewall',
      { summary: 'Controla o que entra e sai da rede.' },
      [
        t('O que é?', 'Um firewall filtra tráfego com base em regras: endereços, portas e protocolos.'),
        l('Para que serve?', ['Bloquear acessos indesejados.', 'Permitir apenas serviços necessários.', 'Separar zonas (LAN, DMZ, Internet).']),
        t('Como funciona?', 'Examina cada pacote e aplica a lista de regras (ACL) por ordem.'),
        n('Diferença dos outros', 'O router encaminha; o firewall decide se deixa passar.'),
      ],
      [
        q('O firewall serve para…', ['Aumentar a velocidade', 'Filtrar tráfego segundo regras', 'Atribuir IPs', 'Ligar cabos'], 1, 'O firewall aplica regras de segurança ao tráfego que atravessa a rede.'),
      ],
      practice('Firewall na entrada', 'Coloca um firewall entre a LAN e o exterior.', [
        'Coloca um firewall e um router.',
        'Liga o firewall à rede local.',
        'Percebe que o tráfego passa a ser filtrado antes de sair.',
      ], { devices: [router('R0', 35, 40), { name: 'FW0', type: 'firewall', x: 65, y: 40 }, sw('SW0', 65, 65), pc('PC0', 50, 85), pc('PC1', 80, 85)], links: [{ a: 'R0', b: 'FW0' }, { a: 'FW0', b: 'SW0' }, { a: 'PC0', b: 'SW0' }, { a: 'PC1', b: 'SW0' }] })
    ),
    equipmentLesson(
      'cabo-ethernet',
      'Cabo Ethernet',
      { summary: 'O meio físico mais comum para dados.' },
      [
        t('O que é?', 'O cabo Ethernet (par entrelaçado) transporta os sinais elétricos entre equipamentos.'),
        l('Tipos comuns', ['Direto: PC ↔ switch/router.', 'Cruzado: equipamentos do mesmo tipo (PC ↔ PC).', 'Fibra: distâncias maiores (e mais caro).']),
        t('Como funciona?', 'Cada extremidade tem um conector RJ45 com 8 pinos. O comprimento máximo típico de cobre é 100 metros.'),
        n('No simulador', 'Escolhe a ferramenta Cabo e clica nas portas de origem e destino.'),
      ],
      [
        q('Qual é o comprimento máximo típico de um cabo de cobre?', ['10 m', '100 m', '1 km', 'Não tem limite'], 1, 'O cobre tradicional tem como limite típico 100 metros; acima disso usa-se fibra.'),
      ],
      practice('Ligar com cabo correto', 'Liga um PC a um switch por cabo direto.', [
        'Coloca um PC e um switch.',
        'Escolhe o cabo Ethernet direto.',
        'Clica na porta Eth0 do PC e numa porta Fa0/1 do switch.',
      ], { devices: [pc('PC0', 30, 50), sw('SW0', 70, 50)], links: [] })
    ),
    equipmentLesson(
      'placa-de-rede',
      'Placa de rede',
      { summary: 'A interface que liga o equipamento ao meio.' },
      [
        t('O que é?', 'A placa de rede (NIC) é a interface física/lógica que envia e recebe dados. Tem um endereço MAC único.'),
        l('Para que serve?', ['Converter dados do computador em sinais para o cabo ou ar.', 'Identificar o equipamento na camada 2 (MAC).']),
        t('Como funciona?', 'Recebe os pacotes do sistema operativo, acrescenta o cabeçalho Ethernet e transmite.'),
        n('No simulador', 'Cada equipamento tem interfaces (Eth0, Fa0/1, Gig0/0). Desligar uma interface corta a comunicação por essa porta.'),
      ],
      [
        q('O endereço MAC está associado a quê?', ['À placa de rede', 'Ao servidor DNS', 'Ao gateway', 'Ao SSID'], 0, 'O MAC é gravado na placa de rede e identifica-a na camada 2.'),
      ],
      practice('Interface desligada', 'Vê o efeito de uma interface desligada.', [
        'Liga dois PCs por cabo e dá IPs.',
        'Desliga a interface Eth0 de um deles.',
        'Testa o ping e lê a explicação do erro.',
      ], { devices: [pc('PC0', 30, 50, { ip: '192.168.1.10', mask: '255.255.255.0' }), pc('PC1', 70, 50, { ip: '192.168.1.11', mask: '255.255.255.0' })], links: [{ a: 'PC0', b: 'PC1' }] })
    ),
  ],
}

/* ------------------------------------------------------------------ */
/* MÓDULO 3 — Endereçamento IP do zero                                 */
/* ------------------------------------------------------------------ */

const modulo3 = {
  slug: 'modulo-3-enderecamento-ip',
  title: 'Módulo 3 — Endereçamento IP do zero',
  level: 3,
  icon: 'ip',
  description:
    'O módulo mais importante: entender IP, classes, máscaras, rede e host, gateway, DNS e DHCP — sem decorar.',
  lessons: [
    {
      slug: 'o-que-e-um-endereco-ip',
      title: 'O que é um endereço IP?',
      minutes: 7,
      summary: 'A identidade lógica de cada dispositivo numa rede IPv4.',
      content: [
        t(
          'Uma identidade lógica',
          'O endereço IP identifica um dispositivo numa rede. Ao contrário do MAC (fixo na placa), o IP é lógico: pode ser alterado quando mudas de rede.'
        ),
        c('Exemplo', '192.168.1.10\n│   │  │ └─ 10\n│   │  └─── 1\n│   └────── 168\n└────────── 192'),
        l('Quatro grupos chamados octetos', [
          'Cada octeto tem 8 bits.',
          'Cada octeto vai de 0 a 255.',
          'Os grupos são separados por pontos.',
          'No total: 4 × 8 = 32 bits.',
        ]),
        n('Erro comum', '300 não é um octeto válido: o máximo é 255. Também não pode haver octetos em falta (192.168.1 não é um IP completo).'),
      ],
      quiz: [
        q('Quantos octetos tem um endereço IPv4?', ['2', '4', '6', '8'], 1, 'O IPv4 tem quatro octetos divididos por pontos, cada um de 0 a 255.'),
        q('Qual destes é inválido?', ['192.168.1.10', '10.0.0.1', '172.16.300.5', '255.255.255.0'], 2, '300 excede o valor máximo de um octeto, que é 255.'),
      ],
      practice: practice('Primeiro endereço', 'Dá ao PC0 o endereço 192.168.1.10.', [
        'Abre a configuração do PC0.',
        'Escreve 192.168.1.10 e máscara 255.255.255.0.',
        'Confirma que o campo aceita o valor sem erro.',
      ], { devices: [pc('PC0', 50, 50)], links: [] }),
    },
    {
      slug: 'classes-de-enderecos-ip',
      title: 'Classes de endereços IP',
      minutes: 9,
      summary: 'Um modelo histórico que ainda ajuda a ler um endereço.',
      content: [
        t(
          'Um modelo histórico',
          'As classes A, B e C organizaram o IPv4 nas primeiras décadas. Hoje usa-se sobretudo CIDR (por exemplo /24), mas conhecer as classes ajuda a interpretar redes antigas e a entender porque certos intervalos são privados.'
        ),
        l('Classes tradicionais', [
          'Classe A: primeiro octeto 1–126 · máscara 255.0.0.0 (/8).',
          'Classe B: primeiro octeto 128–191 · máscara 255.255.0.0 (/16).',
          'Classe C: primeiro octeto 192–223 · máscara 255.255.255.0 (/24).',
          'Classe D: 224–239 · multicast.',
          'Classe E: 240–255 · reservada/experimental.',
        ]),
        l('Endereços privados (não saem para a Internet)', [
          'Classe A privada: 10.0.0.0 – 10.255.255.255.',
          'Classe B privada: 172.16.0.0 – 172.31.255.255.',
          'Classe C privada: 192.168.0.0 – 192.168.255.255.',
          'Loopback: 127.0.0.0 – 127.255.255.255 (o próprio computador).',
        ]),
        n('Importante', 'As classes indicam o primeiro octeto; o que define a rede é a máscara/CIDR que configuras. Duas redes /26 e /24 podem partir do mesmo 192.168.x.0.'),
      ],
      quiz: [
        q('Qual é a máscara padrão de uma rede de classe C?', ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.128'], 2, 'A classe C usa 24 bits de rede: 255.255.255.0 (/24).'),
        q('192.168.1.10 é um endereço…', ['Público', 'Privado', 'Multicast', 'Loopback'], 1, '192.168.x.x pertence ao intervalo privado de classe C.'),
        q('A que classe pertence o primeiro octeto 130?', ['A', 'B', 'C', 'D'], 1, '128–191 é classe B; 130 está nesse intervalo.'),
      ],
      practice: practice('Reconhecer classes', 'Classifica endereços mentalmente.', [
        'Tenta classificar 10.1.2.3 (classe A, privado).',
        'Depois 172.16.5.4 (classe B, privado).',
        'Depois 192.168.1.10 (classe C, privado).',
        'Configura um deles no PC0 e confirma que é aceite.',
      ], { devices: [pc('PC0', 50, 50)], links: [] }),
    },
    {
      slug: 'o-que-e-uma-mascara-de-sub-rede',
      title: 'O que é uma máscara de sub-rede?',
      minutes: 10,
      summary: 'A máscara separa a parte da rede da parte do dispositivo.',
      content: [
        t(
          'A analogia do bairro',
          'Imagina um bairro com muitas casas. O endereço IP identifica a casa; a máscara diz qual é o bairro. Sem máscara, o computador não sabe onde acaba o bairro e começa a casa.'
        ),
        c(
          'Rede e host',
          'IP:      192.168.1.10\nMáscara: 255.255.255.0\nRede:    192.168.1.0\nHost:    .10\n\nOs primeiros 3 octetos identificam a rede.\nO último identifica o dispositivo.'
        ),
        t(
          'Como se calcula (passo a passo)',
          'A máscara 255.255.255.0 em binário é 24 bits a 1 seguidos de 8 bits a 0. O endereço de rede obtém-se com a operação AND bit a bit entre o IP e a máscara: onde a máscara tem 1, fica o bit do IP; onde tem 0, fica 0.'
        ),
        c(
          'AND binário',
          'IP:      192.168.1.10 → 11000000.10101000.00000001.00001010\nMáscara: 255.255.255.0 → 11111111.11111111.11111111.00000000\nAND:     192.168.1.0  → 11000000.10101000.00000001.00000000'
        ),
        n(
          'Consequência prática',
          'Todos os equipamentos com 192.168.1.x e máscara /24 estão na mesma rede e comunicam diretamente. Um 192.168.2.x está noutra rede e precisa de um gateway.'
        ),
      ],
      quiz: [
        q('Com IP 192.168.1.25 e máscara 255.255.255.0, qual é o endereço de rede?', ['192.168.1.25', '192.168.1.0', '192.168.0.0', '192.168.1.255'], 1, 'Com /24, os três primeiros octetos são a rede e o último é o host: 192.168.1.0.'),
        q('O que faz a operação AND entre IP e máscara?', ['Soma os valores', 'Mantém os bits de rede e anula os de host', 'Inverte os bits', 'Duplica o endereço'], 1, 'O AND mantém o que a máscara marca como rede (1) e anula a parte do host (0).'),
      ],
      practice: practice('Descobrir a rede', 'Confirma a rede do teu PC.', [
        'Configura o PC0 com 192.168.1.25/255.255.255.0.',
        'Coloca o PC1 com 192.168.1.40/255.255.255.0.',
        'Confirma que ambos estão na rede 192.168.1.0 e que o ping funciona.',
      ], { devices: [pc('PC0', 30, 50, { ip: '192.168.1.25', mask: '255.255.255.0' }), pc('PC1', 70, 50, { ip: '192.168.1.40', mask: '255.255.255.0' })], links: [{ a: 'PC0', b: 'PC1' }] }),
    },
    {
      slug: 'a-mascara-e-obrigatoria',
      title: 'A máscara é obrigatória?',
      minutes: 6,
      summary: 'Sim, em IPv4. Estático ou DHCP, ela tem de existir.',
      content: [
        t(
          'Resposta curta',
          'Sim. Na configuração IPv4 é obrigatório haver uma máscara (ou prefixo) para determinar a rede local. Sem ela o sistema não sabe que endereços são vizinhos.'
        ),
        l('Duas formas de a obter', [
          'IP estático: escreves o IP e a máscara à mão.',
          'IP dinâmico (DHCP): o servidor envia IP, máscara, gateway e DNS automaticamente.',
        ]),
        l('Conceitos que não se confundem', [
          'IP estático: definido manualmente, não muda sozinho.',
          'IP dinâmico: atribuído por um servidor DHCP por um período (lease).',
          'Máscara: define que bits são rede e que bits são host.',
          'Gateway padrão: o router por onde se sai da rede local.',
        ]),
        n('Nota', 'A máscara e o gateway não são a mesma coisa: a máscara diz onde está a fronteira da rede; o gateway diz por onde atravessar essa fronteira.'),
      ],
      quiz: [
        q('É possível configurar um IP sem máscara?', ['Sim, sempre', 'Não, a máscara define a rede', 'Só com DHCP', 'Só em IPv6'], 1, 'A máscara é obrigatória para saber que endereços pertencem à mesma rede.'),
        q('Quem fornece máscara e gateway automaticamente?', ['O switch', 'O DHCP', 'O DNS', 'O cabo'], 1, 'O DHCP entrega o endereço, a máscara, o gateway e os DNS configurados no pool.'),
      ],
      practice: practice('DHCP em vez de estático', 'Vê a diferença entre os dois modos.', [
        'Abre a configuração do PC0.',
        'Observa o modo "IP estático" e o botão "Obter IP por DHCP".',
        'Experimenta obter por DHCP sem servidor: a resposta explica que não há servidor.',
      ], { devices: [pc('PC0', 50, 50)], links: [] }),
    },
    {
      slug: 'como-identificar-a-rede-de-um-ip',
      title: 'Como identificar a rede de um IP?',
      minutes: 8,
      summary: 'Exercícios progressivos com máscaras diferentes.',
      content: [
        t(
          'Método em três passos',
          '1) Escreve o IP e a máscara. 2) Traduz a máscara para prefixo (/24). 3) Mantém os bits de rede e põe a zero os bits de host.'
        ),
        c(
          'Exemplo resolvido',
          'IP: 192.168.1.25   Máscara: 255.255.255.0 (/24)\nRede: 192.168.1.0     Host: 25\n\nOutro exemplo:\nIP: 10.0.5.77       Máscara: 255.255.0.0 (/16)\nRede: 10.0.0.0      Host: 5.77'
        ),
        n(
          'Atenção ao /26',
          'Com 255.255.255.192 (/26), a rede avança de 64 em 64 (… .0, .64, .128, .192). Um IP 192.168.1.70 pertence à rede 192.168.1.64.'
        ),
      ],
      quiz: [
        q('IP 192.168.1.70 / 255.255.255.192. Qual é a rede?', ['192.168.1.0', '192.168.1.64', '192.168.1.128', '192.168.1.70'], 1, 'Com /26 os blocos são de 64; 70 cai no bloco que começa em 64.'),
        q('IP 10.0.5.77 / 255.255.0.0. Qual é a rede?', ['10.0.5.0', '10.0.0.0', '10.0.0.77', '10.0.5.77'], 1, 'Com /16, os dois primeiros octetos são rede: 10.0.0.0.'),
      ],
      practice: practice('Duas sub-redes /25', 'Divide uma /24 em duas metades.', [
        'Configura PC0 com 192.168.1.20/255.255.255.128 e PC1 com 192.168.1.150/255.255.255.128.',
        'Verifica que estão em redes diferentes (192.168.1.0 e 192.168.1.128).',
        'Tenta o ping e lê a explicação sobre o gateway.',
      ], { devices: [pc('PC0', 30, 50, { ip: '192.168.1.20', mask: '255.255.255.128' }), pc('PC1', 70, 50, { ip: '192.168.1.150', mask: '255.255.255.128' })], links: [{ a: 'PC0', b: 'PC1' }] }),
    },
    {
      slug: 'gateway-padrao',
      title: 'Gateway padrão',
      minutes: 7,
      summary: 'A porta de saída para outras redes.',
      content: [
        t(
          'O que é',
          'O gateway padrão é o endereço do router que serve a tua rede. Quando o destino não está na tua sub-rede, o computador envia o pacote ao gateway.'
        ),
        c('Dentro e fora da rede', 'PC0 192.168.1.10  →  destino 192.168.1.20  →  entrega direta\nPC0 192.168.1.10  →  destino 192.168.2.20  →  envia ao gateway 192.168.1.1'),
        l('Regras práticas', [
          'Na mesma sub-rede, o gateway não é necessário.',
          'Para sair da sub-rede, é obrigatório.',
          'O gateway tem de estar na mesma sub-rede do computador.',
        ]),
        n('Erro comum', 'Pôr como gateway um IP que não existe na rede local: o computador tenta enviar e não encontra ninguém.'),
      ],
      quiz: [
        q('Quando é preciso gateway?', ['Sempre', 'Quando o destino está noutra rede', 'Só com DHCP', 'Nunca'], 1, 'Dentro da mesma sub-rede não é necessário; para outra rede é indispensável.'),
      ],
      practice: practice('Comunicar entre redes', 'Liga duas redes com um router.', [
        'Configura o router com 192.168.1.1 e 192.168.2.1.',
        'Dá aos PCs os gateways correspondentes.',
        'Testa o ping entre redes.',
      ], { devices: [router('R0', 50, 40), sw('SW0', 25, 62), sw('SW1', 75, 62), pc('PC0', 12, 82, { ip: '192.168.1.10', mask: '255.255.255.0', gateway: '192.168.1.1' }), pc('PC1', 38, 82, { ip: '192.168.2.10', mask: '255.255.255.0', gateway: '192.168.2.1' })], links: [{ a: 'PC0', b: 'SW0' }, { a: 'SW0', b: 'R0' }, { a: 'R0', b: 'SW1' }, { a: 'PC1', b: 'SW1' }] }),
    },
    {
      slug: 'dns',
      title: 'DNS',
      minutes: 6,
      summary: 'Traduz nomes como netlab.pt em endereços IP.',
      content: [
        t(
          'O que é',
          'O DNS (Domain Name System) é o "catálogo telefónico" da Internet: recebe um nome e devolve o endereço IP correspondente.'
        ),
        c('Resolução', 'www.netlab.local  →  consulta DNS  →  192.168.1.10'),
        l('Porque precisamos dele', [
          'As pessoas lembram-se de nomes, não de números.',
          'O servidor pode mudar de IP sem mudar de nome.',
          'Sem DNS, só conseguirias abrir sites escrevendo o IP.',
        ]),
      ],
      quiz: [
        q('O DNS serve para…', ['Atribuir IPs automaticamente', 'Traduzir nomes em IPs', 'Filtrar tráfego', 'Ligar cabos'], 1, 'O DNS resolve nomes em endereços IP.'),
      ],
      practice: practice('Servidor DNS', 'Publica um nome na tua rede.', [
        'Liga um servidor ao switch e ativa o DNS.',
        'Registe www.netlab.local → 192.168.1.10.',
        'No PC, configura esse servidor como DNS.',
      ], { devices: [server('SRV0', 50, 30, { ip: '192.168.1.10', mask: '255.255.255.0' }), sw('SW0', 50, 52), pc('PC0', 30, 78, { ip: '192.168.1.20', mask: '255.255.255.0', gateway: '192.168.1.1' })], links: [{ a: 'SRV0', b: 'SW0' }, { a: 'PC0', b: 'SW0' }] }),
    },
    {
      slug: 'dhcp',
      title: 'DHCP',
      minutes: 8,
      summary: 'Endereços automáticos com o processo DORA.',
      content: [
        t(
          'O que é',
          'O DHCP entrega automaticamente IP, máscara, gateway e DNS. Evita erros e trabalho manual em redes grandes.'
        ),
        s('Processo DORA', [
          'Discover: o cliente grita na rede "há algum servidor DHCP?".',
          'Offer: um servidor responde oferecendo um endereço.',
          'Request: o cliente pede formalmente esse endereço.',
          'Acknowledge: o servidor confirma e envia máscara, gateway e DNS.',
        ]),
        n(
          'Sem servidor não há magia',
          'Se não existir um servidor DHCP acessível e ativo, o computador não recebe endereço. E um switch, por si só, nunca atribui IPs.'
        ),
      ],
      quiz: [
        q('Qual é a ordem correta do DHCP?', ['Discover, Offer, Request, Acknowledge', 'Offer, Discover, Acknowledge, Request', 'Request, Offer, Discover, Acknowledge', 'Discover, Request, Offer, Acknowledge'], 0, 'DORA: Discover → Offer → Request → Acknowledge.'),
        q('Um switch atribui IPs automaticamente?', ['Sim', 'Não', 'Só com VLANs', 'Só se for gigabit'], 1, 'Só um servidor DHCP atribui endereços.'),
      ],
      practice: practice('DORA no simulador', 'Atribui um IP por DHCP.', [
        'Ativa o DHCP num servidor com pool 192.168.1.100–150.',
        'No PC, clica "Obter IP por DHCP".',
        'Observa os quatro passos DORA no registo.',
      ], { devices: [server('SRV0', 50, 30), sw('SW0', 50, 52), pc('PC0', 30, 78), pc('PC1', 70, 78)], links: [{ a: 'SRV0', b: 'SW0' }, { a: 'PC0', b: 'SW0' }, { a: 'PC1', b: 'SW0' }] }),
    },
  ],
}

/* ------------------------------------------------------------------ */
/* MÓDULO 4 — Modelo OSI                                               */
/* ------------------------------------------------------------------ */

const layer = (number, name, slug, summary, blocks, quizItems) => ({
  slug,
  title: `Camada ${number} — ${name}`,
  minutes: 6,
  summary,
  content: blocks,
  quiz: quizItems,
})

const modulo4 = {
  slug: 'modulo-4-modelo-osi',
  title: 'Módulo 4 — Modelo OSI',
  level: 4,
  icon: 'layers',
  description:
    'As sete camadas explicadas uma a uma, com o percurso de um pacote do topo até ao cabo e de volta.',
  lessons: [
    {
      slug: 'visao-geral-osi',
      title: 'O que é o modelo OSI?',
      minutes: 7,
      summary: 'Sete camadas que organizam a comunicação.',
      content: [
        t(
          'Uma divisão do trabalho',
          'O modelo OSI divide a comunicação em sete camadas. Cada camada tem uma responsabilidade e usa os serviços da camada de baixo. É como enviar uma encomenda: escreves a carta, metes no envelope, entregas ao carteiro.'
        ),
        c(
          'Do topo para a base',
          '7 Aplicação\n6 Apresentação\n5 Sessão\n4 Transporte\n3 Rede\n2 Ligação de dados\n1 Física'
        ),
        l('Mnemónica para memorizar', [
          '7 Aplicação — o que o utilizador usa.',
          '6 Apresentação — como os dados aparecem.',
          '5 Sessão — manter a conversa.',
          '4 Transporte — entregar segmentos completos.',
          '3 Rede — endereços IP e rotas.',
          '2 Ligação de dados — quadros e MACs.',
          '1 Física — bits e cabos.',
        ]),
        n('No simulador', 'O jogo DESAFIO OSI ajuda a fixar a ordem: monta a torre da camada 1 até à 7.'),
      ],
      quiz: [
        q('Quantas camadas tem o modelo OSI?', ['4', '5', '7', '8'], 2, 'O modelo OSI tem sete camadas, da física (1) à aplicação (7).'),
        q('Qual camada está mais perto do utilizador?', ['Física', 'Rede', 'Aplicação', 'Transporte'], 2, 'A camada 7 (Aplicação) é a que os programas usam diretamente.'),
      ],
    },
    layer(7, 'Aplicação', 'osi-aplicacao', 'Onde os programas falam a rede.', [
      t('Definição', 'A camada de aplicação fornece os serviços que o utilizador usa: páginas web, correio, transferência de ficheiros.'),
      l('Exemplos e protocolos', ['HTTP/HTTPS (web)', 'DNS (nomes)', 'SMTP/IMAP (correio)', 'FTP (ficheiros)', 'DHCP (endereços)']),
      n('Equipamentos', 'Não há equipamentos "de camada 7" na topologia; há software: navegador, cliente de correio, servidor web.'),
    ], [q('Onde atua o HTTP?', ['Física', 'Rede', 'Aplicação', 'Ligação de dados'], 2, 'O HTTP é um protocolo de aplicação (camada 7).')]),
    layer(6, 'Apresentação', 'osi-apresentacao', 'Formato, cifra e compressão.', [
      t('Definição', 'Garante que os dados são compreendidos pelos dois lados: codificação de caracteres, compressão e cifra.'),
      l('Exemplos', ['UTF-8', 'JPEG, PNG, MP4', 'TLS (cifra)']),
      n('No dia a dia', 'Quando vês uma imagem chegar sem estar "partida", a apresentação fez o seu trabalho.'),
    ], [q('Que camada trata da cifra e do formato dos dados?', ['Sessão', 'Apresentação', 'Transporte', 'Física'], 1, 'A camada 6 trata da representação: codificação, compressão e cifra.')]),
    layer(5, 'Sessão', 'osi-sessao', 'Abre, mantém e fecha a conversa.', [
      t('Definição', 'Estabelece, gere e termina sessões entre aplicações, mantendo o contexto da conversa.'),
      l('Exemplos', ['Sessões de login', 'Chamadas de videoconferência', 'Ligações RPC']),
      n('No simulador', 'As sessões de utilização da plataforma são um exemplo prático de gestão de sessão.'),
    ], [q('Que camada mantém a conversa aberta entre dois programas?', ['Sessão', 'Rede', 'Física', 'Aplicação'], 0, 'A camada 5 gere a sessão: início, manutenção e fim da comunicação.')]),
    layer(4, 'Transporte', 'osi-transporte', 'Entrega segmentos completos e ordenados.', [
      t('Definição', 'Divide os dados em segmentos, garante a entrega e controla o fluxo.'),
      l('Protocolos e exemplos', ['TCP: ligação fiável, confirmação (web, correio).', 'UDP: rápido, sem confirmação (DNS, vídeo).', 'Portas: 80 (HTTP), 443 (HTTPS), 53 (DNS).']),
      n('No simulador', 'O ping usa ICMP, que viaja encapsulado e é tratado próximo desta camada.'),
    ], [q('Qual protocolo de transporte é fiável e confirma a entrega?', ['UDP', 'TCP', 'ICMP', 'ARP'], 1, 'O TCP confirma e ordena os segmentos; o UDP não garante entrega.')]),
    layer(3, 'Rede', 'osi-rede', 'Endereços IP e rotas.', [
      t('Definição', 'Endereça pacotes com IP e decide o caminho entre redes — é a camada dos routers.'),
      l('Exemplos', ['IP', 'ICMP (ping)', 'Routers, gateways e rotas.']),
      n('Aqui falham muitos problemas', 'IP errado, máscara inválida ou gateway em falta são falhas de camada 3.'),
    ], [q('Em que camada trabalha um router?', ['2', '3', '4', '7'], 1, 'O router decide com base no endereço IP: camada 3 (Rede).')]),
    layer(2, 'Ligação de dados', 'osi-ligacao-dados', 'Quadros e endereços MAC.', [
      t('Definição', 'Organiza os bits em quadros, usa endereços MAC e deteta erros no segmento local.'),
      l('Exemplos', ['Ethernet', 'ARP', 'Switches e bridges.']),
      n('No simulador', 'O switch decide com base no MAC: camada 2. Um cabo mal ligado é um problema de camadas 1–2.'),
    ], [q('Que endereço usa um switch para encaminhar?', ['IP', 'MAC', 'Porta TCP', 'URL'], 1, 'O switch usa endereços MAC (camada 2).')]),
    layer(1, 'Física', 'osi-fisica', 'Bits, cabos, conectores e sinais.', [
      t('Definição', 'Transmite os bits pelo meio: cobre, fibra ou ar. Define voltagens, conectores e velocidades.'),
      l('Exemplos', ['Cabo Ethernet e RJ45', 'Fibra ótica', 'Wi-Fi (rádio)']),
      n('Problemas típicos', 'Cabo partido, porta desligada, conector mal crimpado.'),
    ], [q('Um cabo desligado é um problema de que camada?', ['1', '3', '5', '7'], 0, 'O meio físico é a camada 1. Sem ela, nada passa.')]),
  ],
}

/* ------------------------------------------------------------------ */
/* MÓDULO 5 — Construção de redes práticas                             */
/* ------------------------------------------------------------------ */

const modulo5 = {
  slug: 'modulo-5-construcao-pratica',
  title: 'Módulo 5 — Construção de redes práticas',
  level: 5,
  icon: 'tools',
  description: 'Agora sim: construir, configurar e testar redes reais no simulador, passo a passo.',
  lessons: [
    {
      slug: 'ligar-dois-computadores',
      title: 'Ligar dois computadores',
      minutes: 7,
      summary: 'Da ligação física ao primeiro ping com sucesso.',
      content: [
        s('Passo a passo', [
          'Coloca dois computadores no mapa.',
          'Liga as portas Eth0 com cabo Ethernet direto.',
          'No PC0, define 192.168.1.10 / 255.255.255.0.',
          'No PC1, define 192.168.1.11 / 255.255.255.0.',
          'Executa ping de PC0 para PC1.',
        ]),
        n('Porque funciona', 'Os dois estão na mesma sub-rede (192.168.1.0/24) e ligados fisicamente. O gateway não é necessário.'),
      ],
      quiz: [
        q('Dois PCs na mesma sub-rede precisam de gateway?', ['Sim', 'Não', 'Só se tiverem switch', 'Só com DHCP'], 1, 'Na mesma sub-rede a entrega é direta; o gateway só é necessário para sair da rede.'),
      ],
      practice: practice('Primeiro ping', 'Faz o teu primeiro ping com sucesso.', [
        'Usa o cenário com dois PCs ligados.',
        'Configura 192.168.1.10 e 192.168.1.11 com máscara /24.',
        'Executa o ping e confirma a resposta.',
      ], { devices: [pc('PC0', 30, 50, { ip: '192.168.1.10', mask: '255.255.255.0' }), pc('PC1', 70, 50, { ip: '192.168.1.11', mask: '255.255.255.0' })], links: [{ a: 'PC0', b: 'PC1' }] }),
    },
    {
      slug: 'criar-uma-lan',
      title: 'Criar uma LAN',
      minutes: 7,
      summary: 'Vários computadores num switch, todos na mesma rede.',
      content: [
        s('Passo a passo', [
          'Coloca um switch e três computadores.',
          'Liga cada PC a uma porta do switch.',
          'Atribui IPs .10, .11 e .12 com máscara /24.',
          'Testa ping entre todos.',
        ]),
        l('O que o switch faz por ti', ['Encaminha os quadros só para a porta certa.', 'Permite acrescentar equipamentos sem parar a rede.']),
        n('O que o switch não faz', 'Não atribui IPs e não liga a outras redes.'),
      ],
      quiz: [
        q('Três PCs ligados a um switch e na mesma /24 comunicam?', ['Não', 'Sim, sem gateway', 'Só com router', 'Só com DHCP'], 1, 'O switch serve o mesmo domínio de difusão; com IPs da mesma rede, comunicam diretamente.'),
      ],
      practice: practice('LAN completa', 'Monta uma LAN de três PCs.', [
        'Coloca o switch e liga os três PCs.',
        'Configura IPs .10, .11 e .12 com /24.',
        'Testa os ping possíveis.',
      ], { devices: [sw('SW0', 50, 35), pc('PC0', 25, 65, { ip: '192.168.1.10', mask: '255.255.255.0' }), pc('PC1', 50, 65, { ip: '192.168.1.11', mask: '255.255.255.0' }), pc('PC2', 75, 65, { ip: '192.168.1.12', mask: '255.255.255.0' })], links: [{ a: 'PC0', b: 'SW0' }, { a: 'PC1', b: 'SW0' }, { a: 'PC2', b: 'SW0' }] }),
    },
    {
      slug: 'configurar-switch-router-ip',
      title: 'Configurar switch, router e endereços IP',
      minutes: 9,
      summary: 'Juntar as peças: cabos, IPs, gateways e testes.',
      content: [
        s('Sequência correta', [
          'Cabos: liga primeiro, porque sem físico nada funciona.',
          'Switch: só liga equipamentos; não precisa de IP para funcionar como switch.',
          'Router: dá IP a cada interface, uma por rede.',
          'PCs: IP, máscara e gateway (o IP do router na sua rede).',
          'Teste: ping local e depois ping entre redes.',
        ]),
        c('Exemplo de endereçamento', 'Rede A: 192.168.10.0/24  gateway 192.168.10.1\nRede B: 192.168.20.0/24  gateway 192.168.20.1\nLigação entre routers: 10.0.0.0/30'),
        n('Boa prática', 'Documenta os endereços numa tabela antes de configurar; evita duplicações.'),
      ],
      quiz: [
        q('O gateway de um PC deve ser…', ['Um IP qualquer', 'O IP do router na mesma rede do PC', 'O IP do switch', 'O IP do DNS'], 1, 'O gateway tem de estar na mesma sub-rede do PC, senão é inalcançável.'),
      ],
      practice: practice('Duas redes com router', 'Liga duas redes através de um router.', [
        'Configura R0: Gig0/0 192.168.10.1/24 e Gig0/1 192.168.20.1/24.',
        'Dá aos PCs os gateways .10.1 e .20.1.',
        'Testa o ping entre as duas redes.',
      ], { devices: [router('R0', 50, 40), sw('SW0', 25, 62), sw('SW1', 75, 62), pc('PC0', 12, 82, { ip: '192.168.10.10', mask: '255.255.255.0', gateway: '192.168.10.1' }), pc('PC1', 38, 82, { ip: '192.168.10.11', mask: '255.255.255.0', gateway: '192.168.10.1' }), pc('PC2', 68, 82, { ip: '192.168.20.10', mask: '255.255.255.0', gateway: '192.168.20.1' })], links: [{ a: 'PC0', b: 'SW0' }, { a: 'PC1', b: 'SW0' }, { a: 'SW0', b: 'R0' }, { a: 'R0', b: 'SW1' }, { a: 'PC2', b: 'SW1' }] }),
    },
    {
      slug: 'configurar-dhcp-e-dns',
      title: 'Configurar DHCP e DNS',
      minutes: 8,
      summary: 'Automatizar endereços e nomes.',
      content: [
        s('DHCP', [
          'Ativa o serviço DHCP num servidor ligado ao mesmo switch.',
          'Define rede, máscara, primeiro e último endereço do pool.',
          'Define gateway e DNS do pool.',
          'No cliente, escolhe "Obter IP por DHCP".',
        ]),
        s('DNS', ['Ativa o serviço DNS no servidor.', 'Registe nomes → IPs.', 'No cliente, indica o servidor DNS.', 'Testa com nslookup.']),
        n('Se falta servidor', 'O simulador recusa atribuir endereços e explica porquê. Não inventa IPs.'),
      ],
      quiz: [
        q('Sem servidor DHCP acessível, o cliente recebe IP?', ['Sim, sempre', 'Não', 'Sim, se tiver switch', 'Sim, se tiver router'], 1, 'Sem servidor DHCP não há atribuição automática.'),
      ],
      practice: practice('DHCP + DNS', 'Automatiza a rede.', [
        'Ativa DHCP com pool 192.168.1.100–150.',
        'Ativa DNS com www.netlab.local.',
        'Pede IP no PC e resolve o nome no terminal.',
      ], { devices: [server('SRV0', 50, 30, { ip: '192.168.1.10', mask: '255.255.255.0' }), sw('SW0', 50, 52), pc('PC0', 30, 78), pc('PC1', 70, 78)], links: [{ a: 'SRV0', b: 'SW0' }, { a: 'PC0', b: 'SW0' }, { a: 'PC1', b: 'SW0' }] }),
    },
    {
      slug: 'duas-redes-e-comunicacao-entre-redes',
      title: 'Criar duas redes e comunicar entre elas',
      minutes: 9,
      summary: 'Rotas estáticas: o exame final do módulo.',
      content: [
        t(
          'O cenário',
          'Duas redes separadas, cada uma com o seu router. Cada router conhece a rede local; para alcançar a rede remota precisa de uma rota estática.'
        ),
        c('Rotas', 'R0: ip route 192.168.20.0 255.255.255.0 10.0.0.2\nR1: ip route 192.168.10.0 255.255.255.0 10.0.0.1'),
        l('Checklist', [
          'Interfaces com IP e ativas.',
          'PCs com gateway correto.',
          'Rotas estáticas nos dois sentidos.',
          'Teste com ping e depois tracert.',
        ]),
      ],
      quiz: [
        q('Para que serve uma rota estática?', ['Atribuir IP', 'Ensinar um caminho para uma rede remota', 'Ligar cabos', 'Filtrar vírus'], 1, 'A rota estática diz ao router por onde alcançar uma rede que não está ligada diretamente.'),
      ],
      practice: practice('Roteamento entre redes', 'Faz o ping atravessar dois routers.', [
        'Configura interfaces e rotas nos dois routers.',
        'Define os gateways nos PCs.',
        'Testa ping e tracert entre as redes.',
      ], { devices: [router('R0', 35, 45), router('R1', 65, 45), sw('SW0', 18, 62), sw('SW1', 82, 62), pc('PC0', 8, 82, { ip: '192.168.10.10', mask: '255.255.255.0', gateway: '192.168.10.1' }), pc('PC1', 30, 82, { ip: '192.168.20.10', mask: '255.255.255.0', gateway: '192.168.20.1' })], links: [{ a: 'PC0', b: 'SW0' }, { a: 'SW0', b: 'R0' }, { a: 'R0', b: 'R1' }, { a: 'R1', b: 'SW1' }, { a: 'PC1', b: 'SW1' }] }),
    },
  ],
}

export const COURSES = [modulo1, modulo2, modulo3, modulo4, modulo5]

/* ------------------------------------------------------------------ */
/* Avaliações por módulo                                               */
/* ------------------------------------------------------------------ */

export const MODULE_ASSESSMENTS = [
  {
    slug: 'avaliacao-modulo-1',
    course: 'modulo-1-introducao-a-redes',
    title: 'Avaliação — Introdução às redes',
    questions: [
      {
        question: 'O que é uma LAN?',
        options: ['Uma rede local de curta distância', 'A Internet mundial', 'Uma rede entre países', 'Um tipo de cabo'],
        answer: 0,
        explanation: 'LAN é uma rede local, limitada a um espaço pequeno como uma casa ou uma escola.',
      },
      {
        question: 'A Internet é…',
        options: ['Uma LAN', 'Uma WAN que liga muitas redes', 'Um único servidor', 'Um switch'],
        answer: 1,
        explanation: 'A Internet liga redes de todo o mundo: é a maior WAN.',
      },
      {
        question: 'Na topologia em estrela, o que acontece se um cabo falhar?',
        options: ['Toda a rede para', 'Só o equipamento desse cabo fica isolado', 'Nada funciona', 'A rede fica mais rápida'],
        answer: 1,
        explanation: 'Cada equipamento tem o seu cabo até ao centro; a falha fica isolada nesse ramo.',
      },
      {
        question: 'Qual é a diferença entre Internet e Intranet?',
        options: ['A tecnologia usada', 'O acesso: a intranet é privada', 'A velocidade', 'O tipo de cabo'],
        answer: 1,
        explanation: 'A intranet usa a mesma tecnologia, mas o acesso é restrito à organização.',
      },
    ],
  },
  {
    slug: 'avaliacao-modulo-2',
    course: 'modulo-2-equipamentos',
    title: 'Avaliação — Equipamentos de rede',
    questions: [
      {
        question: 'Que equipamento liga redes diferentes?',
        options: ['Switch', 'Hub', 'Router', 'Repetidor'],
        answer: 2,
        explanation: 'O router decide com base no IP e liga redes diferentes.',
      },
      {
        question: 'Um switch atribui endereços IP?',
        options: ['Sim, sempre', 'Não, isso é função do DHCP', 'Só com VLANs', 'Só em redes /24'],
        answer: 1,
        explanation: 'O switch trabalha com MACs; a atribuição automática de IP é do servidor DHCP.',
      },
      {
        question: 'Qual é a função do firewall?',
        options: ['Aumentar a velocidade', 'Filtrar tráfego segundo regras', 'Atribuir IPs', 'Ligar cabos'],
        answer: 1,
        explanation: 'O firewall aplica regras de segurança ao tráfego.',
      },
      {
        question: 'O access point serve para…',
        options: ['Ligar por cabo', 'Dar acesso sem fios à rede', 'Filtrar pacotes', 'Atribuir IPs'],
        answer: 1,
        explanation: 'O AP cria a rede Wi-Fi e liga-a à rede com fios.',
      },
    ],
  },
  {
    slug: 'avaliacao-modulo-3',
    course: 'modulo-3-enderecamento-ip',
    title: 'Avaliação — Endereçamento IP',
    questions: [
      {
        question: 'Quantos octetos tem um IPv4 e qual o valor máximo de cada um?',
        options: ['4 octetos, máximo 255', '4 octetos, máximo 300', '8 octetos, máximo 255', '2 octetos, máximo 999'],
        answer: 0,
        explanation: 'O IPv4 tem 4 octetos de 8 bits, cada um entre 0 e 255.',
      },
      {
        question: 'Com IP 192.168.1.10 e máscara 255.255.255.0, qual é o endereço de rede?',
        options: ['192.168.1.10', '192.168.1.0', '192.168.0.0', '192.168.1.255'],
        answer: 1,
        explanation: 'Os três primeiros octetos identificam a rede (192.168.1) e o último o dispositivo; a rede é 192.168.1.0.',
      },
      {
        question: 'Qual destas máscaras é inválida?',
        options: ['255.255.255.0', '255.255.255.128', '255.0.255.0', '255.255.255.252'],
        answer: 2,
        explanation: '255.0.255.0 não tem bits contíguos: há zeros no meio dos uns.',
      },
      {
        question: 'Qual é a máscara padrão da classe B?',
        options: ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.128'],
        answer: 1,
        explanation: 'Classe B usa 16 bits de rede: 255.255.0.0 (/16).',
      },
      {
        question: 'O processo DHCP é conhecido por…',
        options: ['DORA', 'TCP', 'OSI', 'ARP'],
        answer: 0,
        explanation: 'DORA: Discover, Offer, Request, Acknowledge.',
      },
    ],
  },
  {
    slug: 'avaliacao-modulo-4',
    course: 'modulo-4-modelo-osi',
    title: 'Avaliação — Modelo OSI',
    questions: [
      {
        question: 'Qual é a ordem correta, da base para o topo?',
        options: ['Física, Ligação de dados, Rede, Transporte, Sessão, Apresentação, Aplicação', 'Aplicação, Física, Rede, Sessão, Transporte, Apresentação, Ligação de dados', 'Rede, Física, Transporte, Sessão, Aplicação, Apresentação, Ligação de dados', 'Física, Rede, Transporte, Aplicação, Sessão, Apresentação, Ligação de dados'],
        answer: 0,
        explanation: 'Da camada 1 à 7: Física, Ligação de dados, Rede, Transporte, Sessão, Apresentação, Aplicação.',
      },
      {
        question: 'Em que camada trabalha um switch?',
        options: ['1', '2', '3', '7'],
        answer: 1,
        explanation: 'O switch usa endereços MAC: camada 2 (Ligação de dados).',
      },
      {
        question: 'Qual protocolo de transporte é fiável?',
        options: ['UDP', 'TCP', 'IP', 'Ethernet'],
        answer: 1,
        explanation: 'O TCP confirma e ordena a entrega dos segmentos.',
      },
      {
        question: 'Um IP mal configurado é um problema de que camada?',
        options: ['1', '2', '3', '7'],
        answer: 2,
        explanation: 'O endereçamento IP pertence à camada 3 (Rede).',
      },
    ],
  },
  {
    slug: 'avaliacao-modulo-5',
    course: 'modulo-5-construcao-pratica',
    title: 'Avaliação — Construção de redes',
    questions: [
      {
        question: 'Dois PCs na mesma sub-rede precisam de gateway para comunicar?',
        options: ['Sim', 'Não', 'Só com switch', 'Só com DHCP'],
        answer: 1,
        explanation: 'Na mesma sub-rede a entrega é direta; o gateway só serve para sair da rede.',
      },
      {
        question: 'Sem servidor DHCP, o cliente obtém IP automaticamente?',
        options: ['Sim', 'Não', 'Sim, pelo switch', 'Sim, pelo router'],
        answer: 1,
        explanation: 'Sem DHCP acessível não há atribuição automática de endereço.',
      },
      {
        question: 'Para alcançar uma rede remota, um router precisa de…',
        options: ['Um switch', 'Uma rota (estática ou dinâmica)', 'Um DNS', 'Mais cabos'],
        answer: 1,
        explanation: 'Sem rota para a rede remota, o router não sabe por onde encaminhar.',
      },
      {
        question: 'O gateway de um PC deve pertencer…',
        options: ['A qualquer rede', 'À mesma sub-rede do PC', 'Ao DNS', 'Ao servidor web'],
        answer: 1,
        explanation: 'O gateway tem de ser alcançável diretamente, ou seja, estar na mesma sub-rede do PC.',
      },
    ],
  },
]
